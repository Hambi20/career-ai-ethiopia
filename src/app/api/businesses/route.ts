import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ============================================================
// DYNAMIC TABLE CREATION
// ============================================================

async function ensureTables(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Business" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'general',
        "industry" TEXT,
        "description" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "website" TEXT,
        "logo" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.error('[ensureTables:Business]', err?.message);
  }
}

// ============================================================
// SQL ESCAPE HELPER
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

// ============================================================
// TYPES
// ============================================================

interface BusinessRow {
  id: string;
  name: string;
  type: string;
  industry: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
  isActive: number | boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GET — List all businesses
// ============================================================

export async function GET() {
  try {
    await ensureTables();
    const businesses = await db.$queryRawUnsafe<BusinessRow[]>(
      `SELECT * FROM "Business" ORDER BY "createdAt" DESC`
    );
    // Normalize boolean fields
    const normalized = businesses.map((b) => ({
      ...b,
      isActive: b.isActive === 1 ? true : b.isActive === 0 ? false : !!b.isActive,
    }));
    return NextResponse.json({ success: true, businesses: normalized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST — Create a new business
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = randomUUID();
    const now = new Date().toISOString();

    const name = body.name || 'Untitled Business';
    const type = body.type || 'general';
    const industry = body.industry || '';
    const description = body.description || '';
    const email = body.email || '';
    const phone = body.phone || '';
    const address = body.address || '';
    const website = body.website || '';
    const logo = body.logo || '';

    await ensureTables();

    await db.$executeRawUnsafe(
      `INSERT INTO "Business" ("id","name","type","industry","description","email","phone","address","website","logo","isActive","createdAt","updatedAt")
       VALUES ('${esc(id)}','${esc(name)}','${esc(type)}','${esc(industry)}','${esc(description)}','${esc(email)}','${esc(phone)}','${esc(address)}','${esc(website)}','${esc(logo)}',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    );

    const business = {
      id,
      name,
      type,
      industry,
      description,
      email,
      phone,
      address,
      website,
      logo,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, business });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}