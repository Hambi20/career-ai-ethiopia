'use client';

import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wifi, WifiOff, RefreshCw, FileBarChart, ListChecks, Users,
  BookOpen, StickyNote, TrendingUp, Database, Phone, Tag,
  CircleCheck, CircleDot, Clock, AlertCircle, ChevronRight,
} from 'lucide-react';

/* ── helpers ── */
const fmtNum = (n: number) => (n ?? 0).toLocaleString();
const fmtPct = (n: number) => `${(n ?? 0).toFixed(1)}%`;
const fmtTime = (iso: string | null) => {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'Unknown'; }
};

const priorityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
const statusIcon: Record<string, React.ReactNode> = {
  done: <CircleCheck className="h-4 w-4 text-emerald-500" />,
  in_progress: <CircleDot className="h-4 w-4 text-blue-500" />,
  todo: <Clock className="h-4 w-4 text-muted-foreground" />,
  cancelled: <AlertCircle className="h-4 w-4 text-red-400" />,
};

/* ── main component ── */
export default function BotReportTab() {
  const { botData, refresh, loading, hasData, tasks, notes, contacts, knowledge, reports, vdReports } = useBotData();
  const s = botData.summary;
  const latestReport = botData.sales?.latestReport;
  const isLive = hasData || s.totalSyncs > 0;

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER CARD ── */}
      <Card className="overflow-hidden border-0">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                {isLive ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Bot Sync Dashboard</h2>
                <p className="text-sm text-emerald-100">
                  {isLive ? 'Connected & syncing data' : 'Waiting for first sync'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="text-emerald-100">Last Sync</div>
                <div className="font-medium">{fmtTime(s.lastSync)}</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-emerald-100">Records</div>
                <div className="font-semibold text-lg">{fmtNum(s.totalRomelReports + s.totalTasks + s.totalContacts + s.totalNotes + s.totalKnowledge + s.totalVdReports)}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refresh(false)}
                disabled={loading}
                className="h-9 w-9 rounded-full bg-white/20 text-white hover:bg-white/30 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. STATS GRID ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Romel Reports', value: fmtNum(s.totalRomelReports), icon: <FileBarChart className="h-4 w-4" />, accent: 'text-emerald-600' },
          { label: 'Tasks', value: `${fmtNum(s.totalTasks)}`, sub: `${fmtPct(s.taskCompletionRate)} done`, icon: <ListChecks className="h-4 w-4" />, accent: 'text-blue-600' },
          { label: 'Contacts', value: fmtNum(s.totalContacts), icon: <Users className="h-4 w-4" />, accent: 'text-violet-600' },
          { label: 'Knowledge', value: fmtNum(s.totalKnowledge), icon: <BookOpen className="h-4 w-4" />, accent: 'text-amber-600' },
          { label: 'Notes', value: fmtNum(s.totalNotes), icon: <StickyNote className="h-4 w-4" />, accent: 'text-pink-600' },
          { label: 'VD Reports', value: fmtNum(s.totalVdReports), icon: <TrendingUp className="h-4 w-4" />, accent: 'text-orange-600' },
          { label: 'Achievement Rate', value: fmtPct(s.dailyAchievementRate), icon: <Database className="h-4 w-4" />, accent: 'text-teal-600' },
          { label: 'Total Syncs', value: fmtNum(s.totalSyncs), icon: <RefreshCw className="h-4 w-4" />, accent: 'text-slate-600' },
        ].map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
                  {stat.sub && <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>}
                </div>
                <div className="rounded-lg bg-muted p-2">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 3. LATEST ROMEL REPORT ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-4 w-4 text-emerald-500" />
            Latest Romel Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestReport ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Date', value: latestReport.date || latestReport.createdAt || '—' },
                { label: 'Daily Target', value: fmtNum(latestReport.dailyTarget ?? latestReport.target ?? 0) },
                { label: 'Actual Sales', value: fmtNum(latestReport.actualSales ?? latestReport.actual ?? 0) },
                { label: 'MTD Sales', value: fmtNum(latestReport.mtdSales ?? latestReport.mtd ?? 0) },
                { label: 'Visits', value: fmtNum(latestReport.visits ?? 0) },
                { label: 'Effective Calls', value: fmtNum(latestReport.effectiveCalls ?? 0) },
                ...(latestReport.target !== undefined ? [{ label: 'Achievement', value: fmtPct((latestReport.actual ?? 0) / (latestReport.target || 1) * 100) }] : []),
                ...(latestReport.newAccounts !== undefined ? [{ label: 'New Accounts', value: fmtNum(latestReport.newAccounts) }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold">{row.value}</span>
                </div>
              ))}
              {latestReport.notes && (
                <div className="sm:col-span-2 lg:col-span-3 rounded-lg border px-3 py-2">
                  <span className="text-sm text-muted-foreground">Notes: </span>
                  <span className="text-sm">{String(latestReport.notes)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-emerald-50 p-4 dark:bg-emerald-950/40">
                <FileBarChart className="h-8 w-8 text-emerald-300" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No reports yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">/syncweb</code> in your Telegram bot.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. TASKS ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-blue-500" />
            Tasks
            {tasks.length > 0 && <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {tasks.slice(0, 20).map((t: any, i: number) => (
                <div key={t.id ?? i} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50">
                  {statusIcon[t.status] || statusIcon.todo}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title || t.name || 'Untitled'}</p>
                    {(t.description || t.dueDate) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {t.description && String(t.description).substring(0, 60)}
                        {t.description && t.dueDate ? ' · ' : ''}
                        {t.dueDate && `Due ${fmtTime(t.dueDate)}`}
                      </p>
                    )}
                  </div>
                  {t.priority && (
                    <Badge variant="outline" className={priorityColor[t.priority] || ''}>
                      {String(t.priority)}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No tasks synced yet</p>
          )}
        </CardContent>
      </Card>

      {/* ── 5. CONTACTS ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-violet-500" />
            Contacts
            {contacts.length > 0 && <Badge variant="secondary" className="ml-auto">{contacts.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.slice(0, 12).map((c: any, i: number) => (
                <div key={c.id ?? i} className="flex items-center gap-3 rounded-lg border px-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                    {(c.name || c.firstName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.type && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{String(c.type)}</Badge>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{String(c.phone)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No contacts synced yet</p>
          )}
        </CardContent>
      </Card>

      {/* ── 6. NOTES ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-pink-500" />
            Notes
            {notes.length > 0 && <Badge variant="secondary" className="ml-auto">{notes.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length > 0 ? (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {notes.slice(0, 15).map((n: any, i: number) => (
                <div key={n.id ?? i} className="rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{n.title || n.name || 'Untitled Note'}</p>
                    {n.category && (
                      <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" />{String(n.category)}
                      </Badge>
                    )}
                  </div>
                  {n.content && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String(n.content).substring(0, 140)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No notes synced yet</p>
          )}
        </CardContent>
      </Card>

      {/* ── 7. KNOWLEDGE BASE ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-amber-500" />
            Knowledge Base
            {knowledge.length > 0 && <Badge variant="secondary" className="ml-auto">{knowledge.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {knowledge.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {knowledge.slice(0, 12).map((k: any, i: number) => (
                <div key={k.id ?? i} className="flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{k.title || k.name || 'Untitled'}</p>
                    {k.category && (
                      <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" />{String(k.category)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No knowledge base synced yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}