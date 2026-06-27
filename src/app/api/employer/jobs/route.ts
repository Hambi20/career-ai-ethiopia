import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// Helper to get authenticated user
async function getAuthUser(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return await db.user.findUnique({ where: { id: payload.userId } });
}

// GET - List employer's jobs (or all active jobs for jobseekers)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    if (all || !user || user.role !== 'employer') {
      // Return all active jobs for jobseekers to browse
      const jobs = await db.employerJob.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ success: true, jobs });
    }

    // Employer sees their own jobs
    const jobs = await db.employerJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('Fetch employer jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

// POST - Create a new job posting
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'employer' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Employer access required' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.title || !data.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const job = await db.employerJob.create({
      data: {
        userId: user.id,
        title: data.title,
        company: data.company || user.name || null,
        location: data.location || null,
        type: data.type || null,
        salary: data.salary || null,
        category: data.category || null,
        description: data.description,
        requirements: data.requirements || null,
        deadline: data.deadline || null,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Create employer job error:', error);
    return NextResponse.json({ error: 'Failed to create job posting' }, { status: 500 });
  }
}

// PUT - Update a job
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    // Only allow owner or admin to update
    const existing = await db.employerJob.findFirst({ where: { id: data.id } });
    if (!existing || (existing.userId !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Not authorized to edit this job' }, { status: 403 });
    }

    const job = await db.employerJob.update({
      where: { id: data.id },
      data: {
        title: data.title,
        company: data.company,
        location: data.location,
        type: data.type,
        salary: data.salary,
        category: data.category,
        description: data.description,
        requirements: data.requirements,
        deadline: data.deadline,
        status: data.status,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Update employer job error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

// DELETE - Delete a job
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    const existing = await db.employerJob.findFirst({ where: { id } });
    if (!existing || (existing.userId !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.employerJob.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Delete employer job error:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
