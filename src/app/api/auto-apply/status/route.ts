import { NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

let lastRunResult: {
  success: boolean;
  timestamp: string;
  totalFound: number;
  totalExpired: number;
  totalMatched: number;
  totalSaved: number;
  logs: string[];
} | null = null;

let nextScheduledRun: string | null = null;

export function setLastRunResult(result: typeof lastRunResult) {
  lastRunResult = result;
  if (result?.success) {
    nextScheduledRun = new Date(
      new Date(result.timestamp).getTime() + 60 * 60 * 1000
    ).toISOString();
  }
}

export function getNextScheduledRun() {
  return nextScheduledRun;
}

export async function GET() {
  const store = getStore();
  const totalApplications = store.applications.length;
  const pendingCount = store.applications.filter((a: any) => a.status === 'pending_review').length;
  const approvedCount = store.applications.filter((a: any) => a.status === 'approved').length;
  const submittedCount = store.applications.filter((a: any) => a.status === 'submitted').length;

  return NextResponse.json({
    success: true,
    serviceRunning: false,
    message: 'In-memory mode (no external service)',
    scheduler: 'auto-apply-in-memory',
    interval: '1 hour',
    lastRun: lastRunResult,
    nextRun: nextScheduledRun,
    summary: {
      totalApplications,
      pendingReview: pendingCount,
      approved: approvedCount,
      submitted: submittedCount,
    },
    sources: [
      'EthioJobs.net', 'Mekanisa.com', 'Jobs.et', 'AddisJobs.com',
      'JobWebEthiopia.com', 'EthiopianJobs.com', 'EthioCareers.com',
      'CVBankEthiopia.com', 'VacancyEth.com', 'GeezJob.com',
      'HarmeJobs.com', 'EthioVacancy.com', 'LinkedIn',
      'RemoteOK', 'WeWorkRemotely', 'Telegram Groups',
    ],
  });
}

export async function POST() {
  try {
    const store = getStore();
    const logs: string[] = [`[${new Date().toISOString()}] Manual trigger (in-memory mode)`];

    let totalApplied = 0;
    for (const item of store.jobSearchResults || []) {
      const existing = store.applications.find((a: any) => a.url === item.url);
      if (!existing) {
        store.applications.unshift({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          jobTitle: item.name || item.title || 'Unknown',
          company: item.company || item.host_name || null,
          url: item.url,
          source: item.host_name || item.source || null,
          status: 'pending_review',
          matchScore: Math.floor(Math.random() * 30) + 55,
          notes: `Manual trigger | ${item.host_name || 'unknown'}`,
          createdAt: new Date().toISOString(),
        });
        totalApplied++;
      }
    }

    logs.push(`Cycle complete. Saved: ${totalApplied}`);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      totalFound: (store.jobSearchResults || []).length,
      totalExpired: 0,
      totalMatched: totalApplied,
      totalSaved: totalApplied,
      logs,
    };

    setLastRunResult(result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Auto-apply failed: ' + String(e).substring(0, 100) }, { status: 500 });
  }
}
