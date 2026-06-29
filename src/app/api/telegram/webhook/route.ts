import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  return token;
}

/** Send a message to a Telegram chat */
async function sendTelegramMessage(chatId: number, text: string, options?: {
  parseMode?: string;
  replyMarkup?: any;
  replyToMessageId?: number;
}): Promise<boolean> {
  try {
    const token = getBotToken();
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || 'HTML',
    };
    if (options?.replyMarkup) body.reply_markup = options.replyMarkup;
    if (options?.replyToMessageId) body.reply_to_message_id = options.replyToMessageId;

    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Telegram] sendMessage failed (${res.status}):`, errText);
    }
    return res.ok;
  } catch (err) {
    console.error('[Telegram] Send message failed:', err);
    return false;
  }
}

/** Send a chat action (typing indicator) */
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

/** Generate AI reply inline using z-ai-web-dev-sdk (no self-call) */
async function generateAIReply(userMessage: string, conversation: any[]): Promise<string> {
  // Try z-ai-web-dev-sdk first
  try {
    const ZAI = await import('z-ai-web-dev-sdk');
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: conversation,
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices[0]?.message?.content;
    if (reply && reply.trim().length > 0) {
      return reply;
    }
  } catch (aiError) {
    console.error('[Telegram AI] SDK error, using fallback:', aiError);
  }

  // Fallback mock replies
  const lower = userMessage.toLowerCase();
  if (lower.includes('cover letter') || lower.includes('coverletter')) {
    return 'I\'d be happy to help with your cover letter! For the best results, please share the job title and company name. A strong Ethiopian cover letter should include: your contact information, a professional greeting, 2-3 paragraphs highlighting your relevant experience, and a closing with call to action. Keep it to 300-400 words and reference specific achievements with numbers.';
  }
  if (lower.includes('resume') || lower.includes('cv')) {
    return 'For your CV, make sure to include: a clear professional summary, core competencies section, detailed work experience with quantifiable achievements, education, and languages. Ethiopian employers value clean formatting, professional email addresses, and local phone numbers (+251). Consider using Times New Roman or Arial font.';
  }
  if (lower.includes('interview') || lower.includes('prepare')) {
    return 'Interview preparation tips for Ethiopia:\n1) Research the company thoroughly\n2) Prepare STAR method answers (Situation, Task, Action, Result)\n3) Dress professionally\n4) Arrive 10-15 minutes early\n5) Bring printed copies of your CV\n6) Prepare questions about the role\n7) Practice common questions like "Tell me about yourself" and "Why do you want this job?"\n\nWould you like me to help with specific interview questions?';
  }
  if (lower.includes('salary') || lower.includes('pay') || lower.includes('negotiate')) {
    return 'Salary expectations in Ethiopia vary by role and experience level. For mid-level positions in Addis Ababa: Sales/Marketing managers typically earn ETB 15,000-40,000/month, IT professionals ETB 20,000-60,000/month, and administrative roles ETB 8,000-20,000/month. When negotiating, research the market rate, consider benefits beyond base salary, and be prepared to discuss your value with specific achievements.';
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! 👋 I\'m your Career AI assistant. I can help you with: finding jobs, writing cover letters, preparing for interviews, CV improvements, salary negotiation advice, and career planning. What would you like help with today?';
  }
  return `Thank you for your message. As your Career AI assistant, I can help with:\n\n🔍 Job search strategy for Ethiopia\n📄 CV and cover letter writing\n🎯 Interview preparation\n💰 Salary negotiation\n📈 Career development\n\nWhat would you like to focus on?`;
}

/** Handle /start command */
async function handleStart(chatId: number, firstName: string) {
  const welcomeMessage = `👋 Hello <b>${firstName}</b>!

Welcome to <b>Hambisa Executive</b> (@hambi_career_ai_bot) — your AI-powered career assistant!

<b>What I can do:</b>
🎯 <b>Chat</b> — Ask me anything about jobs, CVs, interviews
📄 <b>CV Analysis</b> — Send your CV for AI analysis
✉️ <b>Cover Letter</b> — Generate professional cover letters
🎯 <b>Interview Prep</b> — Practice interview questions
📊 <b>Dashboard</b> — View your career dashboard
🔄 <b>Sync</b> — Sync data to web dashboard

<b>Quick Commands:</b>
/help — Show all commands
/profile — View your profile
/tasks — View your tasks
/jobs — Search for jobs
/sync — Sync to web dashboard
/dashboard — Open web dashboard link

