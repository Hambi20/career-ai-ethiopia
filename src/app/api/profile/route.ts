import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get user profile
export async function GET() {
  try {
    const profile = await db.userProfile.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, profile: profile || null });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// POST - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Check if profile exists
    const existing = await db.userProfile.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      // Update existing profile
      const profile = await db.userProfile.update({
        where: { id: existing.id },
        data: {
          fullName: data.fullName || null,
          email: data.email || null,
          phone: data.phone || null,
          location: data.location || null,
          title: data.title || null,
          summary: data.summary || null,
          skills: data.skills ? JSON.stringify(data.skills) : '[]',
          education: data.education ? JSON.stringify(data.education) : null,
          experience: data.experience ? JSON.stringify(data.experience) : null,
          resumeUrl: data.resumeUrl || null,
        },
      });

      return NextResponse.json({ success: true, profile });
    }

    // Create new profile
    const profile = await db.userProfile.create({
      data: {
        fullName: data.fullName || null,
        email: data.email || null,
        phone: data.phone || null,
        location: data.location || null,
        title: data.title || null,
        summary: data.summary || null,
        skills: data.skills ? JSON.stringify(data.skills) : '[]',
        education: data.education ? JSON.stringify(data.education) : null,
        experience: data.experience ? JSON.stringify(data.experience) : null,
        resumeUrl: data.resumeUrl || null,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}
