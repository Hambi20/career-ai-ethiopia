import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SERVICE_URL = 'http://127.0.0.1:3020';

export async function GET() {
  try {
    const totalApps = await db.application.count();
    const autoApplied = await db.application.count({ where: { status: { in: ['auto-applied', 'applied'] } } });
    const todayApps = await db.application.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    const highMatch = await db.application.count({ where: { matchScore: { gte: 70 } } });
    const recentApps = await db.application.findMany({
      orderBy: { createdAt: 'desc' }, take: 20,
      select: { id: true, jobTitle: true, company: true, location: true, status: true, matchScore: true, source: true, url: true, appliedAt: true, createdAt: true },
    });

    let serviceRunning = false;
    try {
      const res = await fetch(`${SERVICE_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
      serviceRunning = res.ok;
    } catch { /* not running */ }

    return NextResponse.json({ success: true, serviceRunning, stats: { totalApplications: totalApps, autoApplied, todayApplications: todayApps, highMatch }, recentApplications: recentApps });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
