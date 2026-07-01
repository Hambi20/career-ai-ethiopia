import { NextRequest, NextResponse } from 'next/server';
import { db, ensureBotReportTable } from '@/lib/db';

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

async function sendTelegramMessage(chatId: number, text: string, options?: {
  parseMode?: string;
  replyMarkup?: any;
  replyToMessageId?: number;
}): Promise<boolean> {
  try {
    const token = getBotToken();
    const chunks: string[] = [];
    const maxLen = 4096;
    if (text.length <= maxLen) {
      chunks.push(text);
    } else {
      // Split on double newlines or single newlines
      const lines = text.split('\n');
      let current = '';
      for (const line of lines) {
        if ((current + '\n' + line).length > maxLen && current.length > 0) {
          chunks.push(current);
          current = line;
        } else {
          current = current ? current + '\n' + line : line;
        }
      }
      if (current) chunks.push(current);
    }
    for (const chunk of chunks) {
      const body: any = {
        chat_id: chatId,
        text: chunk,
        parse_mode: options?.parseMode || 'HTML',
      };
      if (options?.replyMarkup) body.reply_markup = options.replyMarkup;
      if (options?.replyToMessageId) body.reply_to_message_id = options.replyToMessageId;
      const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) console.error('sendMessage failed:', await res.text());
    }
    return true;
  } catch (err) {
    console.error('Send message error:', err);
    return false;
  }
}

