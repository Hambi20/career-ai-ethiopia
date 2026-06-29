import { NextResponse } from 'next/server';
import { getStore, getDashboardStats, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET() {
  try {
    await ensureStoreWarmed();
    const store = getStore();
    const stats = getDashboardStats();

    const recentApps = store.applications.slice(0, 20).map((a: any) => ({
      id: a.id,
      jobTitle: a.jobTitle || a.title,
      company: a.company,
      location: a.location,
      status: a.status,
      matchScore: a.matchScore,
      source: a.source,
      url: a.url,
      appliedAt: a.appliedAt || a.createdAt,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({
      success: true,
      serviceRunning: false,
      stats: {
        totalApplications: stats.totalApplications,
        autoApplied: store.applications.filter((a: any) => a.status === 'auto-applied' || a.status === 'applied').length,
        todayApplications: store.applications.filter((a: any) => {
          const d = a.createdAt || a.appliedAt;
          return d && d.startsWith(new Date().toISOString().slice(0, 10));
        }).length,
        highMatch: store.applications.filter((a: any) => (a.matchScore || 0) >= 70).length,
      },
      recentApplications: recentApps,
    });
  } catch (error) {
    return NextResponse.json({ success: true, stats: { totalApplications: 0, autoApplied: 0, todayApplications: 0, highMatch: 0 }, recentApplications: [] });
  }
}
