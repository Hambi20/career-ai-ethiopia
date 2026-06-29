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

/** Handle /start command */
async function handleStart(chatId: number, firstName: string) {
  const welcomeMessage = `👋 Hello <b>${firstName}</b>!

Welcome to <b>Career AI Ethiopia</b> — your AI-powered career assistant!

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
          botName: 'Career AI Bot',
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

/** Handle general text messages with AI chat */
async function handleChatMessage(chatId: number, text: string, firstName: string) {
  await sendChatAction(chatId, 'typing');

  try {
    // Use the AI chat API route (which uses z-ai-web-dev-sdk on the server)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://career-ai-ethiopia-svqn.vercel.app';
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        userId: String(chatId),
        userName: firstName,
      }),
    });

    const data = await res.json();
    if (data.success && data.response) {
      // Truncate if too long for Telegram (4096 char limit)
      const response = data.response.length > 4000
        ? data.response.substring(0, 3900) + '\n\n...[truncated]'
        : data.response;

      await sendTelegramMessage(chatId, response);
    } else {
      await sendTelegramMessage(chatId, '🤔 I couldn\'t generate a response right now. Please try again.');
    }
  } catch (err) {
    console.error('[Telegram] AI chat error:', err);
    // Fallback: simple response
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

// ── Webhook endpoint ──
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Verify it's from Telegram (optional but recommended)
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 500 });
    }

    // Process the update asynchronously (don't block the response)
    // Telegram requires a 200 OK within a few seconds
    processUpdate(update).catch(err => {
      console.error('[Telegram] Update processing error:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Telegram] Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── GET: Used to set webhook ──
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
    message: 'Telegram bot webhook endpoint is running',
    endpoints: {
      setWebhook: '/api/telegram/webhook?set=1',
      deleteWebhook: '/api/telegram/webhook?action=delete',
      webhookInfo: '/api/telegram/webhook?action=info',
    },
  });
}
