import { NextRequest, NextResponse } from 'next/server';
import { getStore, getTasks, getNotes, getContacts, getKnowledge, getTelegramStats, getTelegramActivities, getDashboardStats } from '@/lib/unified-store';

export async function GET(request: NextRequest) {
  const store = getStore();
  const tasks = getTasks();
  const notes = getNotes();
  const contacts = getContacts();
  const knowledge = getKnowledge();

  const hasData = tasks.length > 0 || notes.length > 0 || contacts.length > 0 ||
    knowledge.length > 0 || store.romelReports.length > 0 || store.botUsers.length > 0;

  // Task breakdown
  const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const byStatus: Record<string, number> = { todo: 0, in_progress: 0, done: 0, cancelled: 0 };
  for (const t of tasks) {
    const p = (t.priority || '').toLowerCase();
    if (p in byPriority) byPriority[p]++;
    const s = (t.status || '').toLowerCase().replace(/-/g, '_');
    if (s in byStatus) byStatus[s]++;
  }

  // Contact breakdown
  const contactBreakdown: Record<string, number> = {};
  for (const c of contacts) {
    const type = c.type || 'other';
    contactBreakdown[type] = (contactBreakdown[type] || 0) + 1;
  }

  // Sales summary from latest romel report
  const latestReport = store.romelReports.length > 0 ? store.romelReports[0] : null;
  const salesSummary = store.salesSummary || latestReport || {};

  // Stats
  const done = tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length;
  const todo = tasks.filter((t: any) => t.status === 'todo' || t.status === 'pending').length;
  const inProgress = tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'in-progress').length;

  const data = {
    success: true,
    hasData,
    source: 'unified-store',
    updatedAt: store.lastSync,
    syncCount: store.syncCount,
    summary: {
      totalRomelReports: store.romelReports.length,
      totalVdReports: store.vdReports.length,
      totalTasks: tasks.length,
      tasksDone: done,
      tasksTodo: todo,
      tasksInProgress: inProgress,
      taskCompletionRate: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      totalNotes: notes.length,
      totalContacts: contacts.length,
      totalKnowledge: knowledge.length,
      dailyAchievementRate: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      lastSync: store.lastSync,
      totalSyncs: store.syncCount,
    },
    sales: {
      summary: salesSummary,
      totalDailyTarget: salesSummary?.dailyTarget || salesSummary?.target || 0,
      totalDailyActual: salesSummary?.actualSales || salesSummary?.actual || 0,
      latestReport,
      reports: store.romelReports,
    },
    tasks: {
      list: tasks,
      byPriority,
      byStatus,
    },
    notes,
    contacts: {
      list: contacts,
      breakdown: contactBreakdown,
    },
    knowledgeBase: knowledge,
    vdReports: store.vdReports,
    syncLogs: [],
    recentActivities: getTelegramActivities(20),
    rawSyncData: {
      ...(store.rawSyncData || {}),
      businesses: (store.rawSyncData?.businesses || store.businesses || []),
    },
  };

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { syncBotData } = await import('@/lib/unified-store');
    const store = syncBotData(body, body.botId);
    return NextResponse.json({ success: true, message: 'Data synced', syncCount: store.syncCount });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
