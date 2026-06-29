import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

export async function GET() {
  try {
    const store = getStore();
    const today = new Date().toISOString().slice(0, 10);

    const applications = store.applications;
    const botUsers = store.botUsers;

    const totalUsers = botUsers.length || 1;
    const employers = botUsers.filter((u: any) => u.role === 'employer' || u.type === 'employer').length;
    const jobSeekers = botUsers.filter((u: any) => u.role === 'jobseeker' || u.type === 'jobseeker').length;
    const premiumUsers = botUsers.filter((u: any) => u.isPremium || u.premium).length;

    const activeToday = botUsers.filter((u: any) => {
      const d = u.lastLogin || u.lastSeen || u.createdAt;
      return d && d.startsWith(today);
    }).length;

    const newThisWeek = botUsers.filter((u: any) => {
      const d = u.createdAt;
      if (!d) return false;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return d >= weekAgo;
    }).length;

    const pendingCount = applications.filter((a: any) => a.status === 'pending_review').length;
    const approvedCount = applications.filter((a: any) => a.status === 'approved').length;
    const submittedCount = applications.filter((a: any) => a.status === 'submitted').length;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalEmployers: employers,
        totalPremium: premiumUsers,
        totalJobSeekers: jobSeekers,
        totalApplications: applications.length,
        totalEmployerJobs: store.jobSearchResults.length,
        totalSavedJobs: applications.filter((a: any) => a.bookmarked).length,
        activeToday,
        newThisWeek,
        searchesToday: 0,
        pendingApplications: pendingCount,
        approvedApplications: approvedCount,
        submittedApplications: submittedCount,
      },
      recentUsers: botUsers.slice(0, 10).map((u: any) => ({
        id: u.id || u._id,
        email: u.email || '',
        name: u.name || u.firstName || '',
        role: u.role || 'jobseeker',
        tier: u.tier || 'free',
        createdAt: u.createdAt,
        lastLogin: u.lastLogin || u.lastSeen,
      })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to load admin stats' }, { status: 500 });
  }
}