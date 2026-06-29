import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// GET - List all saved/bookmarked jobs
export async function GET() {
  try {
    const store = getStore();
    const jobs = store.applications.filter((a: any) => a.bookmarked || a.saved);
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('Fetch saved jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved jobs' },
      { status: 500 }
    );
  }
}

// POST - Save/bookmark a job
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const store = getStore();

    if (!data.url || !data.title) {
      return NextResponse.json(
        { error: 'Job URL and title are required' },
        { status: 400 }
      );
    }

    // Check if already saved
    const existing = store.applications.find(
      (a: any) => (a.id === data.url || a.url === data.url) && (a.bookmarked || a.saved)
    );

    if (existing) {
      return NextResponse.json({ success: true, job: existing, message: 'Job already saved' });
    }

    const job = {
      id: data.url,
      title: data.title,
      company: data.company || null,
      location: data.location || null,
      type: data.type || null,
      salary: data.salary || null,
      description: data.description || null,
      url: data.url,
      source: data.source || null,
      postedDate: data.postedDate || null,
      deadline: data.deadline || null,
      category: data.category || null,
      bookmarked: true,
      saved: true,
      createdAt: new Date().toISOString(),
    };

    store.applications.unshift(job);

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Save job error:', error);
    return NextResponse.json(
      { error: 'Failed to save job' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a bookmarked job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const store = getStore();

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const idx = store.applications.findIndex(
      (a: any) => (a.id === id || a.url === id) && (a.bookmarked || a.saved)
    );

    if (idx >= 0) {
      store.applications.splice(idx, 1);
    }

    return NextResponse.json({ success: true, message: 'Job removed' });
  } catch (error) {
    console.error('Delete saved job error:', error);
    return NextResponse.json(
      { error: 'Failed to remove job' },
      { status: 500 }
    );
  }
}
