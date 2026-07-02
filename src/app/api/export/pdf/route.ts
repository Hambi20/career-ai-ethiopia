import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getContacts, ensureStoreWarmed, getCrmStats } from '@/lib/unified-store';

// ============================================================
// HELPERS
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

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

/** HTML-escape a string for safe rendering */
function h(s: unknown): string {
  const str = s === null || s === undefined ? '' : String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================
// SECTION BUILDERS
// ============================================================

interface ReportData {
  title: string;
  generatedAt: string;
  period: string;
}

async function buildFinanceSection(period: string): Promise<string> {
  const where = periodCondition(period, '"date"');
  const transactions = await db.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Transaction" WHERE ${where} ORDER BY "date" DESC LIMIT 200`
  );

  const statsRows = await db.$queryRawUnsafe<{ type: string; category: string; total: number }[]>(
    `SELECT "type", "category", SUM("amount") as "total" FROM "Transaction" WHERE ${where} GROUP BY "type", "category" ORDER BY "total" DESC`
  );

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown: string[] = [];

  for (const row of statsRows) {
    const amt = Number(row.total) || 0;
    if (row.type === 'income') totalIncome += amt;
    else totalExpense += amt;
    categoryBreakdown.push(
      `<tr><td>${h(row.category)}</td><td>${h(row.type)}</td><td class="amount">${formatCurrency(amt, 'ETB')}</td></tr>`
    );
  }

  const netProfit = totalIncome - totalExpense;

  let rowsHtml = '';
  for (const t of transactions) {
    const typeClass = t.type === 'income' ? 'income' : 'expense';
    rowsHtml += `<tr>
      <td>${h(t.date)}</td>
      <td><span class="badge ${typeClass}">${h(t.type)}</span></td>
      <td>${h(t.category)}</td>
      <td class="amount">${formatCurrency(t.amount, t.currency || 'ETB')}</td>
      <td>${h(t.description)}</td>
    </tr>`;
  }

  return `
    <section class="report-section">
      <h2>Financial Report</h2>
      <div class="stats-grid">
        <div class="stat-card income">
          <div class="stat-label">Total Income</div>
          <div class="stat-value">${formatCurrency(totalIncome, 'ETB')}</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Total Expenses</div>
          <div class="stat-value">${formatCurrency(totalExpense, 'ETB')}</div>
        </div>
        <div class="stat-card ${netProfit >= 0 ? 'net-positive' : 'net-negative'}">
          <div class="stat-label">Net Profit</div>
          <div class="stat-value">${formatCurrency(netProfit, 'ETB')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">${transactions.length}</div>
        </div>
      </div>

      ${categoryBreakdown.length > 0 ? `
      <div class="sub-section">
        <h3>Category Breakdown</h3>
        <table class="data-table">
          <thead><tr><th>Category</th><th>Type</th><th>Total</th></tr></thead>
          <tbody>${categoryBreakdown.join('\n')}</tbody>
        </table>
      </div>` : ''}

      <div class="sub-section">
        <h3>Transaction Details (${transactions.length} records)</h3>
        ${transactions.length > 0 ? `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>` : '<p class="empty-msg">No transactions found for this period.</p>'}
      </div>
    </section>`;
}

