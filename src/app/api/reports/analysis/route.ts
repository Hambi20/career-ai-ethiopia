import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// CONSTANTS
// ============================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_AI_CHARS = 3500;

// ============================================================
// SQL ESCAPE HELPER — prevents SQL injection
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

// ============================================================
// VALIDATE DATE STRING (YYYY-MM-DD)
// ============================================================

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

// ============================================================
// ENSURE TABLE EXISTS (Vercel serverless-safe)
// ============================================================

async function ensureTable(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BotReport" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL DEFAULT 'general',
        "company" TEXT NOT NULL DEFAULT '',
        "category" TEXT NOT NULL DEFAULT 'general',
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL DEFAULT '',
        "summary" TEXT NOT NULL DEFAULT '',
        "chatId" INTEGER NOT NULL DEFAULT 0,
        "firstName" TEXT NOT NULL DEFAULT '',
        "date" TEXT NOT NULL DEFAULT '',
        "timestamp" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ensureTable:BotReport]', msg);
  }
}

// ============================================================
// ROW TYPE
// ============================================================

interface ReportRow {
  id: string;
  type: string;
  company: string;
  category: string;
  title: string;
  content: string;
  summary: string;
  chatId: number;
  firstName: string;
  date: string;
  timestamp: string;
  createdAt: string;
}

// ============================================================
// DATE RANGE HELPERS
// ============================================================

/** Returns [start, end] date strings for the ISO week containing `dateStr` */
function getWeekRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon ...
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // shift to Monday
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [
    monday.toISOString().split('T')[0],
    sunday.toISOString().split('T')[0],
  ];
}

/** Returns [start, end] date strings for the month containing `dateStr` */
function getMonthRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [
    first.toISOString().split('T')[0],
    last.toISOString().split('T')[0],
  ];
}

/** Returns [start, end] date strings for the quarter containing `dateStr` */
function getQuarterRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  const q = Math.floor(d.getMonth() / 3);
  const first = new Date(d.getFullYear(), q * 3, 1);
  const last = new Date(d.getFullYear(), q * 3 + 3, 0);
  return [
    first.toISOString().split('T')[0],
    last.toISOString().split('T')[0],
  ];
}

// ============================================================
// GROQ AI CALL
// ============================================================

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GROQ_API_KEY) {
    return 'Error: GROQ_API_KEY is not configured on the server.';
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GROQ_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return `Groq API error ${res.status}: ${text.slice(0, 200)}`;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || 'No response from AI.';

  // Truncate for Telegram
  return content.length > MAX_AI_CHARS ? content.slice(0, MAX_AI_CHARS) + '...' : content;
}

// ============================================================
// ACTION: SUMMARY — group all reports by type
// ============================================================

async function handleSummary(): Promise<Record<string, unknown>> {
  const rows = await db.$queryRawUnsafe<{ type: string; count: number; latest: string; earliest: string }[]>(
    `SELECT "type", COUNT(*) as "count", MAX("date") as "latest", MIN("date") as "earliest"
     FROM "BotReport"
     GROUP BY "type"
     ORDER BY "count" DESC`
  );

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return {
    totalReports: total,
    typeSummary: rows.map((r) => ({
      type: r.type,
      count: Number(r.count),
      latestDate: r.latest,
      firstDate: r.earliest,
    })),
  };
}

// ============================================================
// ACTION: BYDATE — all reports for a specific date
// ============================================================

async function handleByDate(date: string): Promise<Record<string, unknown>> {
  const rows = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" WHERE "date" = '${esc(date)}' ORDER BY "createdAt" DESC`
  );

  return { date, count: rows.length, reports: rows };
}

// ============================================================
// ACTION: WEEKLY — all reports for the week containing the date
// ============================================================

async function handleWeekly(date: string): Promise<Record<string, unknown>> {
  const [start, end] = getWeekRange(date);
  const rows = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" WHERE "date" >= '${esc(start)}' AND "date" <= '${esc(end)}' ORDER BY "date" DESC, "createdAt" DESC`
  );

  return { weekStart: start, weekEnd: end, date, count: rows.length, reports: rows };
}

// ============================================================
// ACTION: MONTHLY — all reports for the month containing the date
// ============================================================

async function handleMonthly(date: string): Promise<Record<string, unknown>> {
  const [start, end] = getMonthRange(date);
  const rows = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" WHERE "date" >= '${esc(start)}' AND "date" <= '${esc(end)}' ORDER BY "date" DESC, "createdAt" DESC`
  );

  return { month: date.substring(0, 7), monthStart: start, monthEnd: end, count: rows.length, reports: rows };
}

// ============================================================
// ACTION: QUARTERLY — all reports for the quarter containing the date
// ============================================================

