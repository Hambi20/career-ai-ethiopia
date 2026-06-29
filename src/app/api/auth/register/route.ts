import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { webUsers } from '@/lib/auth-web-users';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, role = 'jobseeker' } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user exists
    const existing = webUsers.find((u: any) => u.email === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Create user (in-memory, no password hashing for simplicity)
    const userId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const user = {
      id: userId,
      email: email.toLowerCase(),
      password, // stored in memory only; no persistence
      name: name || null,
      phone: phone || null,
      role,
      tier: role === 'employer' ? 'employer' : 'free',
      isActive: true,
      lastLogin: null,
      createdAt: new Date().toISOString(),
    };

    webUsers.push(user);

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        tier: user.tier,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}