import { NextResponse } from 'next/server';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'No bot token' }, { status: 500 });
  }

  try {
    // Remove the Mini App menu button, replace with default commands menu
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_button: { type: 'commands' } }),
    });

    const data = await res.json();
    console.log('setChatMenuButton response:', JSON.stringify(data));

    if (data.ok) {
      return NextResponse.json({ success: true, message: 'Menu button removed. User can now type freely.' });
    } else {
      return NextResponse.json({ error: data.description || 'Failed' }, { status: 400 });
    }
  } catch (err) {
    console.error('Menu button error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