async function handleQuarterly(date: string): Promise<Record<string, unknown>> {
  const [start, end] = getQuarterRange(date);
  const rows = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" WHERE "date" >= '${esc(start)}' AND "date" <= '${esc(end)}' ORDER BY "date" DESC, "createdAt" DESC`
  );

  // Derive quarter label
  const d = new Date(date + 'T00:00:00');
  const q = Math.floor(d.getMonth() / 3) + 1;
  const quarterLabel = `Q${q} ${d.getFullYear()}`;

  return { quarter: quarterLabel, quarterStart: start, quarterEnd: end, count: rows.length, reports: rows };
}

// ============================================================
// ACTION: ANALYZE — AI analysis of all reports of a given type
// ============================================================

async function handleAnalyzeByType(type: string): Promise<Record<string, unknown>> {
  const rows = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" WHERE "type" = '${esc(type)}' ORDER BY "date" DESC LIMIT 50`
  );

  if (rows.length === 0) {
    return { type, count: 0, analysis: `No reports found for type "${type}".` };
  }

  // Build a condensed payload for the AI
  const reportTexts = rows.map(
    (r, i) => `--- Report ${i + 1} ---\nDate: ${r.date}\nTitle: ${r.title}\nContent: ${(r.content || r.summary || '').slice(0, 500)}`
  );
  const fullText = reportTexts.join('\n\n');

  const systemPrompt = `You are an expert business analyst AI. You analyze reports from various sources (Vice Dean reports, sales reports, college reports, tech reports, evaluations, quarterly summaries, admissions, exams, employee reports, student reports, briefings, notes, etc.). 
Provide a concise, insightful analysis in plain text. Focus on:
1. Key themes and patterns
2. Notable findings or outliers
3. Trends over time
4. Actionable recommendations
Keep your response structured with clear sections. Use bullet points where helpful. Write in a professional tone.`;

  const userPrompt = `Analyze these ${rows.length} reports of type "${type}":\n\n${fullText}`;

  const analysis = await callGroq(systemPrompt, userPrompt);

  return {
    type,
    count: rows.length,
    dateRange: { from: rows[rows.length - 1]?.date, to: rows[0]?.date },
    analysis,
  };
}

// ============================================================
// ACTION: ANALYZE_DATE — AI analysis of all reports on a specific date
// ============================================================

async function handleAnalyzeByDate(date: string): Promise<Record<string, unknown>> {
  const rows = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" WHERE "date" = '${esc(date)}' ORDER BY "createdAt" DESC`
  );

  if (rows.length === 0) {
    return { date, count: 0, analysis: `No reports found for date "${date}".` };
  }

  const reportTexts = rows.map(
    (r, i) => `--- Report ${i + 1} [${r.type}] ---\nTitle: ${r.title}\nContent: ${(r.content || r.summary || '').slice(0, 500)}`
  );
  const fullText = reportTexts.join('\n\n');

  const systemPrompt = `You are an expert business analyst AI. Analyze the daily report bundle and provide:
1. Summary of the day's key activities and events
2. Important decisions or outcomes
3. Cross-report connections or conflicts
4. Action items or follow-ups needed
Keep your response concise, structured, and actionable. Use plain text with clear sections.`;

  const userPrompt = `Analyze all ${rows.length} reports from ${date}:\n\n${fullText}`;

  const analysis = await callGroq(systemPrompt, userPrompt);

  return {
    date,
    count: rows.length,
    types: Array.from(new Set(rows.map((r) => r.type))),
    analysis,
  };
}

// ============================================================
// ACTION: STATS — overall statistics
// ============================================================

async function handleStats(): Promise<Record<string, unknown>> {
  // Total by type
  const byTypeRows = await db.$queryRawUnsafe<{ type: string; count: number }[]>(
    `SELECT "type", COUNT(*) as "count" FROM "BotReport" GROUP BY "type" ORDER BY "count" DESC`
  );

  // Date range
  const rangeRows = await db.$queryRawUnsafe<{ earliest: string; latest: string; total: number }[]>(
    `SELECT MIN("date") as "earliest", MAX("date") as "latest", COUNT(*) as "total" FROM "BotReport"`
  );

  // Most active day
  const activeDayRows = await db.$queryRawUnsafe<{ date: string; count: number }[]>(
    `SELECT "date", COUNT(*) as "count" FROM "BotReport" GROUP BY "date" ORDER BY "count" DESC LIMIT 5`
  );

  // By company
  const byCompanyRows = await db.$queryRawUnsafe<{ company: string; count: number }[]>(
    `SELECT "company", COUNT(*) as "count" FROM "BotReport" WHERE "company" != '' GROUP BY "company" ORDER BY "count" DESC LIMIT 10`
  );

  // By category
  const byCategoryRows = await db.$queryRawUnsafe<{ category: string; count: number }[]>(
    `SELECT "category", COUNT(*) as "count" FROM "BotReport" WHERE "category" != '' GROUP BY "category" ORDER BY "count" DESC LIMIT 10`
  );

  // Monthly trend (last 6 months)
  const monthlyTrendRows = await db.$queryRawUnsafe<{ month: string; count: number }[]>(
    `SELECT SUBSTRING("date", 1, 7) as "month", COUNT(*) as "count" FROM "BotReport" WHERE "date" != '' GROUP BY SUBSTRING("date", 1, 7) ORDER BY "month" DESC LIMIT 6`
  );

  const range = rangeRows[0] || { earliest: '', latest: '', total: 0 };

  return {
    totalReports: Number(range.total),
    dateRange: { from: range.earliest, to: range.latest },
    byType: byTypeRows.map((r) => ({ type: r.type, count: Number(r.count) })),
    byCompany: byCompanyRows.map((r) => ({ company: r.company, count: Number(r.count) })),
    byCategory: byCategoryRows.map((r) => ({ category: r.category, count: Number(r.count) })),
    mostActiveDays: activeDayRows.map((r) => ({ date: r.date, count: Number(r.count) })),
    monthlyTrend: monthlyTrendRows.reverse().map((r) => ({ month: r.month, count: Number(r.count) })),
  };
}

