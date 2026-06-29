import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact } from '@/lib/unified-store';

export async function GET() {
  const contacts = getContacts();
  return NextResponse.json({ success: true, contacts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contact = createContact(body);
    return NextResponse.json({ success: true, contact });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}