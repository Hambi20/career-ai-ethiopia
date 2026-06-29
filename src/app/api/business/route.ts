import { NextRequest, NextResponse } from 'next/server';
import { getBusinesses, createBusiness } from '@/lib/unified-store';

export async function GET() {
  const businesses = getBusinesses();
  return NextResponse.json({ success: true, businesses });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const business = createBusiness(body);
    return NextResponse.json({ success: true, business });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}