import { NextRequest, NextResponse } from 'next/server';
import { syncBotData, getStore } from '@/lib/unified-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const botId = body.botId || body.bot_id || request.headers.get('x-bot-id') || 'default';
    const store = syncBotData(body, botId);
    return NextResponse.json({
      success: true,
      message: 'Bot data synced successfully',
      syncCount: store.syncCount,
      lastSync: store.lastSync,
      stats: {
        tasks: store.tasks.length,
        notes: store.notes.length,
        contacts: store.contacts.length,
        knowledge: store.knowledge.length,
        reports: store.romelReports.length,
        users: store.botUsers.length,
        applications: store.applications.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    success: true,
    lastSync: store.lastSync,
    syncCount: store.syncCount,
    hasData: store.syncCount > 0,
  });
}
