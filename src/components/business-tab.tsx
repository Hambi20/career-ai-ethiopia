'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useBotData } from '@/lib/bot-data-context';
import { Building2, Plus, DollarSign, Users, Briefcase, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export function BusinessTab() {
  const { botData } = useBotData();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'company', industry: '', revenue: '', employees: '' });
  const [selected, setSelected] = useState<any>(null);

  const businesses = (botData as any).rawSyncData?.businesses || [];

  const totalRevenue = businesses.reduce((s: number, b: any) => s + (Number(b.revenue) || 0), 0);
  const totalEmployees = businesses.reduce((s: number, b: any) => s + (Number(b.employees) || 0), 0);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    fetch('/api/business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(d => { if (d.success) { toast.success('Business added!'); setShowAdd(false); setForm({ name: '', type: 'company', industry: '', revenue: '', employees: '' }); } }).catch(() => toast.error('Failed'));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Businesses', v: businesses.length, i: Building2 },
          { l: 'Revenue', v: totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)}K ETB` : '0', i: DollarSign },
          { l: 'Employees', v: totalEmployees, i: Users },
          { l: 'Projects', v: businesses.reduce((s: number, b: any) => s + ((b.projects?.length) || 0), 0), i: Briefcase },
        ].map(s => (
          <Card key={s.l}><CardContent className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-1"><s.i className="w-4 h-4 text-emerald-600" /></div>
            <p className="text-lg font-bold">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardHeader className="pb-2"><div className="flex items-center justify-between">
        <CardTitle className="text-sm">Businesses</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setShowAdd(!showAdd)}><Plus className="w-3 h-3" />Add</Button>
      </div></CardHeader>
        <CardContent>
          {showAdd && (
            <div className="border rounded-lg p-3 mb-3 space-y-2 bg-muted/30">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Business name *" className="h-8 text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Industry" className="h-8 text-xs" />
                <Input value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} placeholder="Revenue" className="h-8 text-xs" />
                <Input value={form.employees} onChange={e => setForm({ ...form, employees: e.target.value })} placeholder="Employees" className="h-8 text-xs" />
              </div>
              <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 text-white" onClick={handleAdd}>Add Business</Button>
            </div>
          )}

          {businesses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No businesses registered yet.</p><p className="text-xs mt-1">Add your first business to start tracking.</p></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {businesses.map((b: any, idx: number) => (
                <Card key={b.id || idx} className={`cursor-pointer transition-colors ${selected?.id === b.id ? 'border-emerald-400 bg-emerald-50' : 'hover:bg-muted/30'}`} onClick={() => setSelected(selected?.id === b.id ? null : b)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">{(b.name || 'B')[0]}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.name}</p><p className="text-[10px] text-muted-foreground">{b.industry || b.type || 'Company'}</p></div>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      {b.revenue && <Badge variant="outline"><DollarSign className="w-2.5 h-2.5 mr-0.5" />{b.revenue}</Badge>}
                      {b.employees && <Badge variant="outline"><Users className="w-2.5 h-2.5 mr-0.5" />{b.employees}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
