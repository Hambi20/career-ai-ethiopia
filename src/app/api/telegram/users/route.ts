import { NextResponse } from 'next/server';
import { getTelegramUsers, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET() {
  await ensureStoreWarmed();
  const users = getTelegramUsers();
  return NextResponse.json({ success: true, users });
}