async function buildCalendarSection(period: string): Promise<string> {
  const where = periodCondition(period, '"date"');
  const events = await db.$queryRawUnsafe<any[]>(
    `SELECT * FROM "CalendarEvent" WHERE ${where} ORDER BY "date" ASC LIMIT 200`
  );

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter((e) => e.date >= today && e.status === 'upcoming').length;
  const completed = events.filter((e) => e.status === 'completed').length;
  const cancelled = events.filter((e) => e.status === 'cancelled').length;

  const byPriority: Record<string, number> = {};
  for (const e of events) {
    byPriority[e.priority] = (byPriority[e.priority] || 0) + 1;
  }

  let rowsHtml = '';
  for (const e of events) {
    const priorityClass = e.priority || 'medium';
    const timeDisplay = e.isAllDay ? 'All Day' : (e.time || '-');
    rowsHtml += `<tr>
      <td>${h(e.date)}</td>
      <td>${h(timeDisplay)}</td>
      <td>${h(e.title)}</td>
      <td>${h(e.type)}</td>
      <td><span class="badge priority-${priorityClass}">${h(e.priority)}</span></td>
      <td>${h(e.description)}</td>
    </tr>`;
  }

  return `
    <section class="report-section">
      <h2>Calendar Report</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Events</div>
          <div class="stat-value">${events.length}</div>
        </div>
        <div class="stat-card upcoming">
          <div class="stat-label">Upcoming</div>
          <div class="stat-value">${upcoming}</div>
        </div>
        <div class="stat-card completed">
          <div class="stat-label">Completed</div>
          <div class="stat-value">${completed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cancelled</div>
          <div class="stat-value">${cancelled}</div>
        </div>
      </div>

      <div class="sub-section">
        <h3>Priority Distribution</h3>
        <div class="priority-bars">
          ${Object.entries(byPriority).map(([p, count]) => {
            const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
            return `<div class="bar-row">
              <span class="bar-label">${h(p)}</span>
              <div class="bar-track"><div class="bar-fill priority-${p}" style="width:${pct}%"></div></div>
              <span class="bar-count">${count} (${pct}%)</span>
            </div>`;
          }).join('\n')}
        </div>
      </div>

      <div class="sub-section">
        <h3>Event Details (${events.length} records)</h3>
        ${events.length > 0 ? `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Time</th><th>Title</th><th>Type</th><th>Priority</th><th>Description</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>` : '<p class="empty-msg">No events found for this period.</p>'}
      </div>
    </section>`;
}

async function buildContactsSection(): Promise<string> {
  await ensureStoreWarmed();
  const contacts = getContacts();
  const crmStats = getCrmStats();

  let rowsHtml = '';
  for (const c of contacts.slice(0, 200)) {
    rowsHtml += `<tr>
      <td>${h(c.name)}</td>
      <td>${h(c.phone)}</td>
      <td>${h(c.email)}</td>
      <td>${h(c.company || c.business || '-')}</td>
      <td>${h(c.type || '-')}</td>
      <td>${h(c.notes || c.note || '-')}</td>
    </tr>`;
  }

  return `
    <section class="report-section">
      <h2>Contacts Report</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Contacts</div>
          <div class="stat-value">${crmStats.totalContacts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Customers</div>
          <div class="stat-value">${crmStats.customers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Dealers</div>
          <div class="stat-value">${crmStats.dealers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Upcoming Visits</div>
          <div class="stat-value">${crmStats.upcomingVisits}</div>
        </div>
      </div>

      <div class="sub-section">
        <h3>Contact List (${contacts.length} records)</h3>
        ${contacts.length > 0 ? `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Company</th><th>Type</th><th>Notes</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>` : '<p class="empty-msg">No contacts found.</p>'}
      </div>
    </section>`;
}

// ============================================================
// HTML TEMPLATE
// ============================================================

