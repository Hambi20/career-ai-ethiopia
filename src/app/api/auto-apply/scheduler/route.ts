import { NextResponse } from 'next/server';

/**
 * Auto-search scheduler status endpoint.
 *
 * The auto-apply mini-service (port 3020) runs searches every 1 hour.
 * This endpoint reports the scheduler status and last run info.
 */

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
  // Check mini-service status
  let serviceStatus = null;
  try {
    const res = await fetch('http://127.0.0.1:3020/api/status', {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      serviceStatus = await res.json();
    }
  } catch {
    // Mini-service not running
  }

  return NextResponse.json({
    scheduler: 'auto-apply-service',
    interval: '1 hour',
    lastRun: lastRunResult,
    nextRun: nextScheduledRun,
    serviceStatus,
    totalSearchQueries: 42,
    sources: [
      'EthioJobs.net', 'Mekanisa.com', 'Jobs.et', 'AddisJobs.com',
      'JobWebEthiopia.com', 'EthiopianJobs.com', 'EthioCareers.com',
      'CVBankEthiopia.com', 'VacancyEth.com',
      'GeezJob.com', 'HarmeJobs.com', 'EthioVacancy.com',
      'ReporterEthiopia.com',
      'ZameJobs.com', 'HiredET.com', 'NewJobsEthiopia.com',
      'LinkedIn', 'RemoteOK', 'WeWorkRemotely',
      'Telegram Groups',
    ],
  });
}