async function sendChatAction(chatId: number, action: string = 'typing'): Promise<void> {
  try {
    const token = getBotToken();
    await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch { /* silent */ }
}

function extractArgs(text: string, cmd: string): string {
  const idx = text.toLowerCase().indexOf(cmd);
  if (idx === -1) return text.trim();
  return text.slice(idx + cmd.length).trim();
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function nowStr(): string {
  return new Date().toISOString();
}

function uid(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// GROQ AI HELPER
// ============================================================

async function askGroq(prompt: string, systemPrompt?: string): Promise<string> {
  if (!GROQ_API_KEY) return 'AI not configured (GROQ_API_KEY missing).';
  try {
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: 2048 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'AI returned no response.';
  } catch (err: any) {
    console.error('Groq error:', err?.message);
    return `AI error: ${err?.message || 'Unknown'}`;
  }
}

// ============================================================
// SAVE REPORT TO DASHBOARD
// ============================================================

async function ensureBotReportTable(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BotReport" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL DEFAULT 'general',
        "company" TEXT NOT NULL DEFAULT '',
        "category" TEXT NOT NULL DEFAULT 'general',
        "title" TEXT NOT NULL DEFAULT '',
        "content" TEXT NOT NULL DEFAULT '',
        "summary" TEXT NOT NULL DEFAULT '',
        "chatId" INTEGER NOT NULL DEFAULT 0,
        "firstName" TEXT NOT NULL DEFAULT '',
        "date" TEXT NOT NULL DEFAULT '',
        "timestamp" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.error('[ensureBotReportTable]', err?.message);
  }
}

// In-memory fallback store
const fallbackReports: any[] = [];

async function saveReportToWeb(
  type: string,
  company: string,
  title: string,
  content: string,
  chatId?: number,
  firstName?: string,
): Promise<boolean> {
  const reportId = uid('rpt');
  const now = nowStr();
  const date = todayStr();
  const esc = (s: string) => (s || '').replace(/'/g, "''").replace(/\n/g, ' ');
  const reportData = { id: reportId, type, company, category: type, title, content, summary: '', chatId: chatId || 0, firstName: firstName || '', date, timestamp: now, createdAt: now };

  // PRIMARY: Use the db Proxy from @/lib/db
  try {
    await ensureBotReportTable();
    await db.$executeRawUnsafe(
      `INSERT INTO "BotReport" ("id","type","company","category","title","content","summary","chatId","firstName","date","timestamp","createdAt") VALUES ('${esc(reportId)}','${esc(type)}','${esc(company)}','${esc(type)}','${esc(title)}','${esc(content)}','',${chatId || 0},'${esc(firstName || '')}','${date}','${now}',CURRENT_TIMESTAMP)`
    );
    console.log(`[saveReportToWeb] SUCCESS: id=${reportId}, type=${type}`);
    return true;
  } catch (err: any) {
    console.error(`[saveReportToWeb] DB FAILED: ${err?.message}`);
  }

  // FALLBACK: HTTP POST to production API
  try {
    const res = await fetch(`${APP_URL}/api/bot/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    if (res.ok) {
      console.log(`[saveReportToWeb] HTTP fallback SUCCESS: id=${reportId}`);
      return true;
    }
  } catch (e) { /* silent */ }

  // LAST RESORT: In-memory
  fallbackReports.unshift(reportData);
  if (fallbackReports.length > 200) fallbackReports.length = 200;
  console.log(`[saveReportToWeb] In-memory fallback: id=${reportId}`);
  return false;
}

// ============================================================
// IN-MEMORY STORES
// ============================================================

interface Reminder {
  id: string;
  chatId: number;
  text: string;
  due: string;
  createdAt: string;
}
const reminders: Reminder[] = [];

interface Note {
  id: string;
  chatId: number;
  text: string;
  createdAt: string;
}
const notes: Note[] = [];

interface Task {
  id: string;
  chatId: number;
  text: string;
  done: boolean;
  createdAt: string;
}
const tasks: Task[] = [];

interface KnowledgeEntry {
  id: string;
  chatId: number;
  topic: string;
  content: string;
  createdAt: string;
}
const knowledgeStore: KnowledgeEntry[] = [];

const savedDataStore: any[] = [];

// ============================================================
// DAILY COMMANDS
// ============================================================

async function handleBriefing(chatId: number, _firstName: string) {
  await sendChatAction(chatId, 'typing');
  const briefing = await askGroq(
    `Generate a concise daily executive briefing for today. Include:
1. Key priorities for the day
2. Market/industry highlights (general)
3. Action items
Keep it under 500 words. Professional tone.`,
    'You are an executive assistant creating a daily briefing for a business executive in Ethiopia. Be concise, actionable, and professional.'
  );
  const saved = await saveReportToWeb('briefing', 'Hambisa', `Daily Briefing - ${todayStr()}`, briefing, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📊 Daily Executive Briefing</b>\n${todayStr()}\n\n${briefing}\n\n<i>${tag}</i>`);
}

async function handleVerse(chatId: number) {
  await sendChatAction(chatId, 'typing');
  const verse = await askGroq(
    'Share a random inspiring Bible verse. Include the reference. Add a brief 1-2 sentence reflection on how it applies to daily life.',
    'You are a spiritual companion. Share one Bible verse with its reference and a brief reflection.'
  );
  await sendTelegramMessage(chatId, `<b>📜 Daily Verse</b>\n\n${verse}`);
}

async function handleLog(chatId: number, _args: string) {
  const userNotes = notes.filter(n => n.chatId === chatId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  if (userNotes.length === 0) {
    await sendTelegramMessage(chatId, '📋 No log entries yet. Use /note <text> to add one.');
    return;
  }
  const list = userNotes.map((n, i) => `${i + 1}. ${n.text} <i>(${n.createdAt.split('T')[0]})</i>`).join('\n');
  await sendTelegramMessage(chatId, `<b>📋 Activity Log</b>\n\n${list}`);
}

async function handleKpi(chatId: number, _args: string) {
  const totalReports = fallbackReports.length;
  const todayReports = fallbackReports.filter(r => r.date === todayStr()).length;
  const types = [...new Set(fallbackReports.map((r: any) => r.type))];
  await sendTelegramMessage(chatId, `<b>📈 KPI Summary</b>\n${todayStr()}\n\n<b>Reports Today:</b> ${todayReports}\n<b>Total Reports:</b> ${totalReports}\n<b>Report Types:</b> ${types.join(', ') || 'None'}\n<b>Reminders:</b> ${reminders.filter(r => r.chatId === chatId).length}\n<b>Notes:</b> ${notes.filter(n => n.chatId === chatId).length}\n<b>Tasks:</b> ${tasks.filter(t => t.chatId === chatId).length}`);
}

async function handleWeather(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const city = args || 'Addis Ababa';
  const weather = await askGroq(
    `What is the typical weather in ${city}, Ethiopia today? Include temperature, conditions, and any advice. Be brief.`,
    'You are a weather assistant for Ethiopia. Give typical/expected weather conditions. Keep it to 3-4 lines.'
  );
  await sendTelegramMessage(chatId, `<b>🌤 Weather — ${city}</b>\n\n${weather}`);
}

async function handleNews(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const topic = args || 'Ethiopia business and technology';
  const news = await askGroq(
    `Summarize 3-5 recent notable news items about: ${topic}. Be factual and concise. Format as a numbered list.`,
    'You are a news summarizer. Provide 3-5 brief, factual news summaries. If you cannot confirm real recent news, provide general context about the topic.'
  );
  await sendTelegramMessage(chatId, `<b>📰 News Digest</b>\n\n${news}`);
}

// ============================================================
// ROMEL COMMANDS
// ============================================================

async function handleRomel(chatId: number, args: string, firstName: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>Romel Report</b>\n\nPaste your sales report after the command:\n<code>/romel [paste report text]</code>\n\nI will parse the date, sales data, and save it to the dashboard.');
    return;
  }
  await sendChatAction(chatId, 'typing');

  // Extract date from text
  const dateMatch = args.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})/i);
  const reportDate = dateMatch ? dateMatch[0] : todayStr();

  // Parse sales figures
  const amountMatches = args.match(/[\$]?[\d,]+\.?\d*/g) || [];
  const amounts = amountMatches.map(a => parseFloat(a.replace(/[$,]/g, ''))).filter(n => n > 10 && n < 10000000);

  const totalSales = amounts.reduce((s, a) => s + a, 0);
  const summary = `Date: ${reportDate}\nTotal Sales Found: ${amounts.length} figures\nSum: ${totalSales.toLocaleString()}`;

  const saved = await saveReportToWeb('romel', 'Romel', `Sales Report - ${reportDate}`, args, chatId, firstName);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';

  await sendTelegramMessage(chatId, `<b>🏪 Romel Report Saved</b>\n\n${summary}\n\n<b>Data points found:</b> ${amounts.length}\n<b>Extracted amounts:</b> ${amounts.slice(0, 10).join(', ')}${amounts.length > 10 ? '...' : ''}\n\n<i>${tag}</i>`);
}

async function handleTarget(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>🎯 Set Target</b>\n\nUsage: <code>/target [description]</code>\n\nExample:\n<code>/target Sell 50 units by Friday</code>');
    return;
  }
  const saved = await saveReportToWeb('target', 'Romel', `Target - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>🎯 Target Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

async function handleRomelReports(chatId: number) {
  const romelReports = fallbackReports.filter(r => r.type === 'romel').slice(0, 5);
  if (romelReports.length === 0) {
    await sendTelegramMessage(chatId, 'No Romel reports found. Use /romel to submit one.');
    return;
  }
  const list = romelReports.map((r, i) => `${i + 1}. <b>${r.title}</b> — ${r.date}`).join('\n');
  await sendTelegramMessage(chatId, `<b>🏪 Romel Reports</b>\n\n${list}\n\n<b>Total:</b> ${romelReports.length} reports`);
}

// ============================================================
// COLLEGE COMMANDS
// ============================================================

async function handleAdmission(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>🎓 Admission</b>\n\nUsage: <code>/admission [student info or query]</code>\n\nExample:\n<code>/admission New applicant: Abebe Kebede, Computer Science, GPA 3.5</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const saved = await saveReportToWeb('admission', 'Olbright College', `Admission - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>🎓 Admission Record Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

async function handleExam(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📝 Exam</b>\n\nUsage: <code>/exam [exam info or results]</code>');
    return;
  }
  const saved = await saveReportToWeb('exam', 'Olbright College', `Exam - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📝 Exam Record Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

async function handleReportCollege(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>🏫 College Report</b>\n\nUsage: <code>/reportcollege [report text]</code>');
    return;
  }
  const saved = await saveReportToWeb('college', 'Olbright College', `College Report - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>🏫 College Report Saved</b>\n\n<i>${tag}</i>`);
}

async function handleEval(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📋 Evaluation</b>\n\nUsage: <code>/eval [subject to evaluate]</code>\n\nExample:\n<code>/eval Evaluate the Q3 marketing campaign performance</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const evalResult = await askGroq(
    `Evaluate the following and provide a structured assessment with strengths, weaknesses, and recommendations:\n\n${args}`,
    'You are a professional evaluator. Provide structured assessments with clear categories.'
  );
  const saved = await saveReportToWeb('eval', 'Olbright College', `Evaluation - ${todayStr()}`, evalResult, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📋 Evaluation</b>\n\n${evalResult}\n\n<i>${tag}</i>`);
}

async function handleVicereport(chatId: number, args: string, firstName: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>🏛 Vice Dean Report</b>\n\nPaste your report after the command:\n<code>/vicereport [paste report text]</code>\n\nI will extract date, sections, and action items.');
    return;
  }
  await sendChatAction(chatId, 'typing');

  // Extract date
  const dateMatch = args.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})/i);
  const reportDate = dateMatch ? dateMatch[0] : todayStr();

  // Extract action items (lines with bullets, numbers, or "action")
  const lines = args.split('\n');
  const actionItems = lines.filter(l => /^[\s]*[-•*]\s|action\s*:?\s*/i.test(l) || /^\d+[\.\)]\s/i.test(l)).slice(0, 5);

  const summary = `Date: ${reportDate}\nSections: ${lines.filter(l => l.trim().length > 0).length} lines\nAction Items: ${actionItems.length} found`;
  const fullContent = `${summary}\n\n${args}`;

  const saved = await saveReportToWeb('vd', 'Olbright College', `VD Report - ${reportDate}`, fullContent, chatId, firstName);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';

  let response = `<b>🏛 Vice Dean Report Saved</b>\n\n${summary}`;
  if (actionItems.length > 0) {
    response += `\n\n<b>Action Items:</b>\n${actionItems.map((a, i) => `${i + 1}. ${a.trim()}`).join('\n')}`;
  }
  response += `\n\n<i>${tag}</i>`;
  await sendTelegramMessage(chatId, response);
}

