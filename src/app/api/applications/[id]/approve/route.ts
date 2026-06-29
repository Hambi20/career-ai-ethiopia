import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// POST: Approve a pending application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();

    const application = store.applications.find(
      (a: any) => a.id === id || (a._id && a._id === id)
    );

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Cannot approve — current status is "${application.status}"` },
        { status: 400 }
      );
    }

    application.status = 'approved';
    application.appliedAt = new Date().toISOString();
    application.notes = application.notes
      ? application.notes + ' | Approved: ' + new Date().toISOString()
      : 'Approved: ' + new Date().toISOString();

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Approve application error:', error);
    return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}