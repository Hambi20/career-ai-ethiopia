import { NextRequest, NextResponse } from 'next/server';
import { getStore, getApplications } from '@/lib/unified-store';

// GET - List all applications
export async function GET() {
  try {
    const applications = getApplications();
    return NextResponse.json({ success: true, applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    return NextResponse.json({ success: true, applications: [] });
  }
}

// POST - Create a new application
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.jobTitle) {
      return NextResponse.json({ success: false, error: 'Job title is required' }, { status: 400 });
    }

    const store = getStore();
    const application = {
      id: Date.now().toString(),
      jobId: data.jobId || null,
      jobTitle: data.jobTitle,
      company: data.company || null,
      location: data.location || null,
      status: data.status || 'pending_review',
      url: data.url || null,
      coverLetter: data.coverLetter || null,
      matchReasoning: data.matchReasoning || null,
      matchScore: data.matchScore || null,
      source: data.source || null,
      createdAt: new Date().toISOString(),
      appliedAt: data.appliedAt || null,
    };
    store.applications.unshift(application);

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Create application error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create application' }, { status: 500 });
  }
}

// PUT - Update application
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
    }

    const store = getStore();
    const idx = store.applications.findIndex((a: any) => a.id === data.id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    store.applications[idx] = { ...store.applications[idx], ...data };
    return NextResponse.json({ success: true, application: store.applications[idx] });
  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
  }
}

// DELETE - Delete application
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
    }

    const store = getStore();
    store.applications = store.applications.filter((a: any) => a.id !== id);
    return NextResponse.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Delete application error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete application' }, { status: 500 });
  }
}
