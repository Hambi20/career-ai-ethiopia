import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'career-ai-ethiopia-secret-key-2025';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tier: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

// Subscription tier limits
export const TIER_LIMITS = {
  free: {
    maxSearchesPerDay: 5,
    maxCoverLettersPerDay: 3,
    maxCvAnalysesPerDay: 1,
    maxInterviewPrepsPerDay: 2,
    maxApplications: 50,
    maxSavedJobs: 20,
  },
  premium: {
    maxSearchesPerDay: Infinity,
    maxCoverLettersPerDay: Infinity,
    maxCvAnalysesPerDay: Infinity,
    maxInterviewPrepsPerDay: Infinity,
    maxApplications: Infinity,
    maxSavedJobs: Infinity,
  },
  employer: {
    maxSearchesPerDay: Infinity,
    maxCoverLettersPerDay: Infinity,
    maxCvAnalysesPerDay: Infinity,
    maxInterviewPrepsPerDay: Infinity,
    maxApplications: Infinity,
    maxSavedJobs: Infinity,
    maxJobPostings: 50,
  },
} as const;

// Check if user has hit daily limit for an action
export async function checkUsageLimit(
  userId: string,
  action: string,
  tier: string,
  db: any
): Promise<{ allowed: boolean; remaining: number }> {
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  const limitKey = `max${action.charAt(0).toUpperCase() + action.slice(1)}PerDay` as keyof typeof limits;

  // @ts-ignore - dynamic key access
  const limit = limits[limitKey];
  if (!limit || limit === Infinity) return { allowed: true, remaining: Infinity };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await db.usageLog.count({
    where: {
      userId,
      action,
      createdAt: { gte: today },
    },
  });

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
  };
}

// Log usage
export async function logUsage(userId: string, action: string, db: any) {
  await db.usageLog.create({ data: { userId, action } });
}
