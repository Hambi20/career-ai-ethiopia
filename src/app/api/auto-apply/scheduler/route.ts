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

  return NextResponse.json({
    scheduler: 'auto-apply-in-memory',
    interval: '1 hour',
    mode: 'in-memory (Vercel deployment)',
    lastRun: lastRunResult,
    nextRun: nextScheduledRun,
    totalSearchQueries: 16,
    sources: [
      'EthioJobs.net', 'Mekanisa.com', 'Jobs.et', 'AddisJobs.com',
      'JobWebEthiopia.com', 'EthiopianJobs.com', 'EthioCareers.com',
      'CVBankEthiopia.com', 'VacancyEth.com',
      'GeezJob.com', 'HarmeJobs.com', 'EthioVacancy.com',
      'ReporterEthiopia.com', 'ZameJobs.com', 'HiredET.com',
      'NewJobsEthiopia.com', 'LinkedIn', 'RemoteOK', 'WeWorkRemotely',
      'Telegram Groups',
    ],
    storeStatus: {
      totalApplications: store.applications.length,
      pendingReview: store.applications.filter((a: any) => a.status === 'pending_review').length,
      approved: store.applications.filter((a: any) => a.status === 'approved').length,
      submitted: store.applications.filter((a: any) => a.status === 'submitted').length,
      rejected: store.applications.filter((a: any) => a.status === 'rejected').length,
      jobSearchResults: store.jobSearchResults.length,
      lastSync: store.lastSync,
    },
  });
}
