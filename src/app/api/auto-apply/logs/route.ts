import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const minScore = searchParams.get('minScore') || '';

    const store = getStore();
    let applications = [...store.applications];

    if (minScore) {
      const scoreThreshold = parseInt(minScore);
      applications = applications.filter((a: any) => (a.matchScore || 0) >= scoreThreshold);
    }

    // Build logs from application notes/history
    const logs = applications.slice(0, limit).map((app: any) => ({
      id: app.id,
      jobTitle: app.jobTitle || app.title,
      company: app.company,
      status: app.status,
      matchScore: app.matchScore || 0,
      source: app.source,
      url: app.url,
      notes: app.notes,
      createdAt: app.createdAt,
      appliedAt: app.appliedAt,
    }));

    return NextResponse.json({
      success: true,
      logs,
      total: applications.length,
      returned: logs.length,
    });
  } catch {
    return NextResponse.json({ success: true, logs: [], message: 'Failed to retrieve logs' });
  }
}
