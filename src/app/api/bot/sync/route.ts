import { NextRequest, NextResponse } from 'next/server';
import { syncBotData, getStore } from '@/lib/unified-store';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const botId = body.botId || body.bot_id || request.headers.get('x-bot-id') || 'default';
    const store = syncBotData(body, botId);

    // Persist data to public/bot-data.json for cold-start fallback
    try {
      const dataFile = path.join(process.cwd(), 'public', 'bot-data.json');
      const persistData = {
        version: 1,
        lastSync: store.lastSync,
        syncCount: store.syncCount,
        profile: store.rawSyncData?.profile || null,
        tasks: store.tasks,
        notes: store.notes,
        contacts: store.contacts,
        knowledge: store.knowledge,
        romelReports: store.romelReports,
        vdReports: store.vdReports,
        salesSummary: store.salesSummary,
        jobSearchResults: store.jobSearchResults,
        bots: store.bots,
        botUsers: store.botUsers,
        botActivities: store.botActivities,
        applications: store.applications,
        automationRules: store.automationRules,
        businesses: store.businesses,
        messages: store.messages,
        dailyPlans: store.dailyPlans,
      };
      await fs.writeFile(dataFile, JSON.stringify(persistData, null, 2));
    } catch (writeErr) {
      // On Vercel read-only, this may fail — that's OK, in-memory still works
      console.log('File write skipped (read-only filesystem):', writeErr);
    }

    // Return ALL data so the bot/frontend can cache it client-side
    return NextResponse.json({
      success: true,
      message: 'Bot data synced successfully',
      syncCount: store.syncCount,
      lastSync: store.lastSync,
      hasData: true,
      stats: {
        tasks: store.tasks.length,
        notes: store.notes.length,
        contacts: store.contacts.length,
        knowledge: store.knowledge.length,
        reports: store.romelReports.length,
        users: store.botUsers.length,
        applications: store.applications.length,
      },
      // Full data payload for client-side caching
      data: {
        tasks: store.tasks,
        notes: store.notes,
        contacts: store.contacts,
        knowledge: store.knowledge,
        romelReports: store.romelReports,
        vdReports: store.vdReports,
        salesSummary: store.salesSummary,
        jobSearchResults: store.jobSearchResults,
        bots: store.bots,
        botUsers: store.botUsers,
        botActivities: store.botActivities,
        applications: store.applications,
        automationRules: store.automationRules,
        businesses: store.businesses,
        messages: store.messages,
        dailyPlans: store.dailyPlans,
        profile: store.rawSyncData?.profile || null,
        rawSyncData: store.rawSyncData,
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
