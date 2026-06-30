'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [period, setPeriod] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period && period !== 'all') params.set('period', period);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      if (companyFilter && companyFilter !== 'all') params.set('company', companyFilter);
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
        merged.sort((a: any, b: any) => {
          const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
          const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
          return tb - ta;
        });
        setReports(merged.slice(0, 100));
        if (merged.length > 0) saveCache(merged);
      }
    } catch { /* keep existing */ } finally { setLoading(false); }
  }, [period, typeFilter, companyFilter]);

  // Initial load from cache first, then fetch from API
  useEffect(() => {
    if (!initialized) {
      const cached = loadCache();
      if (cached.length > 0) setReports(cached);
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
  const todayCount = reports.filter((r: any) => {
    const d = r.date || (r.timestamp || '').split('T')[0];
    return d === today;
  }).length;
  const weekCount = reports.filter((r: any) => {
    const d = r.date || (r.timestamp || '').split('T')[0];
    return d >= weekAgo;
  }).length;
  const allTypes = [...new Set(reports.map((r: any) => r.type).filter(Boolean))];
  const allCompanies = [...new Set(reports.map((r: any) => r.company).filter(Boolean))];
  const byType: Record<string, number> = {};
  reports.forEach((r: any) => {
    const t = r.type || 'general';
    byType[t] = (byType[t] || 0) + 1;
  });

  const filtered = reports.filter((r: any) => {
    const ts = new Date(r.timestamp || r.createdAt || 0).getTime();
    if (period === 'daily' && !(ts >= Date.now() - 86400000)) return false;
    if (period === 'weekly' && !(ts >= Date.now() - 7 * 86400000)) return false;
    if (period === 'monthly' && !(ts >= Date.now() - 30 * 86400000)) return false;
    if (typeFilter && typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (companyFilter && companyFilter !== 'all' && !(r.company || '').toLowerCase().includes(companyFilter.toLowerCase())) return false;
    return true;
  });

  const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1";

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
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select className={selectClass + " sm:w-[150px]"} value={period} onChange={e => setPeriod(e.target.value)}>
                  <option value="all">All Time</option>
                  <option value="daily">Today</option>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select className={selectClass + " sm:w-[180px]"} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  {allTypes.map((t: string) => (
                    <option key={t} value={t}>{(typeConfig[t] || typeConfig.general).label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select className={selectClass + " sm:w-[180px]"} value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
                  <option value="all">All Companies</option>
                  {allCompanies.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TYPE CARDS */}
      {Object.keys(byType).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {Object.entries(byType).map(([type, count]) => {
            const cfg = typeConfig[type] || typeConfig.general;
            const isActive = typeFilter === type;
            return (
              <Card key={type} className={`cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2 ring-emerald-500 border-emerald-300' : ''}`}
                onClick={() => setTypeFilter(p => p === type ? 'all' : type)}>
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
                const reportContent = report.content || report.report || report.details || '';
                return (
                  <div key={report.id} className="rounded-lg border transition-all hover:border-emerald-200 dark:hover:border-emerald-800">
                    <div className="flex cursor-pointer items-center gap-3 px-4 py-3"
                      onClick={() => setExpandedId(p => p === report.id ? null : report.id)}>
                      <div className={`shrink-0 rounded-lg p-2 ${cfg.color.split(' ')[0]}`}>{cfg.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{report.title || 'Untitled'}</p>
                          {report.company && <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">{report.company}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{fmtDateTime(report.timestamp || report.createdAt)}
                          </span>
                        </div>
                        {!expanded && reportContent && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reportContent.substring(0, 150)}</p>
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
                          <span className="text-xs text-muted-foreground">{fmtDate(report.date || (report.timestamp || '').split('T')[0])}</span>
                          {report.company && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{report.company}</Badge>}
                        </div>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed break-words font-sans max-h-[400px] overflow-y-auto">
                          {reportContent}
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
