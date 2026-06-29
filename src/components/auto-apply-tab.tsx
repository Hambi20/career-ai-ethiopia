'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Zap, Play, Square, Settings, Activity, MapPin,
  Search, Hash, FileText, CircleDot, CircleCheck,
  CircleX, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AutoApplyTab() {
  const { tabData } = useBotData();
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState({
    searchQuery: (tabData.profile?.targetRole as string) || '',
    location: (tabData.profile?.location as string) || 'Addis Ababa, Ethiopia',
    dailyLimit: 10,
    autoMatch: true,
    autoSend: false,
  });

  const logs: Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }> = [
    { time: '10:32 AM', message: 'Auto-apply system initialized', type: 'info' },
    { time: '10:31 AM', message: 'Last run completed: 3 jobs matched, 0 applied', type: 'success' },
    { time: '09:15 AM', message: 'No new matching jobs found in previous cycle', type: 'info' },
  ];

  const handleRun = () => {
    if (!settings.searchQuery.trim()) {
      toast.error('Please enter a search query first');
      return;
    }
    setRunning(true);
    toast.success('Auto-apply started', { description: `Searching for "${settings.searchQuery}" in ${settings.location}` });
    setTimeout(() => setRunning(false), 5000);
  };

  const logIcon = (type: string) => {
    switch (type) {
      case 'success': return <CircleCheck className="size-3.5 text-emerald-500 shrink-0" />;
      case 'error': return <CircleX className="size-3.5 text-red-500 shrink-0" />;
      default: return <CircleDot className="size-3.5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={running ? 'border-emerald-300 bg-emerald-50/30' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex size-12 items-center justify-center rounded-xl ${running ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                {running ? (
                  <Activity className="size-6 text-emerald-600 animate-pulse" />
                ) : (
                  <Zap className="size-6 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Auto-Apply Engine</h3>
                  <Badge variant={running ? 'default' : 'outline'} className={running ? 'bg-emerald-600' : ''}>
                    <span className={`size-1.5 rounded-full ${running ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                    {running ? 'Running' : 'Idle'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {running ? 'Scanning job boards and applying to matches...' : 'Ready to find and apply to jobs automatically'}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className={running ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={running ? () => { setRunning(false); toast.info('Auto-apply stopped'); } : handleRun}
            >
              {running ? <Square className="size-4" /> : <Play className="size-4" />}
              {running ? 'Stop' : 'Run Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Auto-Apply Settings</CardTitle>
          </div>
          <CardDescription>Configure what jobs to search for and how to apply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="search-query" className="flex items-center gap-1.5">
                <Search className="size-3.5 text-muted-foreground" />
                Search Query
              </Label>
              <Input
                id="search-query"
                placeholder="e.g. Software Engineer, Project Manager"
                value={settings.searchQuery}
                onChange={(e) => setSettings(s => ({ ...s, searchQuery: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location" className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g. Addis Ababa, Ethiopia"
                value={settings.location}
                onChange={(e) => setSettings(s => ({ ...s, location: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="daily-limit" className="flex items-center gap-1.5">
                <Hash className="size-3.5 text-muted-foreground" />
                Daily Application Limit
              </Label>
              <Input
                id="daily-limit"
                type="number"
                min={1}
                max={50}
                value={settings.dailyLimit}
                onChange={(e) => setSettings(s => ({ ...s, dailyLimit: parseInt(e.target.value) || 10 }))}
              />
              <p className="text-xs text-muted-foreground">Maximum number of applications per day (1-50)</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-match with CV</Label>
                <p className="text-xs text-muted-foreground">Only apply to jobs matching your profile</p>
              </div>
              <Switch
                checked={settings.autoMatch}
                onCheckedChange={(c) => setSettings(s => ({ ...s, autoMatch: c }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-send applications</Label>
                <p className="text-xs text-muted-foreground">Send applications without manual review</p>
              </div>
              <Switch
                checked={settings.autoSend}
                onCheckedChange={(c) => setSettings(s => ({ ...s, autoSend: c }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Recent Logs</CardTitle>
          </div>
          <CardDescription>Activity history of the auto-apply engine</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <Activity className="size-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Configure your auto-apply settings</p>
              <p className="text-sm text-muted-foreground mt-1">
                Set your search query and location, then click Run to start.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2 pr-2">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    {logIcon(log.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.message}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        {log.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}