'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Briefcase, Clock, Target, CheckCircle2, Send } from 'lucide-react';
import { useBotData } from '@/lib/bot-data-context';

export function DashboardTab() {
  const { botData, tabData, hasData } = useBotData();

  const summary = botData.summary;
  const apps = tabData?.applications || [];

  const pending = apps.filter((a: any) => a.status === 'pending_review').length;
  const approved = apps.filter((a: any) => a.status === 'approved').length;
  const submitted = apps.filter((a: any) => a.status === 'submitted').length;

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">H</div>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Welcome back, Hambisa!</h2>
              <p className="text-sm text-emerald-700">
                {summary.totalTasks > 0
                  ? `You have ${summary.tasksTodo} task(s) pending and ${summary.tasksDone} completed.`
                  : pending > 0
                    ? `You have ${pending} job(s) to review.`
                    : submitted > 0
                      ? `${submitted} application(s) sent!`
                      : hasData ? 'Dashboard is synced and ready.' : 'Use /syncweb in your Telegram bot to sync data.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Tasks', c: summary.totalTasks, i: Target, color: 'text-emerald-600' },
          { l: 'Contacts', c: summary.totalContacts, i: CheckCircle2, color: 'text-amber-600' },
          { l: 'Knowledge', c: summary.totalKnowledge, i: Briefcase, color: 'text-sky-600' },
          { l: 'Syncs', c: summary.totalSyncs, i: Send, color: 'text-purple-600' },
        ].map(s => (
          <Card key={s.l}><CardContent className="p-3 text-center">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1"><s.i className={`w-5 h-5 ${s.color}`} /></div>
            <p className="text-2xl font-bold">{s.c}</p><p className="text-xs text-muted-foreground">{s.l}</p>
          </CardContent></Card>
        ))}
      </div>

      {summary.totalRomelReports > 0 && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Latest Sales Report</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Daily Target', v: (botData.sales as any)?.totalDailyTarget || 0 },
                { l: 'Daily Actual', v: (botData.sales as any)?.totalDailyActual || 0 },
                { l: 'Achievement', v: `${summary.dailyAchievementRate}%` },
              ].map(s => (
                <div key={s.l} className="text-center p-2 rounded-lg bg-muted/30"><p className="text-lg font-bold">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Quick Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { l: 'Tasks', done: summary.tasksDone, total: summary.totalTasks },
              { l: 'Reports', done: summary.totalRomelReports, total: summary.totalRomelReports + summary.totalVdReports },
              { l: 'Notes', done: summary.totalNotes, total: summary.totalNotes },
              { l: 'Contacts', done: summary.totalContacts, total: summary.totalContacts },
            ].map(item => (
              <div key={item.l} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-sm flex-1">{item.l}</span>
                <span className="text-xs text-muted-foreground">{item.done}/{item.total}</span>
                <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.total > 0 ? (item.done / item.total * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
