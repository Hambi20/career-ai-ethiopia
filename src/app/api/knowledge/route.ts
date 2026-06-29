import { NextRequest, NextResponse } from 'next/server';
import { getKnowledge, createKnowledge, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET() {
  await ensureStoreWarmed();
  const items = getKnowledge();
  return NextResponse.json({ success: true, items, knowledge: items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = createKnowledge(body);
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
