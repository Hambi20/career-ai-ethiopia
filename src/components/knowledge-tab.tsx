'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBotData } from '@/lib/bot-data-context';
import { BookOpen, Plus, Search, Pin, Star, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export function KnowledgeTab() {
  const { knowledge } = useBotData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' });
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const docs = knowledge.filter((d: any) => {
    if (category !== 'all' && d.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!((d.title || '').toLowerCase().includes(q) || (d.content || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const pinned = docs.filter((d: any) => d.isPinned);
  const rest = docs.filter((d: any) => !d.isPinned);

  const handleCreate = () => {
    if (!form.title || !form.content) return;
    fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }) })
      .then(r => r.json()).then(d => { if (d.success) { toast.success('Document added!'); setShowForm(false); setForm({ title: '', content: '', category: 'general', tags: '' }); } }).catch(() => toast.error('Failed'));
  };

  const handleDelete = (id: string) => {
    fetch(`/api/knowledge/${id}`, { method: 'DELETE' }).then(() => { toast.success('Deleted'); }).catch(() => {});
  };

  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    setIsAiSearching(true);
    fetch('/api/knowledge/ai-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: aiQuery }) })
      .then(r => r.json()).then(d => { setAiAnswer(d.answer || 'No answer found.'); setIsAiSearching(false); }).catch(() => { setAiAnswer(null); setIsAiSearching(false); });
  };

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-emerald-600" /></div>
            <div><h2 className="text-base font-bold text-emerald-900">Knowledge Library</h2><p className="text-xs text-emerald-700">SOPs, training materials, references</p></div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 h-9 text-sm" />
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="sop">SOPs</SelectItem><SelectItem value="policy">Policy</SelectItem><SelectItem value="training">Training</SelectItem><SelectItem value="reference">Reference</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white gap-1 h-9"><Plus className="w-4 h-4" />Add</Button>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card><CardContent className="p-4 space-y-3">
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Document title *" />
          <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Paste content here..." rows={5} />
          <div className="flex gap-2">
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="sop">SOP</SelectItem><SelectItem value="policy">Policy</SelectItem><SelectItem value="training">Training</SelectItem></SelectContent>
            </Select>
            <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Tags: cv, sales" className="flex-1" />
          </div>
          <div className="flex gap-2"><Button onClick={handleCreate} className="bg-emerald-600 text-white">Save</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600" />Ask AI</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2"><Input value={aiQuery} onChange={e => setAiQuery(e.target.value)} placeholder="Ask about your documents..." className="h-9 text-sm" onKeyDown={e => e.key === 'Enter' && handleAiSearch()} />
            <Button onClick={handleAiSearch} disabled={isAiSearching || !aiQuery.trim()} className="bg-emerald-600 text-white gap-1 h-9">{isAiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}</Button></div>
          {aiAnswer && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs whitespace-pre-line">{aiAnswer}</div>}
        </CardContent>
      </Card>

      {pinned.length > 0 && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Pin className="w-4 h-4 text-emerald-600" />Pinned ({pinned.length})</CardTitle></CardHeader>
          <CardContent><div className="space-y-1.5">{pinned.map((d: any) => (
            <div key={d.id} className="border rounded-lg p-3 hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
              <div className="flex items-center gap-2"><Pin className="w-3.5 h-3.5 text-emerald-500" /><p className="text-sm font-medium flex-1 truncate">{d.title || 'Untitled'}</p><Badge variant="outline" className="text-[10px]">{d.category || 'general'}</Badge></div>
              {expanded === d.id && <p className="mt-2 text-xs whitespace-pre-line max-h-40 overflow-y-auto">{d.content || 'No content'}</p>}
            </div>
          ))}</div></CardContent></Card>
      )}

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">All Documents ({rest.length})</CardTitle></CardHeader>
        <CardContent>
          {rest.length === 0 && pinned.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No documents yet. Add your first document above.</p></div>
          ) : rest.length === 0 ? null : (
            <div className="space-y-1.5">{rest.map((d: any) => (
              <div key={d.id} className="border rounded-lg p-3 hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{d.title || 'Untitled'}</p><div className="flex items-center gap-1.5 mt-0.5"><Badge variant="outline" className="text-[10px]">{d.category || 'general'}</Badge>{d.content && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{d.content.slice(0, 60)}...</span>}</div></div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>{expanded === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(d.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                {expanded === d.id && <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs whitespace-pre-line max-h-60 overflow-y-auto">{d.content || 'No content'}</div>}
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
