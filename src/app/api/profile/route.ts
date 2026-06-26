import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default profile data for Hambisa Bekuma Tefera
const DEFAULT_PROFILE = {
  fullName: 'Hambisa Bekuma Tefera',
  email: 'hambisa1992@gmail.com',
  phone: '+251 952 341 525',
  location: 'Addis Ababa, Ethiopia',
  title: 'Sales Manager',
  summary: 'Experienced Sales Manager with 8+ years across Eastern Ethiopia and Addis Ababa. MBA and BSc in Agribusiness. Managed 150+ B2B accounts, built departments from zero, achieved 20% revenue growth. Expert in territory management, B2B sales, distributor development, and field team leadership. Speaks Amharic, English, Afaan Oromo, and Somali.',
  skills: JSON.stringify([
    'Territory Management', 'Route-to-Market', 'Market Expansion', 'New Account Opening',
    'Field Team Leadership & Coaching', 'Negotiation & Deal Closing', 'B2B Account Management',
    'Distributor & Channel Development', 'Sales Planning & Forecasting', 'Market Intelligence',
    'Competitor Analysis', 'Excel & Reporting', 'Marketing Strategy', 'Customer Retention',
  ]),
  education: JSON.stringify([
    { degree: 'Master of Business Administration (MBA)', institution: 'Addis Ababa Medical & Business College', year: '2018' },
    { degree: 'BSc in Agribusiness & Value Chain Management', institution: 'Jimma University', year: '2014' },
  ]),
  experience: JSON.stringify([
    { title: 'Route Sales Representative', company: 'Romel General Trading', period: 'Jan 2026 – Present', description: 'Managing 150+ B2B retail and wholesale accounts on structured weekly route. Open new accounts monthly. Monitor competitor pricing and territory plays.' },
    { title: 'Marketing Manager', company: 'OL-BRIGHT International College', period: 'Dec 2022 – Nov 2025', description: 'Drove 30%+ rise in enrollment through targeted campaigns. Built college presence from near-zero. Grew from 1 branch to 2 with third in planning.' },
    { title: 'Marketing & Sales Manager', company: 'Deran PLC', period: 'Dec 2020 – Nov 2022', description: 'Built marketing and sales department from zero. Drove 20% revenue growth in two years through new customer acquisition and retention fixes.' },
    { title: 'Territory Sales Manager', company: 'SMADL Communication Terminal Factory PLC', period: 'Jul 2016 – Nov 2020', description: 'Managed sales across Adama, Asella, Chiro, Awash, Dire Dawa, Harar, Jigjiga, and Somali Region. Hired and trained sales reps across multiple towns.' },
  ]),
};

// GET - Get user profile (auto-seed if none exists)
export async function GET() {
  try {
    let profile = await db.userProfile.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (!profile) {
      // Auto-seed with Hambisa's profile data
      profile = await db.userProfile.create({ data: DEFAULT_PROFILE });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// POST - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const existing = await db.userProfile.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (existing) {
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
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
