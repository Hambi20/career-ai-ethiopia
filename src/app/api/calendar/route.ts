import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ============================================================
// DYNAMIC TABLE CREATION
// ============================================================

async function ensureTables(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CalendarEvent" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "businessId" TEXT NOT NULL DEFAULT '',
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT,
        "type" TEXT NOT NULL DEFAULT 'general',
        "date" TEXT NOT NULL DEFAULT '',
        "time" TEXT,
        "endTime" TEXT,
        "location" TEXT,
        "isAllDay" BOOLEAN NOT NULL DEFAULT false,
        "priority" TEXT NOT NULL DEFAULT 'medium',
        "notifyBefore" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'upcoming',
        "chatId" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.error('[ensureTables:CalendarEvent]', err?.message);
  }
}

// ============================================================
// SQL ESCAPE HELPER
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

// ============================================================
// TYPES
// ============================================================

interface CalendarEventRow {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  time: string | null;
  endTime: string | null;
  location: string | null;
  isAllDay: number | boolean;
  priority: string;
  notifyBefore: number;
  status: string;
  chatId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GET — List events with filters + stats
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || '';
    const type = searchParams.get('type') || '';
    const date = searchParams.get('date') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build dynamic WHERE clause
    const conditions: string[] = ['1=1'];
    if (businessId) conditions.push(`"businessId" = '${esc(businessId)}'`);
    if (type) conditions.push(`"type" = '${esc(type)}'`);
    if (date) conditions.push(`"date" = '${esc(date)}'`);
    if (dateFrom) conditions.push(`"date" >= '${esc(dateFrom)}'`);
    if (dateTo) conditions.push(`"date" <= '${esc(dateTo)}'`);
    if (status) {
      const statuses = status.split(',').map((s) => `'${esc(s.trim())}'`).join(',');
      conditions.push(`"status" IN (${statuses})`);
    }

    const whereClause = conditions.join(' AND ');

    const events = await db.$queryRawUnsafe<CalendarEventRow[]>(
      `SELECT * FROM "CalendarEvent" WHERE ${whereClause} ORDER BY "date" ASC, "time" ASC LIMIT ${limit}`
    );

    // Normalize boolean fields
    const normalized = events.map((e) => ({
      ...e,
      isAllDay: e.isAllDay === 1 ? true : e.isAllDay === 0 ? false : !!e.isAllDay,
    }));

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const upcomingCount = normalized.filter((e) => e.date >= today && e.status === 'upcoming').length;
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const e of normalized) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byPriority[e.priority] = (byPriority[e.priority] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }

    const stats = {
      total: normalized.length,
      upcoming: upcomingCount,
      byType,
      byPriority,
      byStatus,
    };

    return NextResponse.json({ success: true, events: normalized, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST — Create a new calendar event
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = randomUUID();
    const now = new Date().toISOString();

    const businessId = body.businessId || '';
    const title = body.title || 'Untitled Event';
    const description = body.description || '';
    const type = body.type || 'general';
    const date = body.date || now.split('T')[0];
    const time = body.time || null;
    const endTime = body.endTime || null;
    const location = body.location || '';
    const isAllDay = body.isAllDay ? 1 : 0;
    const priority = body.priority || 'medium';
    const notifyBefore = parseInt(body.notifyBefore, 10) || 0;
    const chatId = parseInt(body.chatId, 10) || 0;

    await ensureTables();

    await db.$executeRawUnsafe(
      `INSERT INTO "CalendarEvent" ("id","businessId","title","description","type","date","time","endTime","location","isAllDay","priority","notifyBefore","status","chatId","createdAt","updatedAt")
       VALUES ('${esc(id)}','${esc(businessId)}','${esc(title)}','${esc(description)}','${esc(type)}','${esc(date)}',${time ? `'${esc(time)}'` : 'NULL'},${endTime ? `'${esc(endTime)}'` : 'NULL'},'${esc(location)}',${isAllDay},'${esc(priority)}',${notifyBefore},'upcoming',${chatId},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    );

    const event = {
      id,
      businessId,
      title,
      description,
      type,
      date,
      time,
      endTime,
      location,
      isAllDay: !!body.isAllDay,
      priority,
      notifyBefore,
      status: 'upcoming',
      chatId,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================
// DELETE — Remove a calendar event
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing required query parameter: id' }, { status: 400 });
    }

    await ensureTables();

    await db.$executeRawUnsafe(
      `DELETE FROM "CalendarEvent" WHERE "id" = '${esc(id)}'`
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}