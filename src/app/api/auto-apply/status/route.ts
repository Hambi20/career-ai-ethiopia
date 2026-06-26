import { NextRequest, NextResponse } from 'next/server';

// Server-to-server call: use direct localhost, no XTransformPort needed
const SERVICE_URL = 'http://127.0.0.1:3020';

export async function GET() {
  try {
    const res = await fetch(`${SERVICE_URL}/api/status`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        serviceRunning: false,
        message: 'Auto-apply service is not running',
      });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({
      success: true,
      serviceRunning: false,
      message: 'Auto-apply service is not reachable',
    });
  }
}

export async function POST() {
  try {
    const res = await fetch(`${SERVICE_URL}/api/auto-search`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to trigger auto-search' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({ error: 'Auto-apply service is not reachable' }, { status: 502 });
  }
}
