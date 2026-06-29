import { NextResponse } from 'next/server';
import { getTelegramStats, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET() {
  await ensureStoreWarmed();
  const stats = getTelegramStats();
  return NextResponse.json({ success: true, stats });
}
