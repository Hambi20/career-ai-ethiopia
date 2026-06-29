import { NextResponse } from 'next/server';
import { getCrmStats } from '@/lib/unified-store';

export async function GET() {
  const stats = getCrmStats();
  return NextResponse.json({ success: true, stats });
}