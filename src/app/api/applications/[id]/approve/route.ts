import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Approve a pending application — marks as "approved" with timestamp
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const application = await db.application.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Cannot approve — current status is "${application.status}"` },
        { status: 400 }
      );
    }

    const updated = await db.application.update({
      where: { id },
      data: {
        status: 'approved',
        appliedAt: new Date(),
        notes: application.notes
          ? application.notes + ' | Approved: ' + new Date().toISOString()
          : 'Approved: ' + new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error('Approve application error:', error);
    return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}
