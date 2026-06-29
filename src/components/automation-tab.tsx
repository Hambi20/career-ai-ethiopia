'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Zap, Plus, Clock, Play, CheckCircle2, Pause,
  Settings, Loader2, Calendar, AlertCircle, ArrowRight
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  triggerType: string;
  triggerValue: string;
  action: string;
  active: boolean;
  lastRun: string | null;
  runCount: number;
  createdAt: string;
}

const TRIGGER_TYPES = [
  { value: 'schedule', label: 'Schedule', icon: Clock },
  { value: 'new_job', label: 'New Job Match', icon: Zap },
  { value: 'application_status', label: 'Application Status Change', icon: Play },
  { value: 'score_threshold', label: 'Score Threshold', icon: CheckCircle2 },
];

export function AutomationTab() {
  const { tabData } = useBotData();
  const rules: AutomationRule[] = tabData.automationRules || [];
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', triggerType: 'schedule', triggerValue: '', action: 'notify' });
  const [toggling, setToggling] = useState<string | null>(null);

  const activeRules = rules.filter(r => r.active);
  const triggersToday = rules.filter(r => r.lastRun && new Date(r.lastRun).toDateString() === new Date().toDateString()).length;

  const stats = [
    { label: 'Total Rules', value: rules.length, icon: Settings, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Active', value: activeRules.length, icon: Play, color: 'bg-sky-100 text-sky-700' },
    { label: 'Triggers Today', value: triggersToday, icon: Zap, color: 'bg-amber-100 text-amber-700' },
  ];

  const handleCreate = async () => {
    if (!newRule.name) { toast.error('Rule name is required'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      const data = await res.json();
      if (data.success) { toast.success('Rule created!'); setShowCreate(false); setNewRule({ name: '', triggerType: 'schedule', triggerValue: '', action: 'notify' }); }
      else toast.error(data.error || 'Failed to create');
    } catch { toast.error('Failed to create rule'); }
    setCreating(false);
  };

  const toggleRule = async (id: string, active: boolean) => {
    setToggling(id);
    try {
      const res = await fetch('/api/automation/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      });
      const data = await res.json();
      if (data.success) toast.success(active ? 'Rule paused' : 'Rule activated');
      else toast.error('Failed to toggle');
    } catch { toast.error('Failed to toggle rule'); }
    setToggling(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Automation Rules</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> Create Rule
        </Button>
      </div>

      {/* Rules List */}
      {rules.length > 0 ? (
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {rules.map(rule => {
              const trigger = TRIGGER_TYPES.find(t => t.value === rule.triggerType);
              return (
                <Card key={rule.id} className={!rule.active ? 'opacity-60' : 'border-emerald-100'}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${rule.active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                          {trigger ? <trigger.icon className={`w-4 h-4 ${rule.active ? 'text-emerald-600' : 'text-gray-400'}`} /> : <Settings className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{rule.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{trigger?.label || rule.triggerType}</Badge>
                            {rule.lastRun && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(rule.lastRun).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={rule.active ? 'bg-emerald-100 text-emerald-800 border-0' : 'bg-gray-100 text-gray-500 border-0'}>
                          {rule.active ? 'Active' : 'Paused'}
                        </Badge>
                        <Switch
                          checked={rule.active}
                          disabled={toggling === rule.id}
                          onCheckedChange={() => toggleRule(rule.id, rule.active)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No automation rules yet. Create one to automate tasks.</p>
            <Button size="sm" onClick={() => setShowCreate(true)} className="mt-4 bg-emerald-600 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Create Rule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm">Rule Name</Label><Input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Auto-apply high match" className="border-emerald-200" /></div>
            <div className="space-y-1.5">
              <Label className="text-sm">Trigger Type</Label>
              <Select value={newRule.triggerType} onValueChange={v => setNewRule(p => ({ ...p, triggerType: v }))}>
                <SelectTrigger className="border-emerald-200"><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-sm">Trigger Value</Label><Input value={newRule.triggerValue} onChange={e => setNewRule(p => ({ ...p, triggerValue: e.target.value }))} placeholder="e.g. >80% match" className="border-emerald-200" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 text-white gap-1.5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}