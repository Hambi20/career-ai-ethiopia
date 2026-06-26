import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch('http://localhost:3020/api/status?XTransformPort=3020', {
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

export async function POST(request: NextRequest) {
  try {
    const res = await fetch('http://localhost:3020/api/auto-search?XTransformPort=3020', {
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