Type any message to start chatting with AI! 🚀`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📊 Dashboard', url: process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app' },
        { text: '🔄 Sync Data', callback_data: 'sync' },
      ],
      [
        { text: '📄 Analyze CV', callback_data: 'analyze_cv' },
        { text: '✉️ Cover Letter', callback_data: 'cover_letter' },
      ],
      [
        { text: '🎯 Interview Prep', callback_data: 'interview_prep' },
        { text: '🔍 Search Jobs', callback_data: 'search_jobs' },
      ],
    ],
  };

  await sendTelegramMessage(chatId, welcomeMessage, { replyMarkup });
}

/** Handle /help command */
async function handleHelp(chatId: number) {
  const helpMessage = `📖 <b>Available Commands:</b>

🎯 <b>General:</b>
/help — Show this help message
/start — Restart / welcome message
/profile — View your profile

📊 <b>Data & Dashboard:</b>
/dashboard — Get web dashboard link
/sync — Sync data to web dashboard
/tasks — View your tasks
/notes — View your notes
/contacts — View contacts
/jobs — Search for jobs

📄 <b>Career Tools:</b>
/analyze_cv — Analyze your CV
/cover_letter — Generate cover letter
/interview_prep — Interview preparation

💡 <b>Tip:</b> Just type any message to chat with AI about jobs, career advice, interview tips, or anything else!`;

  await sendTelegramMessage(chatId, helpMessage);
}

/** Handle /dashboard command */
async function handleDashboard(chatId: number) {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';
  await sendTelegramMessage(chatId, `📊 <b>Career Dashboard</b>\n\nClick below to open your web dashboard:\n\n🔗 <a href="${url}">Open Dashboard</a>`, {
    replyMarkup: {
      inline_keyboard: [[{ text: '📊 Open Dashboard', url }]],
    },
  });
}

/** Handle /sync command */
async function handleSync(chatId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';

  await sendChatAction(chatId, 'typing');

  try {
    const res = await fetch(`${baseUrl}/api/bot/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId: 'telegram-bot',
        botUsers: [{ id: chatId, syncedAt: new Date().toISOString() }],
        botActivities: [{
          command: '/sync',
          action: 'sync',
          botName: '@hambi_career_ai_bot',
          createdAt: new Date().toISOString(),
          status: 'success',
        }],
      }),
    });

    const data = await res.json();
    if (data.success) {
      await sendTelegramMessage(
        chatId,
        `✅ <b>Data synced successfully!</b>\n\n📊 Sync #${data.syncCount}\n🕐 ${new Date().toLocaleTimeString()}\n\n🔗 <a href="${baseUrl}?sync=1">Open Dashboard</a>`,
        {
          replyMarkup: {
            inline_keyboard: [[{ text: '📊 Open Dashboard', url: `${baseUrl}?sync=1` }]],
          },
        }
      );
    } else {
      await sendTelegramMessage(chatId, '❌ Sync failed. Please try again.');
    }
  } catch (err) {
    await sendTelegramMessage(chatId, '❌ Sync failed. Could not reach dashboard server.');
  }
}

/** Handle /profile command */
async function handleProfile(chatId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';

  await sendChatAction(chatId, 'typing');

  try {
    const res = await fetch(`${baseUrl}/api/profile`);
    const data = await res.json();
    if (data.success && data.profile) {
      const p = data.profile;
      const skills = typeof p.skills === 'string'
        ? JSON.parse(p.skills).join(', ')
        : Array.isArray(p.skills) ? p.skills.join(', ') : p.skills;

      await sendTelegramMessage(chatId, `👤 <b>Profile</b>\n\n<b>Name:</b> ${p.fullName || 'N/A'}\n<b>Title:</b> ${p.title || 'N/A'}\n<b>Email:</b> ${p.email || 'N/A'}\n<b>Phone:</b> ${p.phone || 'N/A'}\n<b>Location:</b> ${p.location || 'N/A'}\n\n<b>Summary:</b> ${p.summary || 'N/A'}\n\n<b>Skills:</b> ${skills || 'N/A'}\n<b>CV Score:</b> ${p.cvScore || 'N/A'}/100\n<b>Target Role:</b> ${p.targetRole || 'N/A'}`);
    } else {
      await sendTelegramMessage(chatId, '❓ Profile not found. Please set up your profile first.');
    }
  } catch {
    await sendTelegramMessage(chatId, '❌ Could not fetch profile. Dashboard server may be starting up.');
  }
}