function buildHtmlReport(
  reportData: ReportData,
  sectionsHtml: string[]
): string {
  const periodLabel =
    reportData.period === 'all'
      ? 'All Time'
      : reportData.period.charAt(0).toUpperCase() + reportData.period.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${h(reportData.title)} — ${periodLabel}</title>
  <style>
    /* ── Base Reset & Typography ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: #ffffff;
      padding: 2rem;
    }

    /* ── Header ── */
    .report-header {
      text-align: center;
      padding: 2rem 0 1.5rem;
      border-bottom: 3px solid #e2e8f0;
      margin-bottom: 2rem;
    }
    .report-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }
    .report-meta {
      font-size: 0.875rem;
      color: #64748b;
    }

    /* ── Sections ── */
    .report-section {
      margin-bottom: 2.5rem;
      page-break-inside: avoid;
    }
    .report-section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1rem;
    }
    .sub-section {
      margin-top: 1.5rem;
    }
    .sub-section h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.75rem;
    }

    /* ── Stats Grid ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
    }
    .stat-card.income { border-left: 4px solid #10b981; }
    .stat-card.income .stat-value { color: #059669; }
    .stat-card.expense { border-left: 4px solid #ef4444; }
    .stat-card.expense .stat-value { color: #dc2626; }
    .stat-card.net-positive { border-left: 4px solid #10b981; }
    .stat-card.net-positive .stat-value { color: #059669; }
    .stat-card.net-negative { border-left: 4px solid #ef4444; }
    .stat-card.net-negative .stat-value { color: #dc2626; }
    .stat-card.upcoming { border-left: 4px solid #f59e0b; }
    .stat-card.upcoming .stat-value { color: #d97706; }
    .stat-card.completed { border-left: 4px solid #10b981; }
    .stat-card.completed .stat-value { color: #059669; }

    /* ── Data Tables ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .data-table thead th {
      background: #f1f5f9;
      font-weight: 600;
      text-align: left;
      padding: 0.625rem 0.75rem;
      border-bottom: 2px solid #cbd5e1;
      color: #334155;
      white-space: nowrap;
    }
    .data-table tbody td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .data-table tbody tr:nth-child(even) { background: #f8fafc; }
    .data-table tbody tr:hover { background: #f1f5f9; }
    .data-table .amount {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-align: right;
    }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge.income { background: #d1fae5; color: #065f46; }
    .badge.expense { background: #fee2e2; color: #991b1b; }
    .badge.priority-high { background: #fee2e2; color: #991b1b; }
    .badge.priority-medium { background: #fef3c7; color: #92400e; }
    .badge.priority-low { background: #d1fae5; color: #065f46; }

    /* ── Priority Bars ── */
    .priority-bars { margin-bottom: 0.5rem; }
    .bar-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .bar-label {
      width: 80px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #475569;
      text-align: right;
    }
    .bar-track {
      flex: 1;
      height: 16px;
      background: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }
    .bar-fill.priority-high { background: #ef4444; }
    .bar-fill.priority-medium { background: #f59e0b; }
    .bar-fill.priority-low { background: #10b981; }
    .bar-fill.priority-urgent { background: #7c3aed; }
    .bar-count {
      width: 100px;
      font-size: 0.8rem;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }

    /* ── Empty State ── */
    .empty-msg {
      text-align: center;
      color: #94a3b8;
      padding: 2rem;
      font-style: italic;
    }

    /* ── Footer ── */
    .report-footer {
      text-align: center;
      padding-top: 1.5rem;
      border-top: 2px solid #e2e8f0;
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* ── Print Actions ── */
    .print-actions {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      gap: 0.5rem;
      z-index: 100;
    }
    .print-btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .print-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
    .print-btn:active { transform: translateY(0); }
    .btn-primary { background: #0f172a; color: #fff; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }

    /* ── Print Styles ── */
    @media print {
      body { padding: 0; font-size: 12px; }
      .report-header h1 { font-size: 1.5rem; }
      .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
      .stat-card { padding: 0.625rem; }
      .stat-value { font-size: 1rem; }
      .data-table thead th { padding: 0.375rem 0.5rem; font-size: 0.8rem; }
      .data-table tbody td { padding: 0.375rem 0.5rem; font-size: 0.8rem; }
      .report-section { page-break-inside: avoid; margin-bottom: 1.5rem; }
      .print-actions { display: none !important; }
      .data-table tbody tr:hover { background: inherit; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${h(reportData.title)}</h1>
    <div class="report-meta">
      Period: <strong>${h(periodLabel)}</strong> &nbsp;|&nbsp; Generated: <strong>${h(reportData.generatedAt)}</strong>
    </div>
  </div>

  ${sectionsHtml.join('\n')}

  <div class="report-footer">
    Generated by Hambisa Executive &mdash; ${h(new Date().toISOString())}
  </div>

  <div class="print-actions">
    <button class="print-btn btn-secondary" onclick="window.close()">Close</button>
    <button class="print-btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <script>
    // Auto-trigger print dialog on load
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 500);
    });
  </script>
</body>
</html>`;
}

// ============================================================
// GET — HTML/PDF Export Endpoint
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'summary').toLowerCase();
    const period = (searchParams.get('period') || 'all').toLowerCase();

    // Validate type
    const validTypes = ['finance', 'calendar', 'summary'];
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

    // Ensure database tables
    await ensureTables();

    const reportData: ReportData = {
      title: 'Report',
      generatedAt: new Date().toLocaleString(),
      period,
    };

    const sections: string[] = [];

    switch (type) {
      case 'finance':
        reportData.title = 'Financial Report';
        sections.push(await buildFinanceSection(period));
        break;
      case 'calendar':
        reportData.title = 'Calendar Report';
        sections.push(await buildCalendarSection(period));
        break;
      case 'summary':
        reportData.title = 'Business Summary Report';
        sections.push(await buildFinanceSection(period));
        sections.push(await buildCalendarSection(period));
        sections.push(await buildContactsSection());
        break;
    }

    const html = buildHtmlReport(reportData, sections);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[export/pdf]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}