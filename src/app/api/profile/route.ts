import { NextRequest, NextResponse } from 'next/server';
import { getStore, ensureStoreWarmed } from '@/lib/unified-store';

// Default profile data for Hambisa Bekuma Tefera
const DEFAULT_PROFILE = {
  id: 'default',
  fullName: 'Hambisa Bekuma Tefera',
  email: 'hambisa1992@gmail.com',
  phone: '+251 952 341 525',
  location: 'Addis Ababa, Ethiopia',
  title: 'Sales Manager',
  summary: 'Experienced Sales Manager with 8+ years across Eastern Ethiopia and Addis Ababa. MBA and BSc in Agribusiness. Managed 150+ B2B accounts, built departments from zero, achieved 20% revenue growth.',
  skills: JSON.stringify([
    'Territory Management', 'Route-to-Market', 'Market Expansion', 'New Account Opening',
    'Field Team Leadership & Coaching', 'Negotiation & Deal Closing', 'B2B Account Management',
    'Distributor & Channel Development', 'Sales Planning & Forecasting', 'Market Intelligence',
  ]),
  education: JSON.stringify([
    { degree: 'Master of Business Administration (MBA)', institution: 'Addis Ababa Medical & Business College', year: '2018' },
    { degree: 'BSc in Agribusiness & Value Chain Management', institution: 'Jimma University', year: '2014' },
  ]),
  experience: JSON.stringify([
    { title: 'Route Sales Representative', company: 'Romel General Trading', period: 'Jan 2026 – Present' },
    { title: 'Marketing Manager', company: 'OL-BRIGHT International College', period: 'Dec 2022 – Nov 2025' },
    { title: 'Marketing & Sales Manager', company: 'Deran PLC', period: 'Dec 2020 – Nov 2022' },
    { title: 'Territory Sales Manager', company: 'SMADL Communication Terminal Factory PLC', period: 'Jul 2016 – Nov 2020' },
  ]),
  cvScore: 72,
  applicationsCount: 14,
  interviewsCount: 3,
  targetRole: 'Sales Manager',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

// GET - Get user profile
export async function GET() {
  try {
    await ensureStoreWarmed();
    // Check if bot synced profile data exists
    const store = getStore();
    if (store.rawSyncData?.profile) {
      return NextResponse.json({ success: true, profile: store.rawSyncData.profile });
    }

    return NextResponse.json({ success: true, profile: DEFAULT_PROFILE });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ success: true, profile: DEFAULT_PROFILE });
  }
}

// POST - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const store = getStore();
    const profile = { ...DEFAULT_PROFILE, ...data, updatedAt: new Date().toISOString() };
    if (!store.rawSyncData) store.rawSyncData = {};
    store.rawSyncData.profile = profile;
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 });
  }
}

// PUT - Update profile (used by ProfileTab)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const store = getStore();
    const existing = store.rawSyncData?.profile || DEFAULT_PROFILE;
    const profile = { ...existing, ...data, updatedAt: new Date().toISOString() };
    if (!store.rawSyncData) store.rawSyncData = {};
    store.rawSyncData.profile = profile;
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
