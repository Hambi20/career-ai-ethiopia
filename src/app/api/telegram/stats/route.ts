import { NextResponse } from 'next/server';
import { getTelegramStats } from '@/lib/unified-store';

export async function GET() {
  const stats = getTelegramStats();
  return NextResponse.json({ success: true, stats });
}