async function handleVicereports(chatId: number) {
  const vdReports = fallbackReports.filter(r => r.type === 'vd').slice(0, 5);
  if (vdReports.length === 0) {
    await sendTelegramMessage(chatId, 'No Vice Dean reports found. Use /vicereport to submit one.');
    return;
  }
  const list = vdReports.map((r, i) => `${i + 1}. <b>${r.title}</b> — ${r.date}`).join('\n');
  await sendTelegramMessage(chatId, `<b>🏛 Vice Dean Reports</b>\n\n${list}\n\n<b>Total:</b> ${vdReports.length} reports`);
}

async function handleQuarterly(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📊 Quarterly Report</b>\n\nUsage: <code>/quarterly [quarterly data]</code>');
    return;
  }
  const saved = await saveReportToWeb('quarterly', 'Olbright College', `Quarterly Report - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📊 Quarterly Report Saved</b>\n\n<i>${tag}</i>`);
}

async function handleQuarterlyReport(chatId: number, args: string) {
  await handleQuarterly(chatId, args);
}

async function handleEmployees(chatId: number, args: string) {
  if (!args) {
    const count = fallbackReports.filter(r => r.type === 'employees').length;
    await sendTelegramMessage(chatId, `<b>👥 Employee Records</b>\n\nTotal records: ${count}\n\nUse <code>/employees [name, role, department]</code> to add.`);
    return;
  }
  const saved = await saveReportToWeb('employees', 'Olbright College', `Employee - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>👥 Employee Record Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

async function handleStaff(chatId: number, args: string) {
  await handleEmployees(chatId, args);
}

async function handleStudents(chatId: number, args: string) {
  if (!args) {
    const count = fallbackReports.filter(r => r.type === 'students').length;
    await sendTelegramMessage(chatId, `<b>🎓 Student Records</b>\n\nTotal records: ${count}\n\nUse <code>/students [name, program, year]</code> to add.`);
    return;
  }
  const saved = await saveReportToWeb('students', 'Olbright College', `Student - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>🎓 Student Record Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

// ============================================================
// TECH COMMANDS
// ============================================================

async function handleTech(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>💻 Tech Report</b>\n\nUsage: <code>/tech [tech issue or report]</code>');
    return;
  }
  const saved = await saveReportToWeb('tech', 'Hambisa', `Tech Report - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>💻 Tech Report Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

async function handleTechReports(chatId: number) {
  const techReports = fallbackReports.filter(r => r.type === 'tech').slice(0, 5);
  if (techReports.length === 0) {
    await sendTelegramMessage(chatId, 'No tech reports found. Use /tech to submit one.');
    return;
  }
  const list = techReports.map((r, i) => `${i + 1}. <b>${r.title}</b> — ${r.date}`).join('\n');
  await sendTelegramMessage(chatId, `<b>💻 Tech Reports</b>\n\n${list}\n\n<b>Total:</b> ${techReports.length} reports`);
}

// ============================================================
// CAREER COMMANDS
// ============================================================

async function handleApply(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>💼 Apply</b>\n\nUsage: <code>/apply [job title, company, or URL]</code>\n\nExample:\n<code>/apply Software Engineer at Ethiopian Airlines</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const tips = await askGroq(
    `Provide specific application tips for: ${args}\nInclude: key requirements, application strategy, and 3 bullet points for the cover letter.`,
    'You are a career advisor specializing in the Ethiopian job market. Be practical and specific.'
  );
  const saved = await saveReportToWeb('apply', '', `Application - ${args.slice(0, 50)}`, tips, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>💼 Application Advice</b>\n\n${tips}\n\n<i>${tag}</i>`);
}

async function handleCv(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const prompt = args
    ? `Review and improve this CV/resume content:\n\n${args}\n\nProvide: 1) Overall assessment 2) Key improvements 3) Rewritten sections`
    : 'Provide a comprehensive CV writing guide for the Ethiopian job market. Include structure, key sections, and ATS optimization tips.';
  const cvAdvice = await askGroq(prompt, 'You are a professional CV writer and career coach. Focus on the Ethiopian job market.');
  const saved = await saveReportToWeb('cv', '', `CV Review - ${todayStr()}`, cvAdvice, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📄 CV Assistant</b>\n\n${cvAdvice}\n\n<i>${tag}</i>`);
}

async function handleCourses(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const topic = args || 'professional development';
  const courses = await askGroq(
    `Recommend 5 online courses for: ${topic}\nInclude: course name, platform (Coursera, Udemy, etc.), duration, and why it is valuable. Focus on free or affordable options.`,
    'You are a learning advisor. Recommend practical, affordable courses.'
  );
  await sendTelegramMessage(chatId, `<b>📚 Course Recommendations</b>\n${topic}\n\n${courses}`);
}

async function handleInterview(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const role = args || 'general position';
  const prep = await askGroq(
    `Generate interview preparation for: ${role}\nInclude:\n1. 5 likely questions with suggested answers\n2. Company research tips\n3. Common mistakes to avoid\n4. Closing questions to ask`,
    'You are an interview coach. Provide practical, actionable interview preparation.'
  );
  const saved = await saveReportToWeb('interview', '', `Interview Prep - ${role.slice(0, 50)}`, prep, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>🎯 Interview Prep</b>\n${role}\n\n${prep}\n\n<i>${tag}</i>`);
}

// ============================================================
// COMMUNICATION COMMANDS
// ============================================================

async function handleEmail(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>✉️ Email Draft</b>\n\nUsage: <code>/email [describe the email you need]</code>\n\nExample:\n<code>/email Request a meeting with the Dean about Q4 budget</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const email = await askGroq(
    `Draft a professional email based on this request:\n\n${args}\n\nInclude: subject line, greeting, body, and sign-off. Keep it concise and professional.`,
    'You are a professional email writer. Draft clear, concise, well-structured emails.'
  );
  const saved = await saveReportToWeb('email', '', `Email - ${todayStr()}`, email, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>✉️ Email Draft</b>\n\n${email}\n\n<i>${tag}</i>`);
}

async function handleMeeting(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📅 Meeting Notes</b>\n\nUsage: <code>/meeting [meeting details or notes]</code>\n\nExample:\n<code>/meeting Weekly standup: discussed Q3 targets, Abebe to follow up on vendor contracts</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  // Structure the meeting notes with AI
  const structured = await askGroq(
    `Structure these meeting notes into a clean format with attendees (if mentioned), key decisions, and action items:\n\n${args}`,
    'You are an executive assistant. Structure meeting notes clearly and concisely.'
  );
  const saved = await saveReportToWeb('meeting', '', `Meeting - ${todayStr()}`, structured, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📅 Meeting Notes</b>\n\n${structured}\n\n<i>${tag}</i>`);
}

async function handleDraft(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📝 Draft</b>\n\nUsage: <code>/draft [describe what to draft]</code>\n\nExample:\n<code>/draft A proposal letter for partnership with XYZ company</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const draft = await askGroq(
    `Draft the following:\n\n${args}\n\nMake it professional and ready to use.`,
    'You are a professional writer. Draft clear, polished documents.'
  );
  const saved = await saveReportToWeb('draft', '', `Draft - ${todayStr()}`, draft, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📝 Draft</b>\n\n${draft}\n\n<i>${tag}</i>`);
}

// ============================================================
// STRATEGY COMMANDS
// ============================================================

async function handleGoals(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const context = args || 'business growth and personal development';
  const goals = await askGroq(
    `Generate 5 SMART goals for: ${context}\nFormat each goal with:\n- Goal statement\n- Key metrics\n- Timeline\n- Priority (High/Medium/Low)`,
    'You are a strategic planning consultant. Create actionable SMART goals.'
  );
  const saved = await saveReportToWeb('goals', '', `Goals - ${todayStr()}`, goals, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>🎯 Strategic Goals</b>\n\n${goals}\n\n<i>${tag}</i>`);
}

async function handleSwot(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const subject = args || 'the current business operations';
  const swot = await askGroq(
    `Perform a SWOT analysis for: ${subject}\n\nFormat:\n<b>Strengths:</b>\n- ...\n\n<b>Weaknesses:</b>\n- ...\n\n<b>Opportunities:</b>\n- ...\n\n<b>Threats:</b>\n- ...`,
    'You are a business strategy consultant. Perform thorough SWOT analyses.'
  );
  const saved = await saveReportToWeb('swot', '', `SWOT - ${subject.slice(0, 50)}`, swot, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📊 SWOT Analysis</b>\n${subject}\n\n${swot}\n\n<i>${tag}</i>`);
}

async function handleBrainstorm(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>💡 Brainstorm</b>\n\nUsage: <code>/brainstorm [topic or question]</code>\n\nExample:\n<code>/brainstorm Ways to increase student enrollment at the college</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const ideas = await askGroq(
    `Brainstorm 10 creative ideas for: ${args}\n\nFor each idea provide:\n- A catchy title\n- Brief description (1-2 sentences)\n- Feasibility rating (High/Medium/Low)`,
    'You are a creative brainstorming partner. Generate diverse, practical, and innovative ideas.'
  );
  const saved = await saveReportToWeb('brainstorm', '', `Brainstorm - ${args.slice(0, 50)}`, ideas, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>💡 Brainstorm</b>\n${args}\n\n${ideas}\n\n<i>${tag}</i>`);
}

// ============================================================
// DATA COMMANDS
// ============================================================

async function handleNote(chatId: number, args: string, firstName: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📝 Save Note</b>\n\nUsage: <code>/note [your note text]</code>');
    return;
  }
  const note: Note = { id: uid('note'), chatId, text: args, createdAt: nowStr() };
  notes.unshift(note);
  if (notes.length > 500) notes.length = 500;
  await sendTelegramMessage(chatId, `<b>📝 Note Saved</b>\n\n"${args.slice(0, 200)}${args.length > 200 ? '...' : ''}"\n\n<i>Total notes: ${notes.filter(n => n.chatId === chatId).length}</i>`);
}

