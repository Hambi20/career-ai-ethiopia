import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// In-memory employer jobs stored in the unified store
const employerJobs: any[] = [];

// GET - List employer's jobs (or all active jobs for jobseekers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    if (all) {
      const activeJobs = employerJobs.filter((j: any) => j.status === 'active');
      return NextResponse.json({ success: true, jobs: activeJobs.slice(0, 50) });
    }

    return NextResponse.json({ success: true, jobs: employerJobs });
  } catch (error) {
    console.error('Fetch employer jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

// POST - Create a new job posting
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.title || !data.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const job = {
      id: Date.now().toString(),
      title: data.title,
      company: data.company || null,
      location: data.location || null,
      type: data.type || null,
      salary: data.salary || null,
      category: data.category || null,
      description: data.description,
      requirements: data.requirements || null,
      deadline: data.deadline || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    employerJobs.unshift(job);

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Create employer job error:', error);
    return NextResponse.json({ error: 'Failed to create job posting' }, { status: 500 });
  }
}

// PUT - Update a job
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    const idx = employerJobs.findIndex((j: any) => j.id === data.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    employerJobs[idx] = {
      ...employerJobs[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, job: employerJobs[idx] });
  } catch (error) {
    console.error('Update employer job error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

// DELETE - Delete a job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    const idx = employerJobs.findIndex((j: any) => j.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    employerJobs.splice(idx, 1);
    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Delete employer job error:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
