'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileBarChart, Users, Building2, Filter, RefreshCw, Calendar, TrendingUp,
  ChevronDown, ChevronUp, GraduationCap, Monitor, Briefcase,
  Landmark, ClipboardList, Clock, Database,
} from 'lucide-react';

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  romel: { label: 'Romel Sales', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: <Landmark className="h-4 w-4" /> },
  vd: { label: 'Vice Dean', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <GraduationCap className="h-4 w-4" /> },
  college: { label: 'College', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <GraduationCap className="h-4 w-4" /> },
  employee: { label: 'Employee', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', icon: <Users className="h-4 w-4" /> },
  tech: { label: 'Olbright Tech', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', icon: <Monitor className="h-4 w-4" /> },
  sales: { label: 'Sales', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <TrendingUp className="h-4 w-4" /> },
  application: { label: 'Applications', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: <Briefcase className="h-4 w-4" /> },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300', icon: <ClipboardList className="h-4 w-4" /> },
};

function fmtDateTime(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; }
}

const CACHE_KEY = 'hambisa-bot-reports';
const CACHE_TS = 'hambisa-reports-ts';

function loadCache(): any[] {
  if (typeof window === 'undefined') return [];
  try { const s = localStorage.getItem(CACHE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}

function saveCache(data: any[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data.slice(0, 200))); localStorage.setItem(CACHE_TS, Date.now().toString()); } catch { /* ignore */ }
}

export default function BotReportTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (typeFilter) params.set('type', typeFilter);
      if (companyFilter) params.set('company', companyFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/bot/reports?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        const apiReports = data.filtered || [];
        const cached = loadCache();
        const allIds = new Set(apiReports.map((r: any) => r.id));
        const merged = [...apiReports];
        for (const r of cached) {
          if (!allIds.has(r.id)) { merged.push(r); allIds.add(r.id); }
        }
        merged.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setReports(merged.slice(0, 100));
        if (merged.length > 0) saveCache(merged);
      }
    } catch { /* keep existing */ } finally { setLoading(false); }
  }, [period, typeFilter, companyFilter]);

  // Initial load from cache first, then fetch from API
  useEffect(() => {
    if (!initialized) {
      setReports(loadCache());
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Poll every 30s
  useEffect(() => {
    const i = setInterval(fetchReports, 30000);
    return () => clearInterval(i);
  }, [fetchReports]);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const todayCount = reports.filter((r: any) => r.date === today).length;
  const weekCount = reports.filter((r: any) => r.date >= weekAgo).length;
  const allTypes = [...new Set(reports.map((r: any) => r.type))];
  const allCompanies = [...new Set(reports.filter((r: any) => r.company).map((r: any) => r.company))];
  const byType: Record<string, number> = {};
  reports.forEach((r: any) => { byType[r.type] = (byType[r.type] || 0) + 1; });

  const filtered = reports.filter((r: any) => {
    if (period === 'daily' && !(new Date(r.timestamp) >= new Date(Date.now() - 86400000))) return false;
    if (period === 'weekly' && !(new Date(r.timestamp) >= new Date(Date.now() - 7 * 86400000))) return false;
    if (period === 'monthly' && !(new Date(r.timestamp) >= new Date(Date.now() - 30 * 86400000))) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    if (companyFilter && !(r.company || '').toLowerCase().includes(companyFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Card className="overflow-hidden border-0">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-6 py-5 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Bot Reports</h2>
                <p className="text-sm text-emerald-100">Reports synced from Telegram</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="text-emerald-100">Total</div>
                <div className="font-semibold text-lg">{reports.length}</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-emerald-100">Today</div>
                <div className="font-medium">{todayCount}</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-emerald-100">Week</div>
                <div className="font-medium">{weekCount}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchReports} disabled={loading}
                className="h-9 w-9 rounded-full bg-white/20 text-white hover:bg-white/30 hover:text-white">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* FILTERS */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filters:
            </div>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="sm:w-[150px]">
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Time</SelectItem>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="sm:w-[180px]">
                  <Building2 className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {allTypes.map((t: string) => (
                    <SelectItem key={t} value={t}>{(typeConfig[t] || typeConfig.general).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="sm:w-[180px]">
                  <Building2 className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Companies</SelectItem>
                  {allCompanies.map((c: string) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TYPE CARDS */}
      {Object.keys(byType).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {Object.entries(byType).map(([type, count]) => {
            const cfg = typeConfig[type] || typeConfig.general;
            return (
              <Card key={type} className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => setTypeFilter(p => p === type ? '' : type)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`rounded-lg p-2 ${cfg.color.split(' ')[0]}`}>{cfg.icon}</div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
                    <p className="text-xl font-bold">{count as number}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* REPORTS LIST */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-4 w-4 text-emerald-500" />
            Reports
            <Badge variant="secondary" className="ml-auto">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && reports.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : filtered.length > 0 ? (
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
              {filtered.map((report: any) => {
                const cfg = typeConfig[report.type] || typeConfig.general;
                const expanded = expandedId === report.id;
                return (
                  <div key={report.id} className="rounded-lg border transition-all hover:border-emerald-200 dark:hover:border-emerald-800">
                    <div className="flex cursor-pointer items-center gap-3 px-4 py-3"
                      onClick={() => setExpandedId(p => p === report.id ? null : report.id)}>
                      <div className={`shrink-0 rounded-lg p-2 ${cfg.color.split(' ')[0]}`}>{cfg.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{report.title}</p>
                          {report.company && <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">{report.company}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{fmtDateTime(report.timestamp)}
                          </span>
                        </div>
                        {!expanded && report.content && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{report.content.substring(0, 150)}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-muted-foreground">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="border-t bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Full Report:</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(report.date)}</span>
                          {report.company && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{report.company}</Badge>}
                        </div>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed break-words font-sans max-h-[400px] overflow-y-auto">
                          {report.content}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-emerald-50 p-5 dark:bg-emerald-950/40">
                <Database className="h-10 w-10 text-emerald-300" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">No reports yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70 max-w-sm">Send reports from Telegram:</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['/romel', '/vicereport', '/reportcollege', '/log', '/college', '/tech', '/apply'].map(cmd => (
                  <Badge key={cmd} variant="outline" className="text-xs">{cmd}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
