import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [
      totalUsers,
      totalEmployers,
      totalPremium,
      totalJobSeekers,
      totalApplications,
      totalEmployerJobs,
      totalSavedJobs,
      activeToday,
      newThisWeek,
      searchesToday,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'employer' } }),
      db.user.count({ where: { tier: 'premium' } }),
      db.user.count({ where: { role: 'jobseeker' } }),
      db.application.count(),
      db.employerJob.count({ where: { status: 'active' } }),
      db.savedJob.count(),
      db.user.count({
        where: { lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      db.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      db.usageLog.count({
        where: {
          action: 'search',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // Recent users
    const recentUsers = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, email: true, name: true, role: true, tier: true, createdAt: true, lastLogin: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers, totalEmployers, totalPremium, totalJobSeekers,
        totalApplications, totalEmployerJobs, totalSavedJobs,
        activeToday, newThisWeek, searchesToday,
      },
      recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to load admin stats' }, { status: 500 });
  }
}
