import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

async function getAuthUser(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return await db.user.findUnique({ where: { id: payload.userId } });
}

// GET - Admin user list
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, name: true, phone: true, role: true, tier: true,
          isActive: true, lastLogin: true, createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({ success: true, users, total, page, limit });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PUT - Admin update user (role, tier, isActive)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const updated = await db.user.update({
      where: { id: data.userId },
      data: {
        role: data.role || undefined,
        tier: data.tier || undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
