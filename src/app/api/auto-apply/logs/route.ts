import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const minScore = searchParams.get('minScore') || '';

    const params = new URLSearchParams();
    params.set('limit', limit);
    if (minScore) params.set('minScore', minScore);

    const res = await fetch(`http://localhost:3020/api/logs?XTransformPort=3020&${params.toString()}`, {
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
