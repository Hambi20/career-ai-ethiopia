'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBotData } from '@/lib/bot-data-context';
import { Users, Building2, TrendingUp, DollarSign, Calendar, Plus, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export function CrmTab() {
  const { contacts, tabData } = useBotData();
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', type: 'customer', company: '', phone: '', email: '', notes: '' });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRec, setAiRec] = useState<string | null>(null);

  const stats = tabData?.crmStats || { totalContacts: contacts.length, customers: 0, dealers: 0, totalRevenue: 0, upcomingVisits: 0 };

  const filtered = contacts.filter((c: any) => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!((c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const handleAdd = () => {
    if (!addForm.name.trim()) return;
    fetch('/api/crm/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) })
      .then(r => r.json()).then(d => { if (d.success) { toast.success('Contact added!'); setShowAdd(false); setAddForm({ name: '', type: 'customer', company: '', phone: '', email: '', notes: '' }); } }).catch(() => toast.error('Failed'));
  };

  const handleAiRecommend = () => {
    if (!selected) return;
    setIsAiLoading(true);
    fetch('/api/crm/ai-recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId: selected.id }) })
      .then(r => r.json()).then(d => { setAiRec(d.recommendations || 'No recommendations available.'); setIsAiLoading(false); }).catch(() => { setAiRec(null); setIsAiLoading(false); });
  };

  const typeColor = (t: string) => t === 'customer' ? 'bg-emerald-100 text-emerald-800' : t === 'dealer' ? 'bg-amber-100 text-amber-800' : t === 'retailer' ? 'bg-sky-100 text-sky-800' : t === 'prospect' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Contacts', v: stats.totalContacts || contacts.length, i: Users },
          { l: 'Customers', v: stats.customers || 0, i: TrendingUp },
          { l: 'Dealers', v: stats.dealers || 0, i: Building2 },
          { l: 'Revenue', v: stats.totalRevenue ? `${(stats.totalRevenue / 1000).toFixed(0)}K` : '0', i: DollarSign },
          { l: 'Visits', v: stats.upcomingVisits || 0, i: Calendar },
        ].map(s => (
          <Card key={s.l}><CardContent className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-1"><s.i className="w-4 h-4 text-emerald-600" /></div>
            <p className="text-lg font-bold">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1"><CardHeader className="pb-2">
          <div className="flex items-center justify-between"><CardTitle className="text-sm">Contacts</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setShowAdd(!showAdd)}><Plus className="w-3 h-3" />Add</Button>
          </div>
          <div className="flex gap-1.5 mt-2">
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 h-8 text-xs" />
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-24 h-8 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="dealer">Dealer</SelectItem><SelectItem value="prospect">Prospect</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
          <CardContent>
            {showAdd && (
              <div className="border rounded-lg p-3 mb-3 space-y-2 bg-muted/30">
                <Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Name *" className="h-8 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={addForm.company} onChange={e => setAddForm({ ...addForm, company: e.target.value })} placeholder="Company" className="h-8 text-xs" />
                  <Input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Phone" className="h-8 text-xs" />
                </div>
                <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 text-white" onClick={handleAdd}>Add Contact</Button>
              </div>
            )}
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No contacts yet. Add your first contact.</p></div>
              ) : filtered.map((c: any) => (
                <div key={c.id || c.phone} className={`p-2.5 rounded-lg cursor-pointer border transition-colors ${selected?.id === c.id ? 'border-emerald-400 bg-emerald-50' : 'hover:bg-muted/30'}`} onClick={() => { setSelected(c); setAiRec(null); }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">{(c.name || '?')[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{c.name || 'Unknown'}</p><p className="text-[10px] text-muted-foreground truncate">{c.company || c.type || ''}</p></div>
                    <Badge className={`text-[9px] px-1.5 py-0 ${typeColor(c.type)}`}>{c.type || 'customer'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>

        <Card className="sm:col-span-2">
          {!selected ? (
            <CardContent className="p-8 text-center text-muted-foreground"><ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Select a contact to view details</p></CardContent>
          ) : (
            <><CardHeader className="pb-2"><div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">{(selected.name || '?')[0].toUpperCase()}</div>
              <div><h3 className="font-semibold text-sm">{selected.name}</h3><p className="text-xs text-muted-foreground">{selected.company || 'No company'}</p></div>
              <Badge className={`ml-auto ${typeColor(selected.type)}`}>{selected.type}</Badge>
            </div></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selected.phone && <div><span className="text-muted-foreground">Phone</span><p>{selected.phone}</p></div>}
                {selected.email && <div><span className="text-muted-foreground">Email</span><p>{selected.email}</p></div>}
                {selected.territory && <div><span className="text-muted-foreground">Territory</span><p>{selected.territory}</p></div>}
                <div><span className="text-muted-foreground">Value</span><p className="font-medium">{selected.value || 0} ETB</p></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleAiRecommend} disabled={isAiLoading}>{isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI Recommend</Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs"><Calendar className="w-3 h-3" />Log Visit</Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs"><DollarSign className="w-3 h-3" />Add Order</Button>
              </div>
              {aiRec && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="text-xs font-medium mb-1">AI Recommendation:</p><p className="text-xs whitespace-pre-line">{aiRec}</p></div>}
              {selected.visits?.length > 0 && (
                <div className="text-xs"><p className="font-medium mb-1">Visits ({selected.visits.length})</p>
                  {selected.visits.slice(0, 3).map((v: any, i: number) => <div key={i} className="p-2 bg-muted/30 rounded mb-1"><span className="font-medium">{v.purpose}</span> — {v.date}</div>)}</div>
              )}
            </CardContent></>
          )}
        </Card>
      </div>
    </div>
  );
}
