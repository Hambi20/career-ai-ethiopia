import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const info: Record<string, unknown> = {};
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const atIndex = dbUrl.indexOf('@');
  info.database_url_masked = atIndex > 0 ? dbUrl.substring(0, dbUrl.indexOf('://') + 3) + '***' + dbUrl.substring(atIndex) : dbUrl.substring(0, 30) + '...';
  info.database_type = dbUrl.startsWith('postgres') ? 'PostgreSQL' : dbUrl.startsWith('file:') ? 'SQLite' : 'Unknown';
  info.node_env = process.env.NODE_ENV || 'not set';
  info.webhook_version = 'v5-final';

  try {
    const result = await db.$queryRawUnsafe(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BotReport') as exists"
    ) as Array<{ exists: boolean }>;
    info.botreport_table_exists = result[0]?.exists;
  } catch (err: unknown) {
    info.botreport_table_check_error = err instanceof Error ? err.message : String(err);
  }

  try {
    info.report_count = await db.botReport.count();
  } catch (err: unknown) {
    info.report_count_error = err instanceof Error ? err.message : String(err);
  }

  try {
    const now = new Date().toISOString();
    const test = await db.botReport.create({
      data: { type: 'debug', company: 'System', category: 'debug', title: 'Debug Test ' + now, content: 'Diagnostic test.', date: now.split('T')[0], timestamp: now },
    });
    info.test_write_success = true;
    info.test_report_id = test.id;
    await db.botReport.delete({ where: { id: test.id } });
    info.test_delete_success = true;
  } catch (err: unknown) {
    info.test_write_error = err instanceof Error ? err.message : String(err);
  }

  try {
    const latest = await db.botReport.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, type: true, company: true, title: true, date: true, createdAt: true } });
    info.latest_reports = latest.map(r => ({ id: r.id, type: r.type, company: r.company, title: r.title?.slice(0, 50), date: r.date, createdAt: r.createdAt?.toISOString() }));
  } catch (err: unknown) {
    info.latest_reports_error = err instanceof Error ? err.message : String(err);
  }

  info.has_bot_token = !!process.env.TELEGRAM_BOT_TOKEN || !!process.env.BOT_TOKEN;
  info.has_groq_key = !!process.env.GROQ_API_KEY;
  info.vercel_url = process.env.VERCEL_URL || 'not set';
  return NextResponse.json(info);
}