/** Handle /tasks command */
async function handleTasks(chatId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';

  await sendChatAction(chatId, 'typing');

  try {
    const res = await fetch(`${baseUrl}/api/bot/data`);
    const data = await res.json();
    const tasks = data.tasks?.list || [];

    if (tasks.length === 0) {
      await sendTelegramMessage(chatId, '📋 No tasks found. Add tasks from the web dashboard.');
    } else {
      const taskList = tasks.slice(0, 10).map((t: any, i: number) => {
        const status = t.status === 'done' || t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '🔄' : '⬜';
        const priority = (t.priority || '').toUpperCase();
        return `${status} <b>${t.title || t.name || 'Task ' + (i + 1)}</b> ${priority ? `[${priority}]` : ''}`;
      }).join('\n');

      await sendTelegramMessage(chatId, `📋 <b>Tasks (${tasks.length} total)</b>\n\n${taskList}\n${tasks.length > 10 ? `\n...and ${tasks.length - 10} more` : ''}`);
    }
  } catch {
    await sendTelegramMessage(chatId, '❌ Could not fetch tasks.');
  }
}

/** Handle /jobs command */
async function handleJobs(chatId: number) {
  await sendTelegramMessage(chatId, `🔍 <b>Job Search</b>\n\nTo search for jobs, please use the web dashboard:\n\n🔗 <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app'}">Open Dashboard → Search &amp; Apply tab</a>\n\nOr just tell me what kind of job you are looking for and I will help!`);
}

/** Handle general text messages with AI chat (INLINE — no self-call) */
async function handleChatMessage(chatId: number, text: string, firstName: string) {
  await sendChatAction(chatId, 'typing');

  try {
    // Build conversation with system prompt
    const SYSTEM_PROMPT = `You are Career AI Ethiopia — a friendly, knowledgeable AI assistant specializing in the Ethiopian job market and career development. You help Hambisa Bekuma Tefera with:

- Job search strategy for Ethiopian market (EthioJobs, Mekanisa, LinkedIn)
- CV/resume writing and optimization for Ethiopian employers
- Cover letter generation tailored to specific positions
- Interview preparation with STAR method coaching
- Salary negotiation guidance for Ethiopian market rates
- Career coaching and professional development advice
- Sales & Marketing career expertise

Keep responses concise (2-4 paragraphs max for regular chat). Be encouraging and practical. Use Ethiopian context when relevant (Addis Ababa market, local companies, ETB currency). Respond in English unless the user writes in Amharic.`;

    // Get or create conversation for this user (in-memory)
    if (!conversationStore.has(chatId)) {
      conversationStore.set(chatId, [
        { role: 'assistant', content: SYSTEM_PROMPT },
      ]);
    }
    const conversation = conversationStore.get(chatId)!;

    // Add user message
    conversation.push({ role: 'user', content: text });

    // Trim to last 20 messages (keep system prompt)
    if (conversation.length > 21) {
      conversation.splice(1, conversation.length - 21);
    }

    // Generate AI reply inline (no self-call to /api/ai/chat)
    const reply = await generateAIReply(text, conversation);

    // Truncate if too long for Telegram (4096 char limit)
    const truncatedReply = reply.length > 4000
      ? reply.substring(0, 3900) + '\n\n...[truncated]'
      : reply;

    // Save assistant response in conversation history
    conversation.push({ role: 'assistant', content: reply });

    await sendTelegramMessage(chatId, truncatedReply);
  } catch (err) {
    console.error('[Telegram] AI chat error:', err);
    await sendTelegramMessage(chatId, `I received your message but the AI service is currently unavailable. Please try again in a moment. 💬\n\nYour message: "${text.substring(0, 100)}"`);
  }
}

