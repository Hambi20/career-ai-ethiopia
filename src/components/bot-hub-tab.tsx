'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BarChart3, Search, Smartphone, Users, Activity, Code, Wifi, WifiOff } from 'lucide-react';
import { useBotData } from '@/lib/bot-data-context';

const sections = ['command-center', 'live-jobs', 'my-bots', 'users', 'activity', 'api-docs'] as const;
const sectionLabels: Record<string, string> = { 'command-center': 'Command Center', 'live-jobs': 'Live Jobs', 'my-bots': 'My Bots', 'users': 'Users', 'activity': 'Activity', 'api-docs': 'API Docs' };
const sectionIcons: Record<string, any> = { 'command-center': BarChart3, 'live-jobs': Search, 'my-bots': Smartphone, 'users': Users, 'activity': Activity, 'api-docs': Code };

export function BotHubTab() {
  const { botData, tabData } = useBotData();
  const [activeSection, setActiveSection] = useState<string>('command-center');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const stats = tabData?.telegramStats;
  const isOnline = botData.hasData || botData.syncCount > 0;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/jobs/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery, limit: 20 }) });
      const data = await res.json();
      if (data.success) { setSearchResults(data.jobs || []); toast.success(`Found ${(data.jobs || []).length} jobs`); }
    } catch { toast.error('Search failed'); }
    setIsSearching(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {sections.map(s => (
          <Button key={s} variant={activeSection === s ? 'default' : 'outline'} size="sm"
            className={`gap-1.5 text-xs flex-shrink-0 ${activeSection === s ? 'bg-emerald-600 text-white' : ''}`}
            onClick={() => setActiveSection(s)}>
            {(() => { const Icon = sectionIcons[s]; return <Icon className="w-3.5 h-3.5" /> })()}
            <span className="hidden sm:inline">{sectionLabels[s]}</span>
          </Button>
        ))}
      </div>

      {activeSection === 'command-center' && (
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {isOnline ? <Wifi className="w-6 h-6 text-emerald-600" /> : <WifiOff className="w-6 h-6 text-red-500" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{isOnline ? 'Bot Connected' : 'Bot Offline'}</h2>
                  <p className="text-xs text-muted-foreground">{isOnline ? `Last sync: ${botData.updatedAt ? new Date(botData.updatedAt).toLocaleString() : 'Unknown'}` : 'No sync data received yet'}</p>
                </div>
                <Badge className={isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Total Users', v: stats?.totalUsers || (isOnline ? 1 : 0), i: Users },
              { l: 'Premium', v: stats?.premiumUsers || (isOnline ? 1 : 0), i: BarChart3 },
              { l: 'Activities Today', v: stats?.todayActivities || botData.syncCount || 0, i: Activity },
              { l: 'Errors', v: stats?.errorCount || 0, i: WifiOff },
            ].map(s => (
              <Card key={s.l}><CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-1"><s.i className="w-4 h-4 text-emerald-600" /></div>
                <p className="text-lg font-bold">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p>
              </CardContent></Card>
            ))}
          </div>

          {stats?.bots && stats.bots.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Registered Bots</CardTitle></CardHeader>
              <CardContent><div className="space-y-2">
                {stats.bots.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg border">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <div className="flex-1"><p className="text-sm font-medium">{b.name || b.username}</p><p className="text-[10px] text-muted-foreground">{b.botType} • {b.isOnline ? '🟢 Online' : '⚫ Offline'}</p></div>
                    <Badge variant="outline" className="text-[10px]">{b.totalUsers || 0} users</Badge>
                  </div>
                ))}
              </div></CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSection === 'live-jobs' && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Live Job Search</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2"><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search for jobs..." className="h-9" onKeyDown={e => e.key === 'Enter' && handleSearch()} /><Button onClick={handleSearch} disabled={isSearching} className="bg-emerald-600 text-white h-9 gap-1"><Search className="w-4 h-4" />Search</Button></div>
            {searchResults.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">{searchResults.map((j: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 hover:bg-muted/30"><p className="text-sm font-medium">{j.title}</p><p className="text-xs text-muted-foreground">{j.company} • {j.location}</p></div>
              ))}</div>
            ) : (
              <div className="text-center py-6 text-muted-foreground"><Search className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Search for jobs to see results here</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === 'users' && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bot Users</CardTitle></CardHeader>
          <CardContent>
            {tabData?.telegramUsers && tabData.telegramUsers.length > 0 ? (
              <div className="space-y-2">{tabData.telegramUsers.map((u: any, i: number) => (
                <div key={u.id || i} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">{(u.firstName || 'U')[0]}</div>
                  <div className="flex-1"><p className="text-sm font-medium">{u.firstName || u.name} {u.lastName || ''}</p><p className="text-[10px] text-muted-foreground">@{u.username || 'unknown'}</p></div>
                  {u.isPremium && <Badge className="bg-amber-100 text-amber-800 text-[10px]">⭐ Premium</Badge>}
                </div>
              ))}</div>
            ) : (
              <div className="text-center py-6 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No bot users synced yet</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === 'activity' && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {tabData?.telegramActivities && tabData.telegramActivities.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">{tabData.telegramActivities.slice(0, 20).map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-center gap-3 p-2 rounded-lg border">
                  <Activity className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{a.command || a.action || 'Activity'}</p><p className="text-[10px] text-muted-foreground">{a.botName || 'Bot'} • {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p></div>
                  <Badge variant="outline" className={`text-[9px] ${a.status === 'error' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>{a.status || 'success'}</Badge>
                </div>
              ))}</div>
            ) : (
              <div className="text-center py-6 text-muted-foreground"><Activity className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No recent activity</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === 'api-docs' && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">API Documentation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                { method: 'POST', path: '/api/bot/sync', desc: 'Sync bot data to web' },
                { method: 'GET', path: '/api/bot/data', desc: 'Get all bot data' },
                { method: 'GET', path: '/api/telegram/stats', desc: 'Bot statistics' },
                { method: 'GET', path: '/api/crm/contacts', desc: 'CRM contacts' },
                { method: 'GET', path: '/api/knowledge', desc: 'Knowledge library' },
                { method: 'POST', path: '/api/tasks', desc: 'Create task' },
              ].map(api => (
                <div key={api.path} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                  <Badge className={`text-[10px] font-mono ${api.method === 'GET' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>{api.method}</Badge>
                  <code className="text-xs font-mono flex-1">{api.path}</code>
                  <span className="text-[10px] text-muted-foreground">{api.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
