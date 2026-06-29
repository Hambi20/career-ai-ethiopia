import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Return user info from the token (mock user since no DB)
    const user = {
      id: payload.userId,
      email: payload.email,
      name: 'Hambisa Bekuma Tefera',
      phone: '+251 952 341 525',
      role: payload.role || 'jobseeker',
      tier: payload.tier || 'free',
      avatar: null,
      isActive: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      profile: {
        fullName: 'Hambisa Bekuma Tefera',
        title: 'Sales Manager',
        location: 'Addis Ababa, Ethiopia',
        summary: 'Over eight years in sales across Eastern Ethiopia and Addis Ababa.',
      },
    };

    return NextResponse.json({
      success: true,
      user,
      usageToday: {},
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
  }
}