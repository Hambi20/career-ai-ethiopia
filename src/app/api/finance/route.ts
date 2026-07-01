import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ============================================================
// DYNAMIC TABLE CREATION
// ============================================================

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
}

// ============================================================
// SQL ESCAPE HELPER
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

// ============================================================
// TYPES
// ============================================================

interface TransactionRow {
  id: string;
  businessId: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  reference: string | null;
  date: string;
  chatId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GET — List transactions with filters + stats
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const period = searchParams.get('period') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build dynamic WHERE clause
    const conditions: string[] = ['1=1'];
    if (businessId) conditions.push(`"businessId" = '${esc(businessId)}'`);
    if (type) {
      const types = type.split(',').map((t) => `'${esc(t.trim())}'`).join(',');
      conditions.push(`"type" IN (${types})`);
    }
    if (category) conditions.push(`"category" = '${esc(category)}'`);
    if (period) {
      const now = new Date();
      let fromDate: Date;
      if (period === 'daily') fromDate = new Date(now.getTime() - 1 * 86400000);
      else if (period === 'weekly') fromDate = new Date(now.getTime() - 7 * 86400000);
      else if (period === 'monthly') fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      else fromDate = new Date(now.getTime() - 30 * 86400000);
      conditions.push(`"date" >= '${fromDate.toISOString().split('T')[0]}'`);
    }

    const whereClause = conditions.join(' AND ');

    const transactions = await db.$queryRawUnsafe<TransactionRow[]>(
      `SELECT * FROM "Transaction" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT ${limit}`
    );

    // Calculate stats from the same filtered set (no separate limit for stats)
    const statsRows = await db.$queryRawUnsafe<{ type: string; category: string; total: number }[]>(
      `SELECT "type", "category", SUM("amount") as "total" FROM "Transaction" WHERE ${whereClause} GROUP BY "type", "category"`
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    for (const row of statsRows) {
      const amt = Number(row.total) || 0;
      if (row.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
      const key = `${row.category} (${row.type})`;
      byCategory[key] = amt;
    }

    const stats = {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      transactionCount: transactions.length,
      byCategory,
    };

    return NextResponse.json({ success: true, transactions, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST — Create a new transaction
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = randomUUID();
    const now = new Date().toISOString();

    const businessId = body.businessId || '';
    const type = body.type || 'expense';
    const category = body.category || 'general';
    const amount = parseFloat(body.amount) || 0;
    const currency = body.currency || 'ETB';
    const description = body.description || '';
    const reference = body.reference || '';
    const date = body.date || now.split('T')[0];
    const chatId = parseInt(body.chatId, 10) || 0;

    await ensureTables();

    await db.$executeRawUnsafe(
      `INSERT INTO "Transaction" ("id","businessId","type","category","amount","currency","description","reference","date","chatId","createdAt","updatedAt")
       VALUES ('${esc(id)}','${esc(businessId)}','${esc(type)}','${esc(category)}',${amount},'${esc(currency)}','${esc(description)}','${esc(reference)}','${esc(date)}',${chatId},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    );

    const transaction = {
      id,
      businessId,
      type,
      category,
      amount,
      currency,
      description,
      reference,
      date,
      chatId,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, transaction });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}