import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================================
// TYPES
// ============================================================

interface TransactionRow {
  id: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  createdAt: string;
}

// ============================================================
// DYNAMIC TABLE CREATION
// ============================================================

async function ensureTransactionTable(): Promise<void> {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ensureTransactionTable]', msg);
  }
}

// ============================================================
// SQL ESCAPE HELPER
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

// ============================================================
// STATISTICS CALCULATION
// ============================================================

function calculateStats(
  transactions: TransactionRow[],
  period: string
): Record<string, unknown> {
  const incomeTxns = transactions.filter((t) => t.type === 'income');
  const expenseTxns = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxns.reduce((sum, t) => sum + t.amount, 0);

  // Top expense categories
  const categoryTotals: Record<string, number> = {};
  for (const t of expenseTxns) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  }
  const topCategories = Object.fromEntries(
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 10)
  );

  // Average daily expense
  const uniqueDays = new Set(transactions.map((t) => t.date.split('T')[0]));
  const dayCount = Math.max(uniqueDays.size, 1);
  const avgDailyExpense = totalExpense / dayCount;
  const avgDailyIncome = totalIncome / dayCount;

  // Monthly breakdown — group by YYYY-MM
  const monthlyIncome: Record<string, number> = {};
  const monthlyExpense: Record<string, number> = {};
  for (const t of transactions) {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (t.type === 'income') {
      monthlyIncome[month] = (monthlyIncome[month] || 0) + t.amount;
    } else {
      monthlyExpense[month] = (monthlyExpense[month] || 0) + t.amount;
    }
  }
  const sortedMonths = [...new Set([...Object.keys(monthlyIncome), ...Object.keys(monthlyExpense)])].sort();
  const monthlyBreakdown = sortedMonths.map((m) => ({
    month: m,
    income: monthlyIncome[m] || 0,
    expense: monthlyExpense[m] || 0,
    net: (monthlyIncome[m] || 0) - (monthlyExpense[m] || 0),
  }));

  // Weekly breakdown — group by ISO week
  const weeklyIncome: Record<string, number> = {};
  const weeklyExpense: Record<string, number> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().substring(0, 10);
    if (t.type === 'income') {
      weeklyIncome[weekKey] = (weeklyIncome[weekKey] || 0) + t.amount;
    } else {
      weeklyExpense[weekKey] = (weeklyExpense[weekKey] || 0) + t.amount;
    }
  }
  const sortedWeeks = [...new Set([...Object.keys(weeklyIncome), ...Object.keys(weeklyExpense)])].sort();
  const weeklyBreakdown = sortedWeeks.map((w) => ({
    week: w,
    income: weeklyIncome[w] || 0,
    expense: weeklyExpense[w] || 0,
    net: (weeklyIncome[w] || 0) - (weeklyExpense[w] || 0),
  }));

  // Trend: compare most recent half vs earlier half
  const half = Math.floor(transactions.length / 2);
  const recent = transactions.slice(0, half);
  const earlier = transactions.slice(half);
  const recentExpense = recent.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const earlierExpense = earlier.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const recentIncome = recent.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const earlierIncome = earlier.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const expenseTrendPercent = earlierExpense > 0 ? ((recentExpense - earlierExpense) / earlierExpense) * 100 : 0;
  const incomeTrendPercent = earlierIncome > 0 ? ((recentIncome - earlierIncome) / earlierIncome) * 100 : 0;

  const periodLabel =
    period === 'daily'
      ? 'Last 24 hours'
      : period === 'weekly'
        ? 'Last 7 days'
        : period === 'monthly'
          ? 'Last 30 days'
          : `Last ${transactions.length} transactions`;

  return {
    totalTransactions: transactions.length,
    incomeCount: incomeTxns.length,
    expenseCount: expenseTxns.length,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netCashflow: Math.round((totalIncome - totalExpense) * 100) / 100,
    avgDailyIncome: Math.round(avgDailyIncome * 100) / 100,
    avgDailyExpense: Math.round(avgDailyExpense * 100) / 100,
    avgTransactionAmount: transactions.length > 0 ? Math.round((transactions.reduce((s, t) => s + t.amount, 0) / transactions.length) * 100) / 100 : 0,
    topCategories,
    monthlyBreakdown,
    weeklyBreakdown,
    incomeTrendPercent: Math.round(incomeTrendPercent * 10) / 10,
    expenseTrendPercent: Math.round(expenseTrendPercent * 10) / 10,
    periodAnalyzed: periodLabel,
    dateRange: transactions.length > 0
      ? { from: transactions[transactions.length - 1]?.date, to: transactions[0]?.date }
      : { from: null, to: null },
  };
}

// ============================================================
// LLM FORECAST ANALYSIS
// ============================================================

