import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all applications
export async function GET() {
  try {
    const applications = await db.application.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST - Create a new application
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.jobTitle) {
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      );
    }

    const application = await db.application.create({
      data: {
        jobId: data.jobId || null,
        jobTitle: data.jobTitle,
        company: data.company || null,
        location: data.location || null,
        status: data.status || 'preparing',
        url: data.url || null,
        coverLetter: data.coverLetter || null,
        notes: data.notes || null,
        matchScore: data.matchScore || null,
        source: data.source || null,
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Create application error:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}

// PUT - Update application
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const application = await db.application.update({
      where: { id: data.id },
      data: {
        jobTitle: data.jobTitle,
        company: data.company,
        location: data.location,
        status: data.status,
        url: data.url,
        coverLetter: data.coverLetter,
        notes: data.notes,
        matchScore: data.matchScore,
        source: data.source,
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// DELETE - Delete application
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    await db.application.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Delete application error:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}