async function handleNotes(chatId: number) {
  const userNotes = notes.filter(n => n.chatId === chatId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  if (userNotes.length === 0) {
    await sendTelegramMessage(chatId, '📝 No notes yet. Use /note <text> to save one.');
    return;
  }
  const list = userNotes.map((n, i) => `${i + 1}. ${n.text.slice(0, 100)}${n.text.length > 100 ? '...' : ''} <i>(${n.createdAt.split('T')[0]})</i>`).join('\n');
  await sendTelegramMessage(chatId, `<b>📝 Your Notes</b> (${userNotes.length})\n\n${list}`);
}

async function handleExport(chatId: number, args: string) {
  await sendChatAction(chatId, 'typing');
  const exportType = (args || '').toLowerCase();

  if (exportType.includes('note') || !exportType) {
    const userNotes = notes.filter(n => n.chatId === chatId);
    if (userNotes.length === 0) {
      await sendTelegramMessage(chatId, 'No data to export. Use /note, /task, or /reminder to create data first.');
      return;
    }
    const text = userNotes.map(n => `[${n.createdAt}] ${n.text}`).join('\n');
    await sendTelegramMessage(chatId, `<b>📦 Export: Notes</b>\n\n<pre>${text.slice(0, 3800)}</pre>${text.length > 3800 ? '\n<i>...truncated</i>' : ''}`);
    return;
  }

  if (exportType.includes('task')) {
    const userTasks = tasks.filter(t => t.chatId === chatId);
    if (userTasks.length === 0) {
      await sendTelegramMessage(chatId, 'No tasks to export.');
      return;
    }
    const text = userTasks.map(t => `[${t.done ? 'DONE' : 'PENDING'}] ${t.text} (${t.createdAt})`).join('\n');
    await sendTelegramMessage(chatId, `<b>📦 Export: Tasks</b>\n\n<pre>${text.slice(0, 3800)}</pre>`);
    return;
  }

  if (exportType.includes('reminder')) {
    const userReminders = reminders.filter(r => r.chatId === chatId);
    if (userReminders.length === 0) {
      await sendTelegramMessage(chatId, 'No reminders to export.');
      return;
    }
    const text = userReminders.map(r => `[${r.due}] ${r.text}`).join('\n');
    await sendTelegramMessage(chatId, `<b>📦 Export: Reminders</b>\n\n<pre>${text.slice(0, 3800)}</pre>`);
    return;
  }

  await sendTelegramMessage(chatId, `<b>📦 Export</b>\n\nUsage: <code>/export [notes|tasks|reminders]</code>`);
}

async function handleSavedata(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>💾 Save Data</b>\n\nUsage: <code>/savedata [key:value pairs or JSON]</code>\n\nExample:\n<code>/savedata project: Website Redesign, deadline: 2025-02-28</code>');
    return;
  }
  const entry = { id: uid('data'), chatId, data: args, createdAt: nowStr() };
  savedDataStore.unshift(entry);
  if (savedDataStore.length > 200) savedDataStore.length = 200;
  await sendTelegramMessage(chatId, `<b>💾 Data Saved</b>\n\n${args.slice(0, 300)}\n\n<i>Total entries: ${savedDataStore.filter(d => d.chatId === chatId).length}</i>`);
}

