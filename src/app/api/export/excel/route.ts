import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getContacts, ensureStoreWarmed } from '@/lib/unified-store';

// ============================================================
// HELPERS
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

/** Escape a CSV field: wrap in quotes and double-up internal quotes */
function csvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/** Build a WHERE clause for period filtering */
function periodCondition(period: string, dateColumn: string): string {
  if (!period || period === 'all') return '1=1';
  const now = new Date();
  let fromDate: Date;
  if (period === 'daily') fromDate = new Date(now.getTime() - 1 * 86400000);
  else if (period === 'weekly') fromDate = new Date(now.getTime() - 7 * 86400000);
  else if (period === 'monthly') fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  else fromDate = new Date(now.getTime() - 30 * 86400000);
  return `${dateColumn} >= '${fromDate.toISOString().split('T')[0]}'`;
}

/** Ensure dynamic tables exist */
async function ensureTables(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Transaction" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "businessId" TEXT NOT NULL DEFAULT '',
        "type" TEXT NOT NULL DEFAULT 'expense',
        "category" TEXT NOT NULL DEFAULT 'general',
        "amount" REAL NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'ETB',
        "description" TEXT,
        "reference" TEXT,
        "date" TEXT NOT NULL DEFAULT '',
        "chatId" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.error('[ensureTables:Transaction]', err?.message);
  }
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
// SECTION BUILDERS — each returns { header: string, rows: string, filename: string }
// ============================================================

async function buildFinanceCSV(period: string): Promise<{ header: string; rows: string; filename: string }> {
  const where = periodCondition(period, '"date"');
  const transactions = await db.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Transaction" WHERE ${where} ORDER BY "date" DESC LIMIT 200`
  );

  const header = 'Date,Type,Category,Amount,Currency,Description';
  const rows = transactions
    .map(
      (t) =>
        `${csvField(t.date)},${csvField(t.type)},${csvField(t.category)},${t.amount ?? 0},${csvField(t.currency)},${csvField(t.description)}`
    )
    .join('\n');

  const periodLabel = period === 'all' ? 'all' : period;
  return { header, rows, filename: `finance-report-${periodLabel}.csv` };
}

async function buildCalendarCSV(period: string): Promise<{ header: string; rows: string; filename: string }> {
  const where = periodCondition(period, '"date"');
  const events = await db.$queryRawUnsafe<any[]>(
    `SELECT * FROM "CalendarEvent" WHERE ${where} ORDER BY "date" ASC LIMIT 200`
  );

  const header = 'Date,Time,Title,Type,Priority,Description';
  const rows = events
    .map(
      (e) =>
        `${csvField(e.date)},${csvField(e.time || (e.isAllDay ? 'All Day' : ''))},${csvField(e.title)},${csvField(e.type)},${csvField(e.priority)},${csvField(e.description)}`
    )
    .join('\n');

  const periodLabel = period === 'all' ? 'all' : period;
  return { header, rows, filename: `calendar-report-${periodLabel}.csv` };
}

function buildContactsCSV(): { header: string; rows: string; filename: string } {
  const contacts = getContacts();

  // Detect available fields from the first few contacts
  const sampleFields = new Set<string>();
  for (const c of contacts.slice(0, 20)) {
    for (const key of Object.keys(c)) {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        sampleFields.add(key);
      }
    }
  }

  // Use sensible defaults if no contacts exist
  const fields = sampleFields.size > 0
    ? Array.from(sampleFields)
    : ['name', 'phone', 'email', 'company', 'type', 'notes'];

  const header = ['Name', 'Phone', 'Email', 'Company', 'Type', 'Notes'].join(',');
  const rows = contacts
    .map(
      (c: any) =>
        `${csvField(c.name)},${csvField(c.phone)},${csvField(c.email)},${csvField(c.company || c.business)},${csvField(c.type)},${csvField(c.notes || c.note)}`
    )
    .join('\n');

  return { header, rows, filename: 'contacts-report.csv' };
}

async function buildFullCSV(period: string): Promise<{ header: string; rows: string; filename: string }> {
  const finance = await buildFinanceCSV(period);
  const calendar = await buildCalendarCSV(period);
  const contacts = buildContactsCSV();

  const separator = '\n\n';
  const header = '=== FINANCE DATA ===\n' + finance.header;
  const rows =
    finance.rows +
    separator +
    '=== CALENDAR DATA ===\n' +
    calendar.header +
    '\n' +
    calendar.rows +
    separator +
    '=== CONTACTS DATA ===\n' +
    contacts.header +
    '\n' +
    contacts.rows;

  const periodLabel = period === 'all' ? 'all' : period;
  return { header, rows, filename: `full-report-${periodLabel}.csv` };
}

// ============================================================
// GET — CSV Export Endpoint
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'finance').toLowerCase();
    const period = (searchParams.get('period') || 'all').toLowerCase();

    // Validate type
    const validTypes = ['finance', 'calendar', 'contacts', 'full'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'all'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { success: false, error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure database tables exist for finance/calendar
    if (type === 'finance' || type === 'calendar' || type === 'full') {
      await ensureTables();
    }

    // Warm contacts store if needed
    if (type === 'contacts' || type === 'full') {
      await ensureStoreWarmed();
    }

    // Build CSV based on type
    let result: { header: string; rows: string; filename: string };

    switch (type) {
      case 'finance':
        result = await buildFinanceCSV(period);
        break;
      case 'calendar':
        result = await buildCalendarCSV(period);
        break;
      case 'contacts':
        result = buildContactsCSV();
        break;
      case 'full':
        result = await buildFullCSV(period);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });
    }

    const csv = result.header + '\n' + result.rows;

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[export/excel]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}