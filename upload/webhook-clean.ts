import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

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
    if (!res.ok) console.error('sendMessage failed:', await res.text());
    return res.ok;
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

function getAIResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! I am your Career AI assistant. How can I help you today?';
  }
  if (lower.includes('cover letter')) {
    return 'I can help with cover letters! Tell me the job title and company name, and I will generate one for you.';
  }
  if (lower.includes('resume') || lower.includes('cv')) {
    return 'For your CV, include: professional summary, skills, work experience, education, and languages. Ethiopian employers value clean formatting.';
  }
  if (lower.includes('interview')) {
    return 'Interview tips: 1) Research the company 2) Use STAR method 3) Dress professionally 4) Arrive early 5) Bring printed CV copies.';
  }
  if (lower.includes('salary') || lower.includes('pay')) {
    return 'Salary in Ethiopia varies by role. Mid-level in Addis: IT 20k-60k ETB/month, Sales/Marketing 15k-40k ETB/month.';
  }
  if (lower.includes('job') || lower.includes('work') || lower.includes('search')) {
    return 'I can help with job search! Use /jobs to find opportunities, or tell me what role you are looking for.';
  }
  return 'Thank you for your message! I can help with:\n- Job search\n- CV writing\n- Cover letters\n- Interview prep\n- Salary advice\n\nWhat would you like help with?';
}

async function handleStart(chatId: number, firstName: string) {
  const welcomeMessage = `Welcome <b>${firstName}</b> to <b>Hambisa Executive</b>!

<b>What I can do:</b>
- Chat with AI about careers
- CV and cover letter help
- Interview preparation
- Job search assistance
- Dashboard access

<b>Commands:</b>
/help - Show all commands
/profile - View profile
/tasks - View tasks
/jobs - Search jobs
/dashboard - Open web dashboard
/sync - Sync data to dashboard

Type any message to chat!`;
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Dashboard', url: process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app' },
        { text: 'Sync Data', callback_data: 'sync' },
      ],
      [
        { text: 'Analyze CV', callback_data: 'analyze_cv' },
        { text: 'Cover Letter', callback_data: 'cover_letter' },
      ],
    ],
  };
  await sendTelegramMessage(chatId, welcomeMessage, { replyMarkup });
}

async function handleHelp(chatId: number) {
  await sendTelegramMessage(chatId, `<b>Commands:</b>\n/start - Welcome\n/help - This help\n/profile - Your profile\n/tasks - View tasks\n/jobs - Search jobs\n/dashboard - Web dashboard\n/sync - Sync data\n\nType any message to chat with AI!`);
}

async function handleDashboard(chatId: number) {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';
  await sendTelegramMessage(chatId, `<b>Dashboard</b>\n<a href="${url}">Open Dashboard</a>`, {
    replyMarkup: { inline_keyboard: [[{ text: 'Open Dashboard', url }]] },
  });
}

async function handleSync(chatId: number) {
  await sendChatAction(chatId, 'typing');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';
  try {
    const res = await fetch(`${baseUrl}/api/bot/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: 'telegram-bot' }),
    });
    const data = await res.json();
    if (data.success) {
      await sendTelegramMessage(chatId, 'Data synced successfully!');
    } else {
      await sendTelegramMessage(chatId, 'Sync failed. Try again later.');
    }
  } catch {
    await sendTelegramMessage(chatId, 'Sync failed. Could not reach server.');
  }
}

async function handleProfile(chatId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';
  await sendChatAction(chatId, 'typing');
  try {
    const res = await fetch(`${baseUrl}/api/profile`);
    const data = await res.json();
    if (data.success && data.profile) {
      const p = data.profile;
      await sendTelegramMessage(chatId, `<b>Profile</b>\nName: ${p.fullName || 'N/A'}\nTitle: ${p.title || 'N/A'}\nEmail: ${p.email || 'N/A'}`);
    } else {
      await sendTelegramMessage(chatId, 'Profile not found. Set up from web dashboard.');
    }
  } catch {
    await sendTelegramMessage(chatId, 'Could not fetch profile.');
  }
}

async function handleJobs(chatId: number) {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';
  await sendTelegramMessage(chatId, `<b>Job Search</b>\nUse the web dashboard:\n<a href="${url}">Open Dashboard</a>`);
}

async function handleChat(chatId: number, text: string) {
  await sendChatAction(chatId, 'typing');
  const reply = getAIResponse(text);
  await sendTelegramMessage(chatId, reply);
}

async function processUpdate(update: any) {
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    if (!chatId) return;
    await sendChatAction(chatId, 'typing');
    switch (cb.data) {
      case 'sync': await handleSync(chatId); break;
      case 'analyze_cv':
        await sendTelegramMessage(chatId, 'Send your CV text or use the web dashboard.');
        break;
      case 'cover_letter':
        await sendTelegramMessage(chatId, 'Tell me the job title and company for a cover letter!');
        break;
      default: await sendTelegramMessage(chatId, 'Button pressed!');
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

  const message = update.message;
  if (!message) return;
  const chatId = message.chat?.id;
  const text = message.text || '';
  const firstName = message.from?.first_name || 'User';
  if (!chatId || !text) return;

  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase().split('@')[0];
    switch (cmd) {
      case '/start': await handleStart(chatId, firstName); break;
      case '/help': await handleHelp(chatId); break;
      case '/dashboard': case '/web': case '/dash': await handleDashboard(chatId); break;
      case '/sync': await handleSync(chatId); break;
      case '/profile': await handleProfile(chatId); break;
      case '/jobs': case '/job': await handleJobs(chatId); break;
      case '/tasks': case '/task':
        await sendTelegramMessage(chatId, 'Use web dashboard to view tasks.');
        break;
      default:
        await sendTelegramMessage(chatId, `Unknown command: ${cmd}\nType /help for commands.`);
    }
    return;
  }

  await handleChat(chatId, text);
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
      return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 500 });
    }
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
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app'}/api/telegram/webhook`;
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
    message: 'Hambisa Executive webhook running',
    endpoints: {
      set: '/api/telegram/webhook?set=1',
      delete: '/api/telegram/webhook?action=delete',
      info: '/api/telegram/webhook?action=info',
    },
  });
}
