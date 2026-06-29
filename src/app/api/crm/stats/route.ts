import { NextResponse } from 'next/server';
import { getCrmStats, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET() {
  await ensureStoreWarmed();
  const stats = getCrmStats();
  return NextResponse.json({ success: true, stats });
}