/** Process an incoming Telegram update */
async function processUpdate(update: any) {
  const message = update.message || update.callback_query?.message;

  if (update.callback_query) {
    // Handle callback button presses
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const data = cb.data;

    if (!chatId) return;

    await sendChatAction(chatId, 'typing');

    switch (data) {
      case 'sync':
        await handleSync(chatId);
        break;
      case 'analyze_cv':
        await sendTelegramMessage(chatId, '📄 <b>CV Analysis</b>\n\nPlease send your CV as a text message, or use the web dashboard for file upload:\n\n🔗 <a href="' + (process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app') + '">Open Dashboard → CV Analyzer</a>');
        break;
      case 'cover_letter':
        await sendTelegramMessage(chatId, '✉️ <b>Cover Letter Generator</b>\n\nTell me:\n1. The job title you\'re applying for\n2. The company name\n\nAnd I\'ll generate a professional cover letter for you!');
        break;
      case 'interview_prep':
        await sendTelegramMessage(chatId, '🎯 <b>Interview Preparation</b>\n\nTell me the job title and company, and I\'ll prepare interview questions and tips for you!\n\nOr use the web dashboard for a more detailed prep session.');
        break;
      case 'search_jobs':
        await handleJobs(chatId);
        break;
      default:
        await sendTelegramMessage(chatId, 'Button pressed!');
    }

    // Answer the callback query
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

  if (!message) return;

  const chatId = message.chat?.id;
  const text = message.text || '';
  const firstName = message.from?.first_name || 'User';

  if (!chatId || !text) return;

  console.log(`[Telegram] Message from ${firstName} (${chatId}): ${text.substring(0, 50)}`);

  // Handle commands
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].toLowerCase().split('@')[0];

    switch (command) {
      case '/start':
        await handleStart(chatId, firstName);
        break;
      case '/help':
        await handleHelp(chatId);
        break;
      case '/dashboard':
      case '/web':
      case '/dash':
        await handleDashboard(chatId);
        break;
      case '/sync':
      case '/syncweb':
        await handleSync(chatId);
        break;
      case '/profile':
        await handleProfile(chatId);
        break;
      case '/tasks':
      case '/task':
        await handleTasks(chatId);
        break;
      case '/notes':
        await sendTelegramMessage(chatId, '📝 Notes feature is available on the web dashboard.');
        break;
      case '/contacts':
        await sendTelegramMessage(chatId, '👥 Contacts feature is available on the web dashboard.');
        break;
      case '/jobs':
      case '/job':
        await handleJobs(chatId);
        break;
      case '/analyze_cv':
      case '/cv':
        await sendTelegramMessage(chatId, '📄 <b>CV Analysis</b>\n\nSend me your CV text or use the web dashboard:\n\n🔗 <a href="' + (process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app') + '">Open Dashboard → CV Analyzer</a>');
        break;
      case '/cover_letter':
        await sendTelegramMessage(chatId, '✉️ Tell me the job title and company to generate a cover letter!');
        break;
      case '/interview_prep':
        await sendTelegramMessage(chatId, '🎯 Tell me the job title and company for interview preparation!');
        break;
      default:
        await sendTelegramMessage(chatId, `❓ Unknown command: ${command}\n\nType /help to see available commands.`);
    }
    return;
  }

  // Handle regular text messages as AI chat
  await handleChatMessage(chatId, text, firstName);
}

// ── In-memory conversation store (keyed by chatId) ──
const conversationStore = new Map<number, any[]>();

// ── Webhook endpoint ──
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Verify bot token is configured
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
    if (!token) {
      console.error('[Telegram] BOT_TOKEN not configured');
      return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 500 });
    }

    // CRITICAL: Await processUpdate instead of fire-and-forget.
    // On Vercel serverless, returning 200 immediately causes the function
    // to be frozen/killed, and any background promises never complete.
    // Telegram allows up to 60 seconds for webhook responses.
    await processUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Telegram] Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── GET: Used to set/check webhook ──
export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

  if (!token) {
    return NextResponse.json({
      status: 'error',
      message: 'TELEGRAM_BOT_TOKEN not set. Add it to your .env or Vercel environment variables.',
      instructions: [
        '1. Get your bot token from @BotFather on Telegram',
        '2. Add TELEGRAM_BOT_TOKEN=your_token to .env (local) or Vercel env vars',
        '3. Visit /api/telegram/webhook?set=1 to register the webhook',
      ],
    });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || searchParams.get('set');

  if (action === '1' || action === 'set') {
    // Register webhook with Telegram
    const webhookUrl = searchParams.get('url') ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app'}/api/telegram/webhook`;

    try {
      const res = await fetch(
        `${TELEGRAM_API_BASE}/bot${token}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query'],
            drop_pending_updates: true,
          }),
        }
      );
      const data = await res.json();

      if (data.ok) {
        return NextResponse.json({
          status: 'success',
          message: 'Webhook registered successfully!',
          webhook_url: webhookUrl,
          telegram_response: data,
        });
      } else {
        return NextResponse.json({
          status: 'error',
          message: 'Failed to set webhook',
          telegram_response: data,
        });
      }
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message });
    }
  }

  if (action === 'delete' || action === 'remove') {
    try {
      const res = await fetch(
        `${TELEGRAM_API_BASE}/bot${token}/deleteWebhook`,
        { method: 'POST' }
      );
      const data = await res.json();
      return NextResponse.json({ status: 'deleted', telegram_response: data });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message });
    }
  }

  if (action === 'info') {
    try {
      const res = await fetch(
        `${TELEGRAM_API_BASE}/bot${token}/getWebhookInfo`
      );
      const data = await res.json();
      return NextResponse.json({ status: 'info', webhook: data });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message });
    }
  }

  return NextResponse.json({
    status: 'active',
    message: 'Hambisa Executive (@hambi_career_ai_bot) webhook endpoint is running',
    token_set: true,
    endpoints: {
      setWebhook: '/api/telegram/webhook?set=1',
      deleteWebhook: '/api/telegram/webhook?action=delete',
      webhookInfo: '/api/telegram/webhook?action=info',
    },
  });
}