// ============================================================
// ACTION: ALL — paginated list of all reports
// ============================================================

async function handleAll(offset: number, limit: number): Promise<Record<string, unknown>> {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), 500);

  // Get total count
  const countRows = await db.$queryRawUnsafe<{ total: number }[]>(
    `SELECT COUNT(*) as "total" FROM "BotReport"`
  );
  const total = Number(countRows[0]?.total || 0);

  const reports = await db.$queryRawUnsafe<ReportRow[]>(
    `SELECT * FROM "BotReport" ORDER BY "createdAt" DESC OFFSET ${safeOffset} LIMIT ${safeLimit}`
  );

  return {
    total,
    offset: safeOffset,
    limit: safeLimit,
    hasMore: safeOffset + reports.length < total,
    reports,
  };
}

// ============================================================
// MAIN GET HANDLER
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';

    switch (action) {
      // ---- SUMMARY (default) ----
      case 'summary': {
        const data = await handleSummary();
        return NextResponse.json({ success: true, action, data });
      }

      // ---- BY DATE ----
      case 'bydate': {
        const date = searchParams.get('date') || '';
        if (!isValidDate(date)) {
          return NextResponse.json({ success: false, error: 'Invalid date. Use YYYY-MM-DD format.' }, { status: 400 });
        }
        const data = await handleByDate(date);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- WEEKLY ----
      case 'weekly': {
        const date = searchParams.get('date') || '';
        if (!isValidDate(date)) {
          return NextResponse.json({ success: false, error: 'Invalid date. Use YYYY-MM-DD format.' }, { status: 400 });
        }
        const data = await handleWeekly(date);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- MONTHLY ----
      case 'monthly': {
        const date = searchParams.get('date') || '';
        if (!isValidDate(date)) {
          return NextResponse.json({ success: false, error: 'Invalid date. Use YYYY-MM-DD format.' }, { status: 400 });
        }
        const data = await handleMonthly(date);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- QUARTERLY ----
      case 'quarterly': {
        const date = searchParams.get('date') || '';
        if (!isValidDate(date)) {
          return NextResponse.json({ success: false, error: 'Invalid date. Use YYYY-MM-DD format.' }, { status: 400 });
        }
        const data = await handleQuarterly(date);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- ANALYZE BY TYPE ----
      case 'analyze': {
        const type = (searchParams.get('type') || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
        if (!type) {
          return NextResponse.json({ success: false, error: 'Missing or invalid "type" parameter.' }, { status: 400 });
        }
        const data = await handleAnalyzeByType(type);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- ANALYZE BY DATE ----
      case 'analyze_date': {
        const date = searchParams.get('date') || '';
        if (!isValidDate(date)) {
          return NextResponse.json({ success: false, error: 'Invalid date. Use YYYY-MM-DD format.' }, { status: 400 });
        }
        const data = await handleAnalyzeByDate(date);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- STATS ----
      case 'stats': {
        const data = await handleStats();
        return NextResponse.json({ success: true, action, data });
      }

      // ---- ALL (paginated) ----
      case 'all': {
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const data = await handleAll(offset, limit);
        return NextResponse.json({ success: true, action, data });
      }

      // ---- UNKNOWN ACTION ----
      default: {
        const validActions = ['summary', 'bydate', 'weekly', 'monthly', 'quarterly', 'analyze', 'analyze_date', 'stats', 'all'];
        return NextResponse.json(
          { success: false, error: `Unknown action "${action}". Valid actions: ${validActions.join(', ')}` },
          { status: 400 }
        );
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[reports/analysis]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}