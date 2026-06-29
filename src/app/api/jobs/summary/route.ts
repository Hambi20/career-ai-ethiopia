import { NextRequest, NextResponse } from 'next/server';
import { getJobSummary } from '@/lib/unified-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  const summary = getJobSummary(hours);
  return NextResponse.json({ success: true, data: summary, summary });
}