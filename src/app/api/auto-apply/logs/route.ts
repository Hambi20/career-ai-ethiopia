import { NextRequest, NextResponse } from 'next/server';

// Server-to-server call: use direct localhost, no XTransformPort needed
const SERVICE_URL = 'http://127.0.0.1:3020';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const minScore = searchParams.get('minScore') || '';

    const params = new URLSearchParams();
    params.set('limit', limit);
    if (minScore) params.set('minScore', minScore);

    const res = await fetch(`${SERVICE_URL}/api/logs?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, logs: [], message: 'Service not running' });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({ success: true, logs: [], message: 'Service not reachable' });
  }
}
