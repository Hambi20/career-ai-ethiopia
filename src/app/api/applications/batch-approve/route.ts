import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Batch approve multiple pending applications at once
// Body: { ids: string[] }
export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const results = [];

    for (const id of ids) {
      try {
        const app = await db.application.findUnique({ where: { id } });
        if (!app || app.status !== 'pending_review') {
          results.push({ id, success: false, reason: app ? 'not pending' : 'not found' });
          continue;
        }

        await db.application.update({
          where: { id },
          data: {
            status: 'approved',
            appliedAt: new Date(),
            notes: app.notes ? app.notes + ' | Approved: ' + now : 'Approved: ' + now,
          },
        });
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