async function generateForecast(
  stats: Record<string, unknown>,
  period: string
): Promise<Record<string, unknown>> {
  const zai = await ZAI.create();

  const systemPrompt = `You are a senior financial analyst AI specializing in small business and personal finance forecasting for Ethiopian businesses (ETB currency). Analyze transaction data and provide actionable, data-driven forecasts.

You MUST respond with a valid JSON object (no markdown, no code blocks) with exactly this structure:
{
  "summary": "string — 1-2 sentence overall financial health assessment",
  "nextMonthPrediction": {
    "income": number (predicted income for next month),
    "expense": number (predicted expense for next month),
    "net": number (predicted net cashflow),
    "confidence": string ("high" | "medium" | "low")
  },
  "trends": ["string — list of 2-4 trend observations based on data"],
  "insights": ["string — list of 3-5 key insights from the data"],
  "recommendations": ["string — list of 3-5 actionable recommendations"],
  "riskAlerts": ["string — list of 1-3 risk warnings if applicable, or empty array if healthy"]
}

Rules:
- Base predictions on the actual numbers provided, don't make up random figures
- Use the trend percentages to project forward
- If there's very little data, set confidence to "low"
- Be specific with numbers from the data in your insights
- Consider Ethiopian business context in recommendations
- Return ONLY the JSON object, nothing else`;

  const userPrompt = `Analyze this financial transaction data and provide a forecast for the "${period}" period.

Financial Statistics:
${JSON.stringify(stats, null, 2)}

Provide your analysis as a JSON forecast.`;

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;

  if (!rawContent) {
    return {
      summary: 'Insufficient data to generate forecast.',
      nextMonthPrediction: { income: 0, expense: 0, net: 0, confidence: 'low' },
      trends: [],
      insights: ['Not enough transaction data available for meaningful analysis.'],
      recommendations: ['Continue recording transactions to enable better forecasts.'],
      riskAlerts: [],
    };
  }

  // Parse JSON response — handle potential markdown code block wrapping
  let parsed: Record<string, unknown>;
  try {
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If JSON parsing fails, return a structured fallback
    return {
      summary: 'Forecast generated but could not be fully structured.',
      nextMonthPrediction: {
        income: Number(stats.totalIncome) || 0,
        expense: Number(stats.totalExpense) || 0,
        net: (Number(stats.totalIncome) || 0) - (Number(stats.totalExpense) || 0),
        confidence: 'low',
      },
      trends: [],
      insights: [rawContent.substring(0, 500)],
      recommendations: ['Continue tracking transactions for better predictions.'],
      riskAlerts: [],
    };
  }

  return parsed;
}

// ============================================================
// GET — Forecast endpoint
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await ensureTransactionTable();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 500);

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly'];
    const actualPeriod = validPeriods.includes(period) ? period : 'monthly';

    // Build WHERE clause based on period and type
    const conditions: string[] = ['1=1'];

    if (type !== 'all') {
      const validTypes = ['income', 'expense'];
      if (validTypes.includes(type)) {
        conditions.push(`"type" = '${esc(type)}'`);
      }
    }

    if (actualPeriod === 'daily') {
      const fromDate = new Date(Date.now() - 1 * 86400000)
        .toISOString()
        .split('T')[0];
      conditions.push(`"date" >= '${fromDate}'`);
    } else if (actualPeriod === 'weekly') {
      const fromDate = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .split('T')[0];
      conditions.push(`"date" >= '${fromDate}'`);
    } else {
      const fromDate = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .split('T')[0];
      conditions.push(`"date" >= '${fromDate}'`);
    }

    const whereClause = conditions.join(' AND ');

    // Query transactions
    const transactions = await db.$queryRawUnsafe<TransactionRow[]>(
      `SELECT * FROM "Transaction" WHERE ${whereClause} ORDER BY "date" DESC LIMIT ${limit}`
    );

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        forecast: {
          summary: 'No transactions found for the selected period. Start recording transactions to enable financial forecasting.',
          nextMonthPrediction: { income: 0, expense: 0, net: 0, confidence: 'low' },
          trends: [],
          insights: ['No transaction data available.'],
          recommendations: ['Begin recording all income and expenses to unlock predictive analytics.'],
          riskAlerts: [],
        },
        stats: {
          totalTransactions: 0,
          totalIncome: 0,
          totalExpense: 0,
          avgDailyExpense: 0,
          topCategories: {},
          periodAnalyzed:
            actualPeriod === 'daily'
              ? 'Last 24 hours'
              : actualPeriod === 'weekly'
                ? 'Last 7 days'
                : 'Last 30 days',
        },
      });
    }

    // Calculate statistics from raw data
    const stats = calculateStats(transactions, actualPeriod);

    // Generate LLM-based forecast
    const forecast = await generateForecast(stats, actualPeriod);

    return NextResponse.json({
      success: true,
      forecast,
      stats: {
        totalTransactions: stats.totalTransactions,
        totalIncome: stats.totalIncome,
        totalExpense: stats.totalExpense,
        avgDailyExpense: stats.avgDailyExpense,
        topCategories: stats.topCategories,
        periodAnalyzed: stats.periodAnalyzed,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[forecast]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}