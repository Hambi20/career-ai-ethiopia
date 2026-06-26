import { NextRequest, NextResponse } from 'next/server';

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
        message: 'Mini-service offline — use /api/auto-apply/run instead',
      });
    }
    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({
      success: true,
      serviceRunning: false,
      message: 'Mini-service offline — use /api/auto-apply/run instead',
    });
  }
}

export async function POST() {
  // Trigger auto-apply via the new Next.js route (more reliable than mini-service)
  try {
    const res = await fetch('http://127.0.0.1:3000/api/auto-apply/run', {
      signal: AbortSignal.timeout(300000), // 5 min timeout
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json({ error: err.error || 'Failed to trigger auto-search' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: 'Auto-apply failed: ' + String(e).substring(0, 100) }, { status: 502 });
  }
}
