import { NextRequest, NextResponse } from 'next/server';
import { getStoreAsync } from '@/lib/unified-store';

// Module-level in-memory cache
let reportsCache: any[] = [];

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

    return NextResponse.json({ success: true, reportId: report.id, totalReports: reportsCache.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const company = searchParams.get('company') || '';
    const period = searchParams.get('period') || '';
    const limit = parseInt(searchParams.get('limit') || '100');

    let reports = [...reportsCache];

    // Also pull from unified-store
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
          });
          existingIds.add(r.id);
        }
      }
    } catch { /* silent */ }

    // Filter
    if (type) { const types = type.split(','); reports = reports.filter((r: any) => types.includes(r.type)); }
    if (company) { const cs = company.split(',').map(c => c.toLowerCase()); reports = reports.filter((r: any) => r.company && cs.some(c => r.company!.toLowerCase().includes(c))); }
    if (period) {
      const now = new Date(); const from = new Date();
      if (period === 'daily') from.setDate(now.getDate() - 1);
      else if (period === 'weekly') from.setDate(now.getDate() - 7);
      else if (period === 'monthly') from.setMonth(now.getMonth() - 1);
      reports = reports.filter((r: any) => new Date(r.timestamp) >= from);
    }

    reports.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const types = [...new Set(reports.map((r: any) => r.type))];
    const companies = [...new Set(reports.filter((r: any) => r.company).map((r: any) => r.company))];
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const byType: Record<string, number> = {};
    reports.forEach((r: any) => { byType[r.type] = (byType[r.type] || 0) + 1; });

    return NextResponse.json({
      success: true, total: reports.length,
      filtered: reports.slice(0, limit),
      filters: { types, companies },
      stats: { total: reports.length, today: reports.filter((r: any) => r.date === today).length, thisWeek: reports.filter((r: any) => r.date >= weekAgo).length, byType },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
