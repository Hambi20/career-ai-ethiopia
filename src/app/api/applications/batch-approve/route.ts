import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// POST: Batch approve multiple pending applications
// Body: { ids: string[] }
export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    const store = getStore();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const results: Array<{ id: string; success: boolean; reason?: string }> = [];

    for (const id of ids) {
      try {
        const app = store.applications.find(
          (a: any) => a.id === id || (a._id && a._id === id)
        );

        if (!app || app.status !== 'pending_review') {
          results.push({ id, success: false, reason: app ? 'not pending' : 'not found' });
          continue;
        }

        app.status = 'approved';
        app.appliedAt = new Date().toISOString();
        app.notes = app.notes ? app.notes + ' | Approved: ' + now : 'Approved: ' + now;
        results.push({ id, success: true });
      } catch (e) {
        results.push({ id, success: false, reason: String(e) });
      }
    }

    const approved = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      total: ids.length,
      approved,
      failed: ids.length - approved,
      results,
    });
  } catch (error) {
    console.error('Batch approve error:', error);
    return NextResponse.json({ error: 'Failed to batch approve' }, { status: 500 });
  }
}