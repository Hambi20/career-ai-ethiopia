import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// POST: Reject a pending application
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
        { error: `Cannot reject — current status is "${application.status}"` },
        { status: 400 }
      );
    }

    application.status = 'rejected';
    application.notes = application.notes
      ? application.notes + ' | Rejected: ' + new Date().toISOString()
      : 'Rejected: ' + new Date().toISOString();

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Reject application error:', error);
    return NextResponse.json({ error: 'Failed to reject application' }, { status: 500 });
  }
}