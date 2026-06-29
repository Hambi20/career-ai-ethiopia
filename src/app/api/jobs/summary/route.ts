import { NextRequest, NextResponse } from 'next/server';
import { getJobSummary, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET(request: NextRequest) {
  await ensureStoreWarmed();
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  const summary = getJobSummary(hours);
  return NextResponse.json({ success: true, data: summary, summary });
}