// ============================================================
// KNOWLEDGE COMMANDS
// ============================================================

async function handleLearn(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📖 Learn</b>\n\nUsage: <code>/learn [topic to learn about]</code>\n\nExample:\n<code>/learn How to write a business proposal</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const lesson = await askGroq(
    `Teach me about: ${args}\n\nProvide:\n1. Brief overview (2-3 sentences)\n2. Key concepts (bullet points)\n3. Practical example\n4. Resources to learn more`,
    'You are a knowledgeable tutor. Explain topics clearly with practical examples.'
  );
  const entry: KnowledgeEntry = { id: uid('learn'), chatId, topic: args, content: lesson, createdAt: nowStr() };
  knowledgeStore.unshift(entry);
  if (knowledgeStore.length > 100) knowledgeStore.length = 100;
  await sendTelegramMessage(chatId, `<b>📖 Learn: ${args}</b>\n\n${lesson}`);
}

async function handleKnowledge(chatId: number) {
  const userKnowledge = knowledgeStore.filter(k => k.chatId === chatId).slice(0, 10);
  if (userKnowledge.length === 0) {
    await sendTelegramMessage(chatId, '📚 No knowledge entries yet. Use /learn <topic> to learn something.');
    return;
  }
  const list = userKnowledge.map((k, i) => `${i + 1}. <b>${k.topic}</b> — ${k.createdAt.split('T')[0]}`).join('\n');
  await sendTelegramMessage(chatId, `<b>📚 Knowledge Base</b> (${userKnowledge.length})\n\n${list}`);
}

async function handleAsk(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>❓ Ask</b>\n\nUsage: <code>/ask [your question]</code>');
    return;
  }
  await sendChatAction(chatId, 'typing');
  const answer = await askGroq(args, 'You are a helpful AI assistant. Provide clear, accurate, and concise answers.');
  await sendTelegramMessage(chatId, `<b>❓ Question:</b> ${args}\n\n<b>Answer:</b>\n${answer}`);
}

// ============================================================
// CRM COMMANDS
// ============================================================

async function handleContact(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>👤 Add Contact</b>\n\nUsage: <code>/contact [name, company, phone, email, notes]</code>\n\nExample:\n<code>/contact Abebe Kebede, Ethiotelecom, 0911223344, abebe@example.com, IT Manager</code>');
    return;
  }
  const saved = await saveReportToWeb('contact', '', `Contact - ${todayStr()}`, args, chatId);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>👤 Contact Saved</b>\n\n${args}\n\n<i>${tag}</i>`);
}

async function handleContacts(chatId: number) {
  const contacts = fallbackReports.filter(r => r.type === 'contact').slice(0, 10);
  if (contacts.length === 0) {
    await sendTelegramMessage(chatId, '📇 No contacts found. Use /contact to add one.');
    return;
  }
  const list = contacts.map((c, i) => `${i + 1}. ${c.content.split(',')[0] || c.title} — ${c.date}`).join('\n');
  await sendTelegramMessage(chatId, `<b>📇 Contacts</b> (${contacts.length})\n\n${list}`);
}

async function handleAnalytics(chatId: number) {
  const total = fallbackReports.length;
  const types: Record<string, number> = {};
  fallbackReports.forEach((r: any) => { types[r.type] = (types[r.type] || 0) + 1; });
  const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]);

  const todayCount = fallbackReports.filter(r => r.date === todayStr()).length;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weekCount = fallbackReports.filter(r => r.date >= weekAgo).length;

  let report = `<b>📊 Analytics</b>\n\n`;
  report += `<b>Total Reports:</b> ${total}\n`;
  report += `<b>Today:</b> ${todayCount}\n`;
  report += `<b>This Week:</b> ${weekCount}\n\n`;
  report += `<b>By Type:</b>\n`;
  sorted.forEach(([type, count]) => {
    report += `  • ${type}: ${count}\n`;
  });

  await sendTelegramMessage(chatId, report);
}

// ============================================================
// ADMIN COMMANDS
// ============================================================

async function handleDbTest(chatId: number) {
  await sendChatAction(chatId, 'typing');
  let report = '<b>🔧 DB Diagnostic</b>\n\n';

  // Test 1: Raw SQL
  try {
    await ensureBotReportTable();
    const countResult: any[] = await db.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "BotReport"`);
    const count = countResult[0]?.cnt || 0;
    report += `<b>✅ SQLite (Raw SQL):</b> Connected\n`;
    report += `  BotReport rows: ${count}\n`;
  } catch (err: any) {
    report += `<b>❌ SQLite (Raw SQL):</b> ${err?.message}\n`;
  }

  // Test 2: Prisma ORM
  try {
    await db.user.count();
    report += `<b>✅ Prisma ORM:</b> Connected\n`;
  } catch (err: any) {
    report += `<b>❌ Prisma ORM:</b> ${err?.message}\n`;
  }

  // Test 3: Memory stores
  report += `\n<b>Memory Stores:</b>\n`;
  report += `  Reports: ${fallbackReports.length}\n`;
  report += `  Notes: ${notes.length}\n`;
  report += `  Tasks: ${tasks.length}\n`;
  report += `  Reminders: ${reminders.length}\n`;
  report += `  Knowledge: ${knowledgeStore.length}\n`;

  // Test 4: Groq API
  if (GROQ_API_KEY) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }),
      });
      const data = await res.json();
      const latency = Date.now() - start;
      report += `\n<b>✅ Groq API:</b> ${res.ok ? 'Connected' : `Error ${res.status}`} (${latency}ms)\n`;
    } catch (err: any) {
      report += `<b>❌ Groq API:</b> ${err?.message}\n`;
    }
  } else {
    report += `\n<b>⚠️ Groq API:</b> No API key configured\n`;
  }

  await sendTelegramMessage(chatId, report);
}

async function handleReminder(chatId: number, args: string, firstName: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>⏰ Set Reminder</b>\n\nUsage: <code>/reminder [description] | [due date/time]</code>\n\nExample:\n<code>/reminder Call the supplier | tomorrow 2pm</code>');
    return;
  }
  const parts = args.split('|').map(s => s.trim());
  const text = parts[0] || args;
  const due = parts[1] || 'No due date set';
  const reminder: Reminder = { id: uid('rem'), chatId, text, due, createdAt: nowStr() };
  reminders.unshift(reminder);
  if (reminders.length > 200) reminders.length = 200;
  await sendTelegramMessage(chatId, `<b>⏰ Reminder Set</b>\n\n${text}\n<b>Due:</b> ${due}\n\n<i>Total reminders: ${reminders.filter(r => r.chatId === chatId).length}</i>`);
}

