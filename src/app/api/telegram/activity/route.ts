import { NextRequest, NextResponse } from 'next/server';
import { getTelegramActivities } from '@/lib/unified-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '30');
  const activities = getTelegramActivities(limit);
  return NextResponse.json({ success: true, activities });
}