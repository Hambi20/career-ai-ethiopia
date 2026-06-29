'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase, Clock, CheckCircle2, XCircle, Send,
  Building2, TrendingUp, CalendarDays, ExternalLink,
  FileSearch, BarChart3,
} from 'lucide-react';

type AppStatus = 'all' | 'pending' | 'approved' | 'sent' | 'rejected';

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; badgeCls: string }> = {
  pending: { label: 'Pending', icon: <Clock className="size-3.5" />, color: 'bg-amber-50 text-amber-700', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', icon: <CheckCircle2 className="size-3.5" />, color: 'bg-emerald-50 text-emerald-700', badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  sent: { label: 'Sent', icon: <Send className="size-3.5" />, color: 'bg-blue-50 text-blue-700', badgeCls: 'bg-blue-100 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', icon: <XCircle className="size-3.5" />, color: 'bg-red-50 text-red-700', badgeCls: 'bg-red-100 text-red-700 border-red-200' },
};

export default function ApplicationsTab() {
  const { tabData } = useBotData();
  const [statusFilter, setStatusFilter] = useState<AppStatus>('all');
  const applications = tabData.applications || [];

  const filtered = applications.filter(
    (a: any) => statusFilter === 'all' || a.status === statusFilter
  );

  const counts = {
    pending: applications.filter((a: any) => a.status === 'pending').length,
    approved: applications.filter((a: any) => a.status === 'approved').length,
    sent: applications.filter((a: any) => a.status === 'sent').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
  };

  const statCards = [
    { label: 'Pending', count: counts.pending, icon: <Clock className="size-5 text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Approved', count: counts.approved, icon: <CheckCircle2 className="size-5 text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Sent', count: counts.sent, icon: <Send className="size-5 text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Rejected', count: counts.rejected, icon: <XCircle className="size-5 text-red-500" />, bg: 'bg-red-50', border: 'border-red-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className={`${s.bg} ${s.border}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white/80 shadow-sm">
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="size-5 text-emerald-600" />
              <CardTitle className="text-lg">Applications</CardTitle>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {applications.length}
              </Badge>
            </div>
            <Badge variant="outline" className="text-xs gap-1">
              <BarChart3 className="size-3" />
              {applications.length > 0
                ? `${Math.round((counts.approved / applications.length) * 100)}% success`
                : 'No data'}
            </Badge>
          </div>
          <CardDescription>Track all your job applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppStatus)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <FileSearch className="size-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Use Search &amp; Apply to find and submit job applications. They will appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3 pr-2">
                {filtered.map((app: any, i: number) => {
                  const st = STATUS_MAP[app.status] || STATUS_MAP.pending;
                  const score = app.matchScore ?? app.score ?? null;
                  return (
                    <div
                      key={app.id || i}
                      className="flex items-start gap-4 rounded-lg border p-4 hover:bg-emerald-50/50 transition-colors"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Building2 className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{app.jobTitle || app.title || 'Untitled Position'}</p>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${st.badgeCls}`}>
                            {st.icon}
                            {st.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3" />
                          {app.company || 'Unknown Company'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {score !== null && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="size-3 text-emerald-500" />
                              <span className="font-medium text-emerald-700">{score}%</span> match
                            </span>
                          )}
                          {app.createdAt && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {score !== null && (
                          <Progress value={score} className="h-1.5 [&>div]:bg-emerald-500" />
                        )}
                      </div>
                      {app.url && (
                        <ExternalLink className="size-4 text-muted-foreground shrink-0 mt-1 cursor-pointer hover:text-emerald-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}