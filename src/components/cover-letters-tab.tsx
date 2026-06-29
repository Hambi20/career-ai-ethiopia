'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileText, Sparkles, Copy, Check, Download, Clock,
  Loader2, Plus, Briefcase, Building2, ChevronDown, ChevronUp
} from 'lucide-react';

interface CoverLetterRecord {
  id: string;
  jobTitle: string;
  company: string;
  content: string;
  createdAt: string;
}

export function CoverLettersTab() {
  const { tabData } = useBotData();
  const [form, setForm] = useState({ jobTitle: '', company: '', jobDescription: '' });
  const [generating, setGenerating] = useState(false);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<CoverLetterRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.jobTitle || !form.company) {
      toast.error('Please enter job title and company');
      return;
    }
    setGenerating(true);
    setCurrentLetter(null);
    try {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success && data.coverLetter) {
        setCurrentLetter(data.coverLetter);
        const record: CoverLetterRecord = {
          id: crypto.randomUUID(),
          jobTitle: form.jobTitle,
          company: form.company,
          content: data.coverLetter,
          createdAt: new Date().toISOString(),
        };
        setHistory(prev => [record, ...prev]);
        toast.success('Cover letter generated!');
      } else {
        toast.error(data.error || 'Generation failed');
      }
    } catch {
      toast.error('Failed to generate cover letter');
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    if (!currentLetter) return;
    navigator.clipboard.writeText(currentLetter);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentLetter) return;
    const blob = new Blob([currentLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${form.company || 'draft'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Generate Cover Letter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Job Title</Label>
              <Input
                placeholder="e.g. Software Engineer"
                value={form.jobTitle}
                onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                className="border-emerald-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Company</Label>
              <Input
                placeholder="e.g. Ethio Telecom"
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                className="border-emerald-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Job Description</Label>
            <Textarea
              placeholder="Paste the job description here for a more tailored cover letter..."
              value={form.jobDescription}
              onChange={e => setForm(p => ({ ...p, jobDescription: e.target.value }))}
              rows={4}
              className="border-emerald-200"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate Cover Letter'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Letter */}
      {currentLetter ? (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                {form.jobTitle} at {form.company}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-white border border-emerald-100 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {currentLetter}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Generate a cover letter for any job</p>
            <p className="text-xs text-muted-foreground mt-1">Fill in the form above and click generate</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Previous Cover Letters ({history.length})
            </h3>
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {history.map(record => (
                  <Card key={record.id} className="border-emerald-100">
                    <CardContent className="p-4">
                      <button
                        className="w-full text-left flex items-center justify-between"
                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Briefcase className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{record.jobTitle}</p>
                            <p className="text-xs text-muted-foreground">{record.company} · {new Date(record.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {expandedId === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedId === record.id && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {record.content}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}