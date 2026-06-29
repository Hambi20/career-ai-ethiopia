import { NextResponse } from 'next/server';
import { getTelegramUsers } from '@/lib/unified-store';

export async function GET() {
  const users = getTelegramUsers();
  return NextResponse.json({ success: true, users });
}