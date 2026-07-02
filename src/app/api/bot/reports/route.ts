import { NextRequest, NextResponse } from 'next/server';
import { getStoreAsync } from '@/lib/unified-store';
import { promises as fs } from 'fs';
import path from 'path';

// Module-level in-memory cache
let reportsCache: any[] = [];

const DATA_FILE = path.join(process.cwd(), 'public', 'bot-data.json');

async function readPersistedData(): Promise<any> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { syncCount: 0, allReports: [] };
  }
}

async function writeReportToPersistedFile(report: any): Promise<void> {
  try {
    const data = await readPersistedData();
    if (!data.allReports) data.allReports = [];
    // Deduplicate
    if (!data.allReports.find((r: any) => r.id === report.id)) {
      data.allReports.unshift(report);
      if (data.allReports.length > 500) data.allReports.length = 500;
    }
    // Also add to type-specific arrays
    if (report.type === 'romel' || report.type === 'sales' || report.type === 'target') {
      if (!data.romelReports) data.romelReports = [];
      if (!data.romelReports.find((r: any) => r.id === report.id)) {
        data.romelReports.unshift(report);
        if (data.romelReports.length > 200) data.romelReports.length = 200;
      }
    } else if (report.type === 'vd') {
      if (!data.vdReports) data.vdReports = [];
      if (!data.vdReports.find((r: any) => r.id === report.id)) {
        data.vdReports.unshift(report);
        if (data.vdReports.length > 200) data.vdReports.length = 200;
      }
    }
    data.syncCount = (data.syncCount || 0) + 1;
    data.lastSync = new Date().toISOString();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[writeReportToPersistedFile]', (err as any)?.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report = {
      id: body.id || `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: body.type || 'general',
      company: body.company || '',
      category: body.category || body.type || 'general',
      title: body.title || 'Untitled Report',
      content: body.content || '',
      summary: body.summary || '',
      chatId: body.chatId || 0,
      firstName: body.firstName || '',
      date: body.date || new Date().toISOString().split('T')[0],
      timestamp: body.timestamp || new Date().toISOString(),
    };

    reportsCache.unshift(report);
    if (reportsCache.length > 500) reportsCache.length = 500;

    // Bridge to unified-store
    try {
      const store = await getStoreAsync();
      const item = {
        id: report.id, title: report.title, report: report.content,
        details: report.content, info: report.content,
        date: report.date, createdAt: report.timestamp,
        timestamp: report.timestamp, type: report.type,
        company: report.company, category: report.category,
        summary: report.summary,
      };
      if (report.type === 'romel' || report.type === 'sales') {
        store.romelReports.unshift(item);
        if (store.romelReports.length > 200) store.romelReports.length = 200;
      } else if (report.type === 'vd') {
        store.vdReports.unshift(item);
        if (store.vdReports.length > 200) store.vdReports.length = 200;
      }
      store.applications.unshift(item);
      if (store.applications.length > 300) store.applications.length = 300;
    } catch { /* silent */ }

    // Persist to bot-data.json
    await writeReportToPersistedFile(report);

    return NextResponse.json({ success: true, reportId: report.id, totalReports: reportsCache.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function fetchFromDatabase(): Promise<any[]> {
  try {
    const { db } = await import('@/lib/db');
    const result = await db.$queryRawUnsafe(
      `SELECT * FROM "BotReport" ORDER BY "createdAt" DESC LIMIT 500`
    );
    return (result as any[]).map((r: any) => ({
      id: r.id,
      type: r.type || 'general',
      company: r.company || '',
      category: r.category || r.type || 'general',
      title: r.title || 'Untitled Report',
      content: r.content || '',
      summary: r.summary || '',
      chatId: r.chatId || 0,
      firstName: r.firstName || '',
      date: r.date || r.createdAt?.split('T')[0] || '',
      timestamp: r.timestamp || r.createdAt || '',
    }));
  } catch (err) {
    console.error('[fetchFromDatabase]', (err as any)?.message);
    return [];
  }
}

function getPeriodRange(period: string, refDate?: string): { from: Date; to: Date } | null {
  const now = refDate ? new Date(refDate) : new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  switch (period) {
    case 'daily':
    case 'today': {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'yesterday': {
      const from = new Date(now);
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      const yTo = new Date(from);
      yTo.setHours(23, 59, 59, 999);
      return { from, to: yTo };
    }
    case 'week':
    case 'thisweek': {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'lastweek': {
      const from = new Date(now);
      from.setDate(from.getDate() - 14);
      from.setHours(0, 0, 0, 0);
      const lTo = new Date(now);
      lTo.setDate(lTo.getDate() - 7);
      lTo.setHours(23, 59, 59, 999);
      return { from, to: lTo };
    }
    case 'month':
    case 'thismonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
    case 'lastmonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmTo = new Date(now.getFullYear(), now.getMonth(), 0);
      lmTo.setHours(23, 59, 59, 999);
      return { from, to: lmTo };
    }
    case 'quarter':
    case 'thisquarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), qMonth, 1);
      return { from, to };
    }
    case 'lastquarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
      const from = new Date(now.getFullYear(), qMonth, 1);
      const lqTo = new Date(now.getFullYear(), qMonth + 3, 0);
      lqTo.setHours(23, 59, 59, 999);
      return { from, to: lqTo };
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const company = searchParams.get('company') || '';
    const period = searchParams.get('period') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const includeStats = searchParams.get('stats') !== 'false';

    // Step 1: Collect from all sources
    let reports: any[] = [...reportsCache];

    // Pull from unified-store
    try {
      const store = await getStoreAsync();
      const existingIds = new Set(reports.map((r: any) => r.id));
      for (const r of store.romelReports) {
        if (!existingIds.has(r.id)) {
          reports.push({
            id: r.id || `romel_${Date.now()}`,
            type: 'romel', company: r.company || 'Romel', category: 'romel',
            title: r.title || r.date || 'Romel Report',
            content: r.report || r.content || r.details || JSON.stringify(r),
            date: r.date || r.createdAt?.split('T')[0] || '',
            timestamp: r.timestamp || r.createdAt || '',
            summary: r.summary || '',
          });
          existingIds.add(r.id);
        }
      }
      for (const r of store.vdReports) {
        if (!existingIds.has(r.id)) {
          reports.push({
            id: r.id || `vd_${Date.now()}`,
            type: 'vd', company: r.company || 'Olbright College', category: 'college',
            title: r.title || r.date || 'Vice Dean Report',
            content: r.report || r.content || r.details || JSON.stringify(r),
            date: r.date || r.createdAt?.split('T')[0] || '',
            timestamp: r.timestamp || r.createdAt || '',
            summary: r.summary || '',
          });
          existingIds.add(r.id);
        }
      }
    } catch { /* silent */ }

    // Pull from persisted bot-data.json file (survives serverless cold starts)
    try {
      const persisted = await readPersistedData();
      const existingIds = new Set(reports.map((r: any) => r.id));
      const allReports: any[] = persisted.allReports || [];
      for (const r of allReports) {
        if (r.id && !existingIds.has(r.id)) {
          reports.push({
            id: r.id,
            type: r.type || 'general',
            company: r.company || '',
            category: r.category || r.type || 'general',
            title: r.title || 'Untitled Report',
            content: r.content || '',
            summary: r.summary || '',
            chatId: r.chatId || 0,
            firstName: r.firstName || '',
            date: r.date || '',
            timestamp: r.timestamp || r.createdAt || '',
          });
          existingIds.add(r.id);
        }
      }
    } catch { /* silent */ }

    // Pull from database (persistent - local SQLite)
    const dbReports = await fetchFromDatabase();
    const existingIds = new Set(reports.map((r: any) => r.id));
    for (const r of dbReports) {
      if (!existingIds.has(r.id)) {
        reports.push(r);
        existingIds.add(r.id);
      }
    }

    // Step 2: Deduplicate by id
    const deduped = new Map<string, any>();
    for (const r of reports) {
      if (r.id && !deduped.has(r.id)) deduped.set(r.id, r);
    }
    reports = Array.from(deduped.values());

    // Step 3: Filter by type
    if (type) {
      const types = type.split(',').map(t => t.trim());
      reports = reports.filter((r: any) => types.includes(r.type));
    }

    // Step 4: Filter by company
    if (company) {
      const cs = company.split(',').map(c => c.toLowerCase().trim());
      reports = reports.filter((r: any) => r.company && cs.some(c => r.company!.toLowerCase().includes(c)));
    }

    // Step 5: Filter by date range (period or explicit from/to)
    let dateLabel = 'All time';
    if (period) {
      const range = getPeriodRange(period);
      if (range) {
        reports = reports.filter((r: any) => {
          const d = new Date(r.timestamp || r.date);
          return d >= range.from && d <= range.to;
        });
        dateLabel = period.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      }
    } else if (from || to) {
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        reports = reports.filter((r: any) => new Date(r.timestamp || r.date) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        reports = reports.filter((r: any) => new Date(r.timestamp || r.date) <= toDate);
      }
      if (from && to) dateLabel = `${from} to ${to}`;
      else if (from) dateLabel = `From ${from}`;
      else dateLabel = `Until ${to}`;
    }

    // Sort by timestamp descending
    reports.sort((a: any, b: any) => {
      const ta = new Date(a.timestamp || a.date || 0).getTime();
      const tb = new Date(b.timestamp || b.date || 0).getTime();
      return tb - ta;
    });

    // Step 6: Compute stats
    let stats = null;
    if (includeStats) {
      const types = [...new Set(reports.map((r: any) => r.type))];
      const companies = [...new Set(reports.filter((r: any) => r.company).map((r: any) => r.company))];
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const byType: Record<string, number> = {};
      reports.forEach((r: any) => { byType[r.type] = (byType[r.type] || 0) + 1; });

      // Compute date range of filtered reports
      const dates = reports.filter((r: any) => r.date).map((r: any) => r.date).sort();
      const dateRange = dates.length > 0 ? `${dates[0]} → ${dates[dates.length - 1]}` : 'No dates';

      stats = {
        total: reports.length,
        today: reports.filter((r: any) => r.date === today).length,
        thisWeek: reports.filter((r: any) => r.date >= weekAgo).length,
        thisMonth: reports.filter((r: any) => r.date >= monthAgo).length,
        byType,
        dateRange,
        dateLabel,
      };
    }

    return NextResponse.json({
      success: true,
      total: reports.length,
      filtered: reports.slice(0, limit),
      filters: { types: stats ? Object.keys(stats.byType) : [], companies: [] },
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
