import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

export async function POST(request: NextRequest) {
  try {
    const { url, id } = await request.json();
    const store = getStore();

    const jobId = id || url;

    if (!jobId) {
      return NextResponse.json(
        { error: 'URL or ID is required' },
        { status: 400 }
      );
    }

    // Find the job in store
    const job = store.applications.find(
      (a: any) => a.id === jobId || a.url === jobId
    );

    if (job) {
      // Mark as read
      job.read = true;
      job.readAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        url: job.url || jobId,
        pageTitle: job.title || '',
        rawContent: job.jobDescription || job.description || '',
        extractedData: {
          title: job.jobTitle || job.title || '',
          company: job.company || null,
          location: job.location || null,
          type: job.type || null,
          salary: job.salary || null,
          description: job.jobDescription || job.description || '',
          requirements: job.requirements || [],
          responsibilities: job.responsibilities || [],
          qualifications: job.qualifications || [],
          deadline: job.deadline || null,
          contactEmail: job.contactEmail || null,
          contactPhone: job.contactPhone || null,
        },
      });
    }

    // If not found in store, return a mock read result
    return NextResponse.json({
      success: true,
      url: jobId,
      pageTitle: 'Job Listing',
      rawContent: 'Job details would be loaded from the source website. This is a fallback response for the in-memory store deployment.',
      extractedData: {
        title: 'Job Listing',
        company: null,
        location: 'Ethiopia',
        type: null,
        salary: null,
        description: 'Full job description would be extracted from the webpage.',
        requirements: [],
        responsibilities: [],
        qualifications: [],
        deadline: null,
        contactEmail: null,
        contactPhone: null,
      },
    });
  } catch (error: unknown) {
    console.error('Job read error:', error);
    return NextResponse.json(
      { error: 'Failed to read job page.' },
      { status: 500 }
    );
  }
}