async function handleReminders(chatId: number) {
  const userReminders = reminders.filter(r => r.chatId === chatId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  if (userReminders.length === 0) {
    await sendTelegramMessage(chatId, '⏰ No reminders. Use /reminder <text> | <due date> to add one.');
    return;
  }
  const list = userReminders.map((r, i) => `${i + 1}. ${r.text}\n   <i>Due: ${r.due} | ${r.createdAt.split('T')[0]}</i>`).join('\n\n');
  await sendTelegramMessage(chatId, `<b>⏰ Reminders</b> (${userReminders.length})\n\n${list}`);
}

async function handleTask(chatId: number, args: string, firstName: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>✅ Add Task</b>\n\nUsage: <code>/task [task description]</code>\n\nExample:\n<code>/task Review the Q3 financial report</code>');
    return;
  }
  const task: Task = { id: uid('task'), chatId, text: args, done: false, createdAt: nowStr() };
  tasks.unshift(task);
  if (tasks.length > 300) tasks.length = 300;
  await sendTelegramMessage(chatId, `<b>✅ Task Added</b>\n\n${args}\n\n<i>Pending tasks: ${tasks.filter(t => t.chatId === chatId && !t.done).length}</i>`);
}

async function handleTasks(chatId: number) {
  const userTasks = tasks.filter(t => t.chatId === chatId);
  const pending = userTasks.filter(t => !t.done);
  const done = userTasks.filter(t => t.done);

  if (userTasks.length === 0) {
    await sendTelegramMessage(chatId, '✅ No tasks. Use /task <description> to add one.');
    return;
  }

  let response = `<b>📋 Tasks</b>\n\n`;
  if (pending.length > 0) {
    response += `<b>Pending (${pending.length}):</b>\n`;
    pending.slice(0, 10).forEach((t, i) => {
      response += `${i + 1}. ☐ ${t.text}\n`;
    });
  }
  if (done.length > 0) {
    response += `\n<b>Done (${done.length}):</b>\n`;
    done.slice(0, 5).forEach((t, i) => {
      response += `${i + 1}. ☑ ${t.text}\n`;
    });
  }
  await sendTelegramMessage(chatId, response);
}

async function handleClear(chatId: number, args: string) {
  const target = (args || '').toLowerCase();
  const userFilter = (arr: any) => arr.filter((item: any) => item.chatId === chatId);

  if (!target || target === 'all') {
    // Clear all user data
    const before = notes.length + tasks.length + reminders.length;
    for (let i = notes.length - 1; i >= 0; i--) { if (notes[i].chatId === chatId) notes.splice(i, 1); }
    for (let i = tasks.length - 1; i >= 0; i--) { if (tasks[i].chatId === chatId) tasks.splice(i, 1); }
    for (let i = reminders.length - 1; i >= 0; i--) { if (reminders[i].chatId === chatId) reminders.splice(i, 1); }
    for (let i = knowledgeStore.length - 1; i >= 0; i--) { if (knowledgeStore[i].chatId === chatId) knowledgeStore.splice(i, 1); }
    const after = notes.length + tasks.length + reminders.length;
    await sendTelegramMessage(chatId, `<b>🗑 Cleared</b>\n\nRemoved ${before - after} items (notes, tasks, reminders, knowledge).`);
    return;
  }

  if (target === 'notes') {
    const count = userFilter(notes).length;
    for (let i = notes.length - 1; i >= 0; i--) { if (notes[i].chatId === chatId) notes.splice(i, 1); }
    await sendTelegramMessage(chatId, `<b>🗑 Cleared</b>\n\nRemoved ${count} notes.`);
  } else if (target === 'tasks') {
    const count = userFilter(tasks).length;
    for (let i = tasks.length - 1; i >= 0; i--) { if (tasks[i].chatId === chatId) tasks.splice(i, 1); }
    await sendTelegramMessage(chatId, `<b>🗑 Cleared</b>\n\nRemoved ${count} tasks.`);
  } else if (target === 'reminders') {
    const count = userFilter(reminders).length;
    for (let i = reminders.length - 1; i >= 0; i--) { if (reminders[i].chatId === chatId) reminders.splice(i, 1); }
    await sendTelegramMessage(chatId, `<b>🗑 Cleared</b>\n\nRemoved ${count} reminders.`);
  } else {
    await sendTelegramMessage(chatId, '<b>🗑 Clear</b>\n\nUsage: <code>/clear [notes|tasks|reminders|all]</code>');
  }
}

async function handleBackup(chatId: number) {
  await sendChatAction(chatId, 'typing');
  const backup = {
    date: nowStr(),
    chatId,
    notes: notes.filter(n => n.chatId === chatId),
    tasks: tasks.filter(t => t.chatId === chatId),
    reminders: reminders.filter(r => r.chatId === chatId),
    knowledge: knowledgeStore.filter(k => k.chatId === chatId),
  };
  const json = JSON.stringify(backup, null, 2);
  const totalItems = backup.notes.length + backup.tasks.length + backup.reminders.length + backup.knowledge.length;

  if (json.length > 3800) {
    // Send summary if too large
    await sendTelegramMessage(chatId, `<b>💾 Backup Summary</b>\n\nNotes: ${backup.notes.length}\nTasks: ${backup.tasks.length}\nReminders: ${backup.reminders.length}\nKnowledge: ${backup.knowledge.length}\n\nTotal: ${totalItems} items\n\n<i>Data is too large for Telegram. Use /export for individual categories.</i>`);
  } else {
    await sendTelegramMessage(chatId, `<b>💾 Backup</b>\n\n<pre>${json}</pre>`);
  }
}

// ============================================================
// WEB COMMANDS
// ============================================================

async function handleStart(chatId: number, firstName: string) {
  const welcomeMessage = `Welcome <b>${firstName}</b> to <b>Hambisa Executive</b>! 🚀

<b>📋 Command Categories:</b>

<b>📊 Daily:</b> /briefing /verse /log /kpi /weather /news
<b>🏪 Romel:</b> /romel /target /romelreports
<b>🏫 College:</b> /admission /exam /reportcollege /eval /vicereport /vicereports /quarterly /employees /staff /students
<b>💻 Tech:</b> /tech /techreports
<b>💼 Career:</b> /apply /cv /courses /interview
<b>✉️ Communication:</b> /email /meeting /draft
<b>🎯 Strategy:</b> /goals /swot /brainstorm
<b>📝 Data:</b> /note /notes /export /savedata
<b>📚 Knowledge:</b> /learn /knowledge /ask
<b>👤 CRM:</b> /contact /contacts /analytics
<b>🔧 Admin:</b> /dbtest /reminder /reminders /task /tasks /clear /backup
<b>🌐 Web:</b> /dashboard /sync /profile /start /help
<b>🔍 Scraping:</b> /scrape /rawreport

Type any message to chat with AI!`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📊 Dashboard', url: APP_URL },
        { text: '📋 Help', callback_data: 'help' },
      ],
      [
        { text: '📊 Briefing', callback_data: 'briefing' },
        { text: '📈 KPIs', callback_data: 'kpi' },
      ],
      [
        { text: '🔧 DB Test', callback_data: 'dbtest' },
        { text: '📦 Export', callback_data: 'export' },
      ],
    ],
  };
  await sendTelegramMessage(chatId, welcomeMessage, { replyMarkup });
}

