import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// GET - Admin user list (uses botUsers from store)
export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');

    let users = [...store.botUsers];

    if (role) {
      users = users.filter((u: any) => u.role === role || u.type === role);
    }

    const total = users.length;
    const start = (page - 1) * limit;
    const paginatedUsers = users.slice(start, start + limit).map((u: any) => ({
      id: u.id || u._id,
      email: u.email || '',
      name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      phone: u.phone || '',
      role: u.role || u.type || 'jobseeker',
      tier: u.tier || 'free',
      isActive: u.isActive ?? true,
      isPremium: u.isPremium || u.premium || false,
      lastLogin: u.lastLogin || u.lastSeen || null,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ success: true, users: paginatedUsers, total, page, limit });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PUT - Admin update user (role, tier, isActive)
export async function PUT(request: NextRequest) {
  try {
    const store = getStore();
    const data = await request.json();
    if (!data.userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const user = store.botUsers.find((u: any) => (u.id || u._id) === data.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (data.role !== undefined) user.role = data.role;
    if (data.tier !== undefined) user.tier = data.tier;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}