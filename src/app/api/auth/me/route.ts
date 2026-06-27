import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        tier: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count usage today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usageToday = await db.usageLog.groupBy({
      by: ['action'],
      where: { userId: payload.userId, createdAt: { gte: today } },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      user,
      usageToday: Object.fromEntries(usageToday.map(u => [u.action, u._count])),
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
  }
}