async function handleHelp(chatId: number) {
  const helpText = `<b>📚 Hambisa Executive — All Commands</b>

<b>📊 DAILY</b>
/briefing — AI daily executive briefing
/verse — Daily Bible verse
/log — View activity log
/kpi — KPI summary
/weather [city] — Weather info
/news [topic] — News digest

<b>🏪 ROMEL</b>
/romel [report] — Submit sales report
/target [desc] — Set sales target
/romelreports — View Romel reports

<b>🏫 COLLEGE</b>
/admission [info] — Record admission
/exam [info] — Record exam
/reportcollege [text] — College report
/eval [subject] — AI evaluation
/vicereport [text] — Vice Dean report
/vicereports — View VD reports
/quarterly [data] — Quarterly report
/employees [info] — Employee record
/staff [info] — Staff record
/students [info] — Student record

<b>💻 TECH</b>
/tech [report] — Submit tech report
/techreports — View tech reports

<b>💼 CAREER</b>
/apply [job] — Application advice
/cv [content] — CV review/help
/courses [topic] — Course recommendations
/interview [role] — Interview prep

<b>✉️ COMMUNICATION</b>
/email [desc] — Draft email
/meeting [notes] — Meeting notes
/draft [desc] — Draft document

<b>🎯 STRATEGY</b>
/goals [context] — SMART goals
/swot [subject] — SWOT analysis
/brainstorm [topic] — Brainstorm ideas

<b>📝 DATA</b>
/note [text] — Save note
/notes — View notes
/export [type] — Export data
/savedata [data] — Save custom data

<b>📚 KNOWLEDGE</b>
/learn [topic] — Learn about topic
/knowledge — View knowledge base
/ask [question] — Ask AI anything

<b>👤 CRM</b>
/contact [info] — Add contact
/contacts — View contacts
/analytics — View analytics

<b>🔧 ADMIN</b>
/dbtest — Database diagnostic
/reminder [text] | [due] — Set reminder
/reminders — View reminders
/task [desc] — Add task
/tasks — View tasks
/clear [type] — Clear data
/backup — Backup your data

<b>🌐 WEB</b>
/dashboard — Open web dashboard
/sync — Sync data
/profile — View profile
/start — Welcome message
/help — This help message

<b>🔍 SCRAPING</b>
/scrape [url] — Scrape web page
/rawreport [text] — Save raw report`;

  await sendTelegramMessage(chatId, helpText);
}

async function handleDashboard(chatId: number) {
  await sendTelegramMessage(chatId, `<b>🌐 Dashboard</b>\n\n<a href="${APP_URL}">Open Dashboard</a>`, {
    replyMarkup: { inline_keyboard: [[{ text: 'Open Dashboard', url: APP_URL }]] },
  });
}

async function handleSync(chatId: number) {
  await sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`${APP_URL}/api/bot/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: 'telegram-bot' }),
    });
    const data = await res.json();
    if (data.success) {
      await sendTelegramMessage(chatId, '<b>✅ Sync Complete</b>\n\nData synced to dashboard successfully.');
    } else {
      await sendTelegramMessage(chatId, '<b>⚠️ Sync</b>\n\nSync returned no success flag. Data may already be up to date.');
    }
  } catch {
    await sendTelegramMessage(chatId, '<b>❌ Sync Failed</b>\n\nCould not reach the server. Try again later.');
  }
}

async function handleProfile(chatId: number) {
  await sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`${APP_URL}/api/profile`);
    const data = await res.json();
    if (data.success && data.profile) {
      const p = data.profile;
      await sendTelegramMessage(chatId, `<b>👤 Profile</b>\n\n<b>Name:</b> ${p.fullName || 'N/A'}\n<b>Title:</b> ${p.title || 'N/A'}\n<b>Email:</b> ${p.email || 'N/A'}\n<b>Phone:</b> ${p.phone || 'N/A'}`);
    } else {
      await sendTelegramMessage(chatId, '<b>👤 Profile</b>\n\nProfile not found. Set up from the web dashboard.');
    }
  } catch {
    await sendTelegramMessage(chatId, '<b>❌ Profile</b>\n\nCould not fetch profile from server.');
  }
}

// ============================================================
// SCRAPING COMMANDS
// ============================================================

async function handleScrape(chatId: number, args: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>🔍 Scrape</b>\n\nUsage: <code>/scrape [URL]</code>\n\nExtracts text content from a web page.');
    return;
  }
  await sendChatAction(chatId, 'typing');

  // Extract URL from args
  const urlMatch = args.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) {
    await sendTelegramMessage(chatId, 'Please provide a valid URL starting with http:// or https://');
    return;
  }
  const url = urlMatch[0];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HambisaBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Extract text content (simple HTML strip)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3500);

    const saved = await saveReportToWeb('scrape', '', `Scraped - ${url.slice(0, 60)}`, text, chatId);
    const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';

    await sendTelegramMessage(chatId, `<b>🔍 Scraped: ${url.slice(0, 60)}</b>\n\n${text}...\n\n<i>${tag}</i>`);
  } catch (err: any) {
    await sendTelegramMessage(chatId, `<b>❌ Scrape Failed</b>\n\n${err?.message || 'Could not fetch URL'}`);
  }
}

async function handleRawReport(chatId: number, args: string, firstName: string) {
  if (!args) {
    await sendTelegramMessage(chatId, '<b>📄 Raw Report</b>\n\nPaste any report text after the command:\n<code>/rawreport [paste text]</code>\n\nIt will be saved to the dashboard as-is.');
    return;
  }
  const saved = await saveReportToWeb('raw', '', `Raw Report - ${todayStr()}`, args, chatId, firstName);
  const tag = saved ? '✅ Synced to dashboard' : '⚠️ Saved locally';
  await sendTelegramMessage(chatId, `<b>📄 Raw Report Saved</b>\n\n${args.slice(0, 200)}${args.length > 200 ? '...' : ''}\n\n<i>${tag}</i>`);
}

// ============================================================
// GENERAL AI CHAT (non-command messages)
// ============================================================

async function handleChat(chatId: number, text: string) {
  await sendChatAction(chatId, 'typing');
  const answer = await askGroq(text, 'You are Hambisa Executive, a helpful AI assistant for a business executive in Ethiopia. You help with career advice, business strategy, document writing, and daily productivity. Be concise and professional.');
  await sendTelegramMessage(chatId, answer);
}

// ============================================================
// MAIN COMMAND DISPATCH
// ============================================================

async function processUpdate(update: any) {
  // Handle callback queries (inline buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const firstName = cb.from?.first_name || 'User';
    if (!chatId) return;

    await sendChatAction(chatId, 'typing');
    switch (cb.data) {
      case 'sync': await handleSync(chatId); break;
      case 'help': await handleHelp(chatId); break;
      case 'briefing': await handleBriefing(chatId, firstName); break;
      case 'kpi': await handleKpi(chatId, ''); break;
      case 'dbtest': await handleDbTest(chatId); break;
      case 'export': await handleExport(chatId, ''); break;
      case 'analyze_cv':
        await sendTelegramMessage(chatId, 'Send your CV text after /cv or use the web dashboard for full analysis.');
        break;
      case 'cover_letter':
        await sendTelegramMessage(chatId, 'Describe the job and company after /email for a cover letter draft.');
        break;
      default: await sendTelegramMessage(chatId, 'Button pressed! Use /help to see commands.');
    }
    try {
      const token = getBotToken();
      await fetch(`${TELEGRAM_API_BASE}/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id }),
      });
    } catch { /* silent */ }
    return;
  }

  // Handle messages
  const message = update.message;
  if (!message) return;
  const chatId = message.chat?.id;
  const text = message.text || '';
  const firstName = message.from?.first_name || 'User';
  if (!chatId || !text) return;

  // Command dispatch
  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase().split('@')[0];
    const args = extractArgs(text, cmd);

    switch (cmd) {
      // DAILY
      case '/briefing': await handleBriefing(chatId, firstName); break;
      case '/verse': await handleVerse(chatId); break;
      case '/log': await handleLog(chatId, args); break;
      case '/kpi': await handleKpi(chatId, args); break;
      case '/weather': await handleWeather(chatId, args); break;
      case '/news': await handleNews(chatId, args); break;

      // ROMEL
      case '/romel': await handleRomel(chatId, args, firstName); break;
      case '/target': await handleTarget(chatId, args); break;
      case '/romelreports': await handleRomelReports(chatId); break;

      // COLLEGE
      case '/admission': await handleAdmission(chatId, args); break;
      case '/exam': await handleExam(chatId, args); break;
      case '/reportcollege': await handleReportCollege(chatId, args); break;
      case '/eval': await handleEval(chatId, args); break;
      case '/vicereport': await handleVicereport(chatId, args, firstName); break;
      case '/vicereports': await handleVicereports(chatId); break;
      case '/quarterly': await handleQuarterly(chatId, args); break;
      case '/quarterlyreport': await handleQuarterlyReport(chatId, args); break;
      case '/employees': await handleEmployees(chatId, args); break;
      case '/staff': await handleStaff(chatId, args); break;
      case '/students': await handleStudents(chatId, args); break;

      // TECH
      case '/tech': await handleTech(chatId, args); break;
      case '/techreports': await handleTechReports(chatId); break;

      // CAREER
      case '/apply': await handleApply(chatId, args); break;
      case '/cv': await handleCv(chatId, args); break;
      case '/courses': await handleCourses(chatId, args); break;
      case '/interview': await handleInterview(chatId, args); break;

      // COMMUNICATION
      case '/email': await handleEmail(chatId, args); break;
      case '/meeting': await handleMeeting(chatId, args); break;
      case '/draft': await handleDraft(chatId, args); break;

      // STRATEGY
      case '/goals': await handleGoals(chatId, args); break;
      case '/swot': await handleSwot(chatId, args); break;
      case '/brainstorm': await handleBrainstorm(chatId, args); break;

      // DATA
      case '/note': await handleNote(chatId, args, firstName); break;
      case '/notes': await handleNotes(chatId); break;
      case '/export': await handleExport(chatId, args); break;
      case '/savedata': await handleSavedata(chatId, args); break;

      // KNOWLEDGE
      case '/learn': await handleLearn(chatId, args); break;
      case '/knowledge': await handleKnowledge(chatId); break;
      case '/ask': await handleAsk(chatId, args); break;

      // CRM
      case '/contact': await handleContact(chatId, args); break;
      case '/contacts': await handleContacts(chatId); break;
      case '/analytics': await handleAnalytics(chatId); break;

      // ADMIN
      case '/dbtest': await handleDbTest(chatId); break;
      case '/reminder': await handleReminder(chatId, args, firstName); break;
      case '/reminders': await handleReminders(chatId); break;
      case '/task': await handleTask(chatId, args, firstName); break;
      case '/tasks': await handleTasks(chatId); break;
      case '/clear': await handleClear(chatId, args); break;
      case '/backup': await handleBackup(chatId); break;

      // WEB
      case '/dashboard': case '/dash': case '/web': await handleDashboard(chatId); break;
      case '/sync': await handleSync(chatId); break;
      case '/profile': await handleProfile(chatId); break;
      case '/start': await handleStart(chatId, firstName); break;
      case '/help': await handleHelp(chatId); break;

      // SCRAPING
      case '/scrape': await handleScrape(chatId, args); break;
      case '/rawreport': await handleRawReport(chatId, args, firstName); break;

      default:
        await sendTelegramMessage(chatId, `Unknown command: <code>${cmd}</code>\n\nType <b>/help</b> to see all available commands.`);
    }
    return;
  }

  // Non-command messages → AI chat
  await handleChat(chatId, text);
}

// ============================================================
// ROUTE HANDLERS (POST + GET)
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
      return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 500 });
    }
    // IMPORTANT: await processUpdate to keep Vercel function alive
    await processUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    return NextResponse.json({
      status: 'error',
      message: 'TELEGRAM_BOT_TOKEN not set',
    });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('set') || searchParams.get('action');

  if (action === '1' || action === 'set') {
    const webhookUrl = searchParams.get('url') ||
      `${APP_URL}/api/telegram/webhook`;
    try {
      const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true }),
      });
      const data = await res.json();
      return NextResponse.json({ status: data.ok ? 'success' : 'error', telegram_response: data });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message });
    }
  }

  if (action === 'delete' || action === 'remove') {
    try {
      const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/deleteWebhook`, { method: 'POST' });
      return NextResponse.json({ status: 'deleted', telegram_response: await res.json() });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message });
    }
  }

  if (action === 'info') {
    try {
      const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getWebhookInfo`);
      return NextResponse.json({ status: 'info', webhook: await res.json() });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message });
    }
  }

  return NextResponse.json({
    status: 'active',
    bot: '@hambi_career_ai_bot',
    message: 'Hambisa Executive webhook running',
    commands: 55,
    endpoints: {
      set: '/api/telegram/webhook?set=1',
      delete: '/api/telegram/webhook?action=delete',
      info: '/api/telegram/webhook?action=info',
    },
  });
}