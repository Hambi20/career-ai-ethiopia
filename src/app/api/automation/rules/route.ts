import { NextRequest, NextResponse } from 'next/server';
import { getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, ensureStoreWarmed } from '@/lib/unified-store';

export async function GET() {
  await ensureStoreWarmed();
  const rules = getAutomationRules();
  return NextResponse.json({ success: true, rules });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rule = createAutomationRule(body);
    return NextResponse.json({ success: true, rule });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const rule = updateAutomationRule(id, updates);
    if (!rule) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, rule });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}