'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FileText, Bot, User, MapPin, Building2,
  ExternalLink, Send, Plus, Trash2, Copy, Check, ChevronRight,
  Sparkles, Briefcase, X, Loader2, Mail, Phone,
  Calendar, Target, Zap, Play, BarChart3, Activity,
  CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw, Radar,
  Download, Printer, FileDown
} from 'lucide-react';

// ========== TYPES ==========
interface Application {
  id: string; jobId: string | null; jobTitle: string; company: string | null;
  location: string | null; status: string; url: string | null;
  coverLetter: string | null; notes: string | null; matchScore?: number | null;
  source?: string | null; appliedAt: string | null; createdAt: string;
}

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; }

interface UserProfile {
  id: string; fullName: string | null; email: string | null; phone: string | null;
  location: string | null; title: string | null; summary: string | null;
  skills: string; education: string | null; experience: string | null;
}

type Tab = 'dashboard' | 'applications' | 'auto-apply' | 'cover-letters' | 'ai-chat';

// ========== STATE ==========
function useLocalState() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatContext, setChatContext] = useState('job-search');
  const [message, setMessage] = useState('');
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterForm, setCoverLetterForm] = useState({ jobTitle: '', company: '', jobDescription: '' });
  const [expandedCoverLetter, setExpandedCoverLetter] = useState<string | null>(null);
  const [pdfDialogApp, setPdfDialogApp] = useState<Application | null>(null);
  const [pdfData, setPdfData] = useState<{ cvHtml: string; coverLetterHtml: string } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  return {
    activeTab, setActiveTab,
    applications, setApplications, profile, setProfile,
    chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext,
    message, setMessage, generatedCoverLetter, setGeneratedCoverLetter, isGeneratingCoverLetter, setIsGeneratingCoverLetter,
    coverLetterForm, setCoverLetterForm, expandedCoverLetter, setExpandedCoverLetter,
    pdfDialogApp, setPdfDialogApp, pdfData, setPdfData, isGeneratingPdf, setIsGeneratingPdf,
    runLogs, setRunLogs, isRunningCycle, setIsRunningCycle,
    chatEndRef,
  };
}

// ========== HEADER ==========
function Header({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (t: Tab) => void }) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">Hambisa&apos;s Job Finder</h1>
              <p className="text-[10px] text-muted-foreground">Auto-Apply System</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
              { id: 'applications' as const, label: 'Applications', icon: FileText },
              { id: 'auto-apply' as const, label: 'Auto-Apply', icon: Zap },
              { id: 'cover-letters' as const, label: 'Cover Letters', icon: Sparkles },
              { id: 'ai-chat' as const, label: 'AI Coach', icon: Bot },
            ].map((item) => (
              <Button key={item.id} variant={activeTab === item.id ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab(item.id)} className="gap-1.5 text-xs">
                <item.icon className="w-3.5 h-3.5" />{item.label}
              </Button>
            ))}
          </nav>
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['dashboard', 'applications', 'auto-apply', 'cover-letters', 'ai-chat'].map((tab) => (
                  <SelectItem key={tab} value={tab}>{tab.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
}

// ========== DASHBOARD TAB ==========
function DashboardTab({ applications, profile }: { applications: Application[]; profile: UserProfile | null }) {
  const autoApplied = applications.filter(a => a.status === 'auto-applied');
  const submitted = applications.filter(a => a.status === 'submitted');
  const highMatch = applications.filter(a => (a.matchScore || 0) >= 70);
  const totalApps = applications.length;
  const todayApps = applications.filter(a => {
    const d = new Date(a.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {profile?.fullName?.charAt(0) || 'H'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Welcome back, {profile?.fullName?.split(' ')[0] || 'Hambisa'}!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your auto-apply system is actively searching Ethiopian job sites for Marketing & Sales Manager, Sales Representative, and Area Sales Manager positions.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs gap-1"><Mail className="w-3 h-3" />{profile?.email || 'hambisa1992@gmail.com'}</Badge>
                <Badge variant="outline" className="text-xs gap-1"><Phone className="w-3 h-3" />{profile?.phone || '+251 952 341 525'}</Badge>
                <Badge variant="outline" className="text-xs gap-1"><MapPin className="w-3 h-3" />{profile?.location || 'Addis Ababa'}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Applications', value: totalApps, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Auto-Applied', value: autoApplied.length, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Today\'s Applications', value: todayApps.length, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
          { label: 'High Match (70+)', value: highMatch.length, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" /> Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No applications yet. The auto-apply system will start searching soon.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {applications.slice(0, 15).map((app) => (
                  <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      {app.matchScore && app.matchScore >= 70 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Briefcase className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.jobTitle}</p>
                      <div className="flex items-center gap-2">
                        {app.company && <span className="text-xs text-muted-foreground">{app.company}</span>}
                        {app.matchScore && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{app.matchScore}% match</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-[10px] px-2 py-0 border-0 ${
                        app.status === 'auto-applied' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        app.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        app.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{app.status}</Badge>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">{new Date(app.createdAt).toLocaleDateString()}</span>
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

// ========== APPLICATIONS TAB ==========
function ApplicationsTab({ applications, setApplications }: {
  applications: Application[]; setApplications: (apps: Application[]) => void;
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [newApp, setNewApp] = useState({ jobTitle: '', company: '', location: '', status: 'preparing', url: '' });

  const refreshApps = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch { /* ignore */ }
  }, [setApplications]);

  const filtered = applications.filter((app) => {
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    if (filterText) {
      const t = filterText.toLowerCase();
      return app.jobTitle.toLowerCase().includes(t) || (app.company || '').toLowerCase().includes(t);
    }
    return true;
  });

  const statusCounts = { all: applications.length, 'auto-applied': 0, applied: 0, submitted: 0, preparing: 0, interview: 0, offered: 0, rejected: 0, withdrawn: 0 };
  applications.forEach((a) => { const s = a.status as keyof typeof statusCounts; if (s in statusCounts) statusCounts[s]++; });

  const updateStatus = async (id: string, status: string) => {
    setIsUpdating(id);
    try {
      await fetch('/api/applications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      toast.success('Status updated');
      refreshApps();
    } catch { toast.error('Failed to update'); }
    finally { setIsUpdating(null); }
  };

  const deleteApp = async (id: string) => {
    try {
      await fetch(`/api/applications?id=${id}`, { method: 'DELETE' });
      toast.success('Application deleted');
      refreshApps();
    } catch { toast.error('Failed to delete'); }
  };

  const addApp = async () => {
    if (!newApp.jobTitle.trim()) { toast.error('Job title required'); return; }
    try {
      await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newApp) });
      toast.success('Application added');
      setShowAddDialog(false);
      setNewApp({ jobTitle: '', company: '', location: '', status: 'preparing', url: '' });
      refreshApps();
    } catch { toast.error('Failed to add'); }
  };

  const statusColor = (s: string) => s === 'auto-applied' || s === 'applied' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
    s === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
    s === 'interview' ? 'bg-purple-100 text-purple-800' :
    s === 'offered' ? 'bg-amber-100 text-amber-800' :
    s === 'rejected' ? 'bg-red-100 text-red-800' :
    s === 'withdrawn' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {Object.entries(statusCounts).filter(([k]) => k !== 'all' && statusCounts[k as keyof typeof statusCounts] > 0).slice(0, 5).map(([key, count]) => (
          <Card key={key} className={filterStatus === key ? 'border-emerald-500' : ''} onClick={() => setFilterStatus(key === filterStatus ? 'all' : key)}>
            <CardContent className="p-3 text-center cursor-pointer">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{key.replace('-', ' ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search by title or company..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="flex-1 h-9 text-sm" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="auto-applied">Auto-Applied</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="offered">Offered</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"><Plus className="w-3.5 h-3.5" />Add</Button>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{applications.length === 0 ? 'No applications yet. Auto-apply will create them.' : 'No applications match filters.'}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-2">
                {filtered.map((app) => (
                  <div key={app.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2.5 p-3 hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        {app.matchScore && app.matchScore >= 70 ? <Check className="w-4 h-4 text-emerald-600" /> : <Briefcase className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{app.jobTitle}</p>
                          {app.matchScore && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{app.matchScore}%</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {app.company && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{app.company}</span>}
                          {app.location && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{app.location}</span>}
                          {app.source && <span className="text-[10px] text-muted-foreground">{app.source}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge className={`text-[10px] px-2 py-0 border-0 ${statusColor(app.status)}`}>{app.status}</Badge>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">{new Date(app.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                            <SelectTrigger className="w-7 h-7 p-0 border-0" disabled={isUpdating === app.id}>
                              {isUpdating === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="auto-applied">Auto-Applied</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="interview">Interview</SelectItem>
                              <SelectItem value="offered">Offered</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="withdrawn">Withdrawn</SelectItem>
                            </SelectContent>
                          </Select>
                          {app.url && <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0"><a href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>}
                          {app.coverLetter && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}><Eye className="w-3 h-3" /></Button>}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteApp(app.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>
                    {expandedId === app.id && app.coverLetter && (
                      <div className="px-3 pb-3 border-t bg-muted/20">
                        <div className="flex items-center justify-between mb-1.5 mt-2">
                          <p className="text-xs font-semibold text-emerald-600">Cover Letter</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(app.coverLetter || ''); toast.success('Copied!'); }}><Copy className="w-3 h-3" />Copy</Button>
                        </div>
                        <ScrollArea className="max-h-48"><p className="text-xs whitespace-pre-line leading-relaxed font-serif text-muted-foreground">{app.coverLetter}</p></ScrollArea>
                      </div>
                    )}
                    {expandedId === app.id && app.notes && !app.coverLetter && (
                      <div className="px-3 pb-2 border-t bg-muted/20"><p className="text-[11px] text-muted-foreground mt-2">{app.notes}</p></div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Application</DialogTitle>
            <DialogDescription>Manually track a new job application</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Job Title *</Label><Input value={newApp.jobTitle} onChange={(e) => setNewApp({ ...newApp, jobTitle: e.target.value })} placeholder="e.g., Sales Manager" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} placeholder="Company name" /></div>
              <div><Label>Location</Label><Input value={newApp.location} onChange={(e) => setNewApp({ ...newApp, location: e.target.value })} placeholder="Addis Ababa" /></div>
            </div>
            <div><Label>Job URL</Label><Input value={newApp.url} onChange={(e) => setNewApp({ ...newApp, url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={addApp} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== AUTO-APPLY TAB ==========
function AutoApplyTab({
  isRunningCycle, setIsRunningCycle, runLogs, setRunLogs,
  applications, setApplications,
  pdfDialogApp, setPdfDialogApp, pdfData, setPdfData, isGeneratingPdf, setIsGeneratingPdf,
  expandedCoverLetter, setExpandedCoverLetter
}: {
  isRunningCycle: boolean; setIsRunningCycle: (v: boolean) => void;
  runLogs: string[]; setRunLogs: (l: string[]) => void;
  applications: Application[]; setApplications: (a: Application[]) => void;
  pdfDialogApp: Application | null; setPdfDialogApp: (a: Application | null) => void;
  pdfData: { cvHtml: string; coverLetterHtml: string } | null; setPdfData: (d: any) => void;
  isGeneratingPdf: boolean; setIsGeneratingPdf: (v: boolean) => void;
  expandedCoverLetter: string | null; setExpandedCoverLetter: (id: string | null) => void;
}) {
  const refreshApps = useCallback(async () => {
    try { const res = await fetch('/api/applications'); const data = await res.json(); if (data.success) setApplications(data.applications); } catch { /* */ }
  }, [setApplications]);

  const triggerRun = async () => {
    if (isRunningCycle) return;
    setIsRunningCycle(true);
    setRunLogs(['⏳ Starting auto-apply cycle...']);
    try {
      const res = await fetch('/api/auto-apply/run?full=true', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRunLogs(data.logs || []);
        toast.success(`Found ${data.totalFound} jobs, matched ${data.totalMatched}, saved ${data.totalSaved}`);
        refreshApps();
      } else {
        setRunLogs(['❌ ' + (data.error || 'Unknown error')]);
        toast.error(data.error || 'Failed');
      }
    } catch (e) {
      setRunLogs(['❌ ' + String(e)]);
      toast.error('Failed to run auto-apply');
    } finally { setIsRunningCycle(false); }
  };

  const downloadPdf = async (app: Application) => {
    setIsGeneratingPdf(true);
    setPdfDialogApp(app);
    setPdfData(null);
    try {
      const id = app.id === 'cv' ? 'cv' : app.id;
      const res = await fetch(`/api/auto-apply/generate-pdf?id=${id}&type=${app.id === 'cv' ? 'cv-only' : 'both'}`);
      const data = await res.json();
      if (data.success) setPdfData({ cvHtml: data.cvHtml, coverLetterHtml: data.coverLetterHtml });
      else toast.error('Failed to generate PDF');
    } catch { toast.error('Error generating'); }
    finally { setIsGeneratingPdf(false); }
  };

  const printPdf = (html: string, title: string) => {
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.title = title; win.document.close(); setTimeout(() => win.print(), 500); }
  };

  const autoApps = applications.filter(a => a.status === 'auto-applied' || a.status === 'applied').sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-6">
      {/* Run Button + Status */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRunningCycle ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                {isRunningCycle ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Zap className="w-6 h-6 text-emerald-600" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg">Auto-Apply Engine</h3>
                <p className="text-sm text-muted-foreground">
                  {isRunningCycle ? 'Searching & scoring jobs...' : `Ready — ${autoApps.length} jobs auto-applied so far`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => downloadPdf({ id: 'cv', jobTitle: 'CV', company: '', location: '', status: '', url: null, coverLetter: null, notes: null, appliedAt: null, createdAt: new Date().toISOString(), jobId: null, matchScore: null, source: null } as unknown as Application)} variant="outline" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />Download My CV
              </Button>
              <Button onClick={triggerRun} disabled={isRunningCycle} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {isRunningCycle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isRunningCycle ? 'Running...' : 'Search & Apply Now'}
              </Button>
            </div>
          </div>

          {/* Live Run Logs */}
          {runLogs.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-gray-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto">
              {runLogs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{autoApps.length}</p><p className="text-xs text-muted-foreground">Auto-Applied</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{autoApps.filter(a => (a.matchScore || 0) >= 70).length}</p><p className="text-xs text-muted-foreground">High Match (70+)</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{autoApps.filter(a => a.coverLetter).length}</p><p className="text-xs text-muted-foreground">Cover Letters</p></CardContent></Card>
      </div>

      {/* Job Packages — Ready to Send */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600" /> Job Packages — Ready to Apply</CardTitle>
          <CardDescription>Click &quot;Prepare PDF&quot; to generate CV + Cover Letter for each job</CardDescription>
        </CardHeader>
        <CardContent>
          {autoApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No jobs found yet</p>
              <p className="text-xs mt-1">Click &quot;Search &amp; Apply Now&quot; to start finding jobs</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {autoApps.map((app) => (
                  <div key={app.id} className="border rounded-lg overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-muted/30">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        {app.matchScore && app.matchScore >= 70 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Briefcase className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium truncate">{app.jobTitle}</h4>
                          {app.matchScore && <Badge variant="outline" className="text-[10px]">{app.matchScore}% match</Badge>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {app.company && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-2.5 h-2.5" />{app.company}</span>}
                          {app.source && <span className="text-[10px] text-muted-foreground">via {app.source}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => downloadPdf(app)}>
                          <FileDown className="w-3 h-3" />Prepare PDF
                        </Button>
                        {app.url && (
                          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                            <a href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" />Visit Site</a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setExpandedCoverLetter(expandedCoverLetter === app.id ? null : app.id)}>
                          <Eye className="w-3 h-3" />Letter
                        </Button>
                      </div>
                    </div>
                    {expandedCoverLetter === app.id && app.coverLetter && (
                      <div className="px-3 pb-3 border-t bg-background">
                        <div className="flex items-center justify-between mb-1.5 mt-2">
                          <p className="text-xs font-semibold text-emerald-600">Cover Letter</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(app.coverLetter || ''); toast.success('Copied!'); }}><Copy className="w-3 h-3" />Copy</Button>
                        </div>
                        <ScrollArea className="max-h-48"><p className="text-xs whitespace-pre-line leading-relaxed font-serif text-muted-foreground">{app.coverLetter}</p></ScrollArea>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfDialogApp} onOpenChange={() => setPdfDialogApp(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Application Package — {pdfDialogApp?.jobTitle}</DialogTitle>
            <DialogDescription>{pdfDialogApp?.company} • {pdfDialogApp?.matchScore}% match</DialogDescription>
          </DialogHeader>
          {isGeneratingPdf ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
          ) : pdfData ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => pdfData.cvHtml && printPdf(pdfData.cvHtml, 'Hambisa_CV.pdf')}>
                  <Printer className="w-3.5 h-3.5" />Print CV
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => pdfData.coverLetterHtml && printPdf(pdfData.coverLetterHtml, 'Cover_Letter.pdf')}>
                  <Printer className="w-3.5 h-3.5" />Print Cover Letter
                </Button>
                {pdfDialogApp?.url && (
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    <a href={pdfDialogApp.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" />Go to Job Site</a>
                  </Button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {pdfData.cvHtml && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-emerald-600">📄 Curriculum Vitae</p>
                    <div className="border rounded-lg h-[400px] overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: pdfData.cvHtml }} />
                  </div>
                )}
                {pdfData.coverLetterHtml && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-emerald-600">✉️ Cover Letter</p>
                    <div className="border rounded-lg h-[400px] overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: pdfData.coverLetterHtml }} />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== COVER LETTERS TAB ==========
function CoverLettersTab({
  applications, profile, expandedCoverLetter, setExpandedCoverLetter,
  isGeneratingCoverLetter, setIsGeneratingCoverLetter,
  coverLetterForm, setCoverLetterForm, generatedCoverLetter, setGeneratedCoverLetter,
}: {
  applications: Application[]; profile: UserProfile | null;
  expandedCoverLetter: string | null; setExpandedCoverLetter: (id: string | null) => void;
  isGeneratingCoverLetter: boolean; setIsGeneratingCoverLetter: (v: boolean) => void;
  coverLetterForm: { jobTitle: string; company: string; jobDescription: string };
  setCoverLetterForm: (f: { jobTitle: string; company: string; jobDescription: string }) => void;
  generatedCoverLetter: string | null; setGeneratedCoverLetter: (cl: string | null) => void;
}) {
  const handleGenerate = async () => {
    if (!coverLetterForm.jobTitle || !coverLetterForm.company) { toast.error('Enter job title and company'); return; }
    setIsGeneratingCoverLetter(true);
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coverLetterForm),
      });
      const data = await res.json();
      if (data.success) { setGeneratedCoverLetter(data.coverLetter); toast.success('Cover letter generated!'); }
    } catch { toast.error('Failed to generate'); }
    finally { setIsGeneratingCoverLetter(false); }
  };

  const appsWithLetters = applications.filter(a => a.coverLetter);

  return (
    <div className="space-y-6">
      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600" /> Generate Cover Letter</CardTitle>
          <CardDescription>Create a tailored cover letter for any job application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Job Title *</Label><Input value={coverLetterForm.jobTitle} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, jobTitle: e.target.value })} placeholder="e.g., Sales Manager" /></div>
            <div><Label>Company *</Label><Input value={coverLetterForm.company} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, company: e.target.value })} placeholder="e.g., Ethiopian Airlines" /></div>
          </div>
          <div><Label>Job Description (optional)</Label><Textarea value={coverLetterForm.jobDescription} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, jobDescription: e.target.value })} placeholder="Paste job description for a more tailored letter..." rows={3} /></div>
          <Button onClick={handleGenerate} disabled={isGeneratingCoverLetter} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {isGeneratingCoverLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {generatedCoverLetter && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Generated Cover Letter</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { navigator.clipboard.writeText(generatedCoverLetter); toast.success('Copied!'); }}>
                <Copy className="w-3.5 h-3.5" />Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <p className="whitespace-pre-line text-sm leading-relaxed font-serif">{generatedCoverLetter}</p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Auto-generated letters */}
      {appsWithLetters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Auto-Generated Cover Letters ({appsWithLetters.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {appsWithLetters.map((app) => (
                  <div key={app.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer" onClick={() => setExpandedCoverLetter(expandedCoverLetter === app.id ? null : app.id)}>
                      <div>
                        <p className="text-sm font-medium">{app.jobTitle}</p>
                        <div className="flex items-center gap-2">
                          {app.company && <span className="text-xs text-muted-foreground">{app.company}</span>}
                          {app.matchScore && <Badge variant="outline" className="text-[10px]">{app.matchScore}% match</Badge>}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedCoverLetter === app.id ? 'rotate-90' : ''}`} />
                    </div>
                    {expandedCoverLetter === app.id && app.coverLetter && (
                      <div className="p-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-emerald-600">Cover Letter</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(app.coverLetter || ''); toast.success('Copied!'); }}>
                            <Copy className="w-3 h-3" />Copy
                          </Button>
                        </div>
                        <ScrollArea className="max-h-60">
                          <p className="text-xs whitespace-pre-line leading-relaxed font-serif text-muted-foreground">{app.coverLetter}</p>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== AI CHAT TAB ==========
function AIChatTab({ chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext, message, setMessage, chatEndRef, profile }: {
  chatMessages: ChatMessage[]; setChatMessages: (m: ChatMessage[]) => void;
  isChatLoading: boolean; setIsChatLoading: (v: boolean) => void;
  chatContext: string; setChatContext: (c: string) => void;
  message: string; setMessage: (m: string) => void; chatEndRef: React.RefObject<HTMLDivElement>;
  profile: UserProfile | null;
}) {
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatEndRef]);

  const handleSend = async () => {
    if (!message.trim() || isChatLoading) return;
    const userMsg = message.trim();
    setMessage('');
    setIsChatLoading(true);
    const updated = [...chatMessages, { id: `msg-${Date.now()}`, role: 'user' as const, content: userMsg, createdAt: new Date().toISOString() }];
    setChatMessages(updated);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: chatContext }),
      });
      const data = await res.json();
      if (data.success) setChatMessages([...updated, { id: `msg-${Date.now() + 1}`, role: 'assistant' as const, content: data.response, createdAt: new Date().toISOString() }]);
    } catch { toast.error('Failed to get response'); }
    finally { setIsChatLoading(false); }
  };

  const quickQs = [
    'What are the best sales manager roles available now?',
    'How should I prepare for a sales interview in Ethiopia?',
    'What salary should I expect as a sales manager in Addis Ababa?',
    'How to write a great CV for Ethiopian employers?',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
        <div className="flex-1">
          <h3 className="font-semibold">AI Career Coach</h3>
          <p className="text-xs text-muted-foreground">Personalized advice for Ethiopian job market</p>
        </div>
        <Select value={chatContext} onValueChange={setChatContext}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="job-search">Job Search</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="career">Career</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="overflow-hidden">
        <div className="h-[400px] flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-14 h-14 text-muted-foreground/20 mb-3" />
                <h4 className="font-semibold text-sm mb-1">Ask Your AI Career Coach</h4>
                <p className="text-xs text-muted-foreground mb-4">Get advice on CV writing, interviews, salary negotiation & more</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {quickQs.map((q) => (
                    <Badge key={q} variant="outline" className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300 text-[10px] py-1 px-2.5 max-w-[220px]" onClick={() => setMessage(q)}>{q}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`max-w-[80%] rounded-lg p-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="whitespace-pre-line text-xs">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-emerald-600" /></div><div className="bg-muted rounded-lg p-2.5"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2.5">
            <div className="flex gap-2">
              <Input placeholder="Ask about jobs, CVs, interviews..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} className="flex-1 text-sm" />
              <Button onClick={handleSend} disabled={!message.trim() || isChatLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Send className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ========== MAIN PAGE ==========
export default function Home() {
  const s = useLocalState();

  // Fetch profile
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.success && data.profile) s.setProfile(data.profile);
      } catch { /* ignore */ }
    })();
  }, []);

  // Fetch applications
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/applications');
        const data = await res.json();
        if (data.success) s.setApplications(data.applications);
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeTab={s.activeTab} setActiveTab={s.setActiveTab} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {s.activeTab === 'dashboard' && <DashboardTab applications={s.applications} profile={s.profile} />}
        {s.activeTab === 'applications' && <ApplicationsTab applications={s.applications} setApplications={s.setApplications} />}
        {s.activeTab === 'auto-apply' && <AutoApplyTab isRunningCycle={s.isRunningCycle} setIsRunningCycle={s.setIsRunningCycle} runLogs={s.runLogs} setRunLogs={s.setRunLogs} applications={s.applications} setApplications={s.setApplications} pdfDialogApp={s.pdfDialogApp} setPdfDialogApp={s.setPdfDialogApp} pdfData={s.pdfData} setPdfData={s.setPdfData} isGeneratingPdf={s.isGeneratingPdf} setIsGeneratingPdf={s.setIsGeneratingPdf} expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter} />}
        {s.activeTab === 'cover-letters' && <CoverLettersTab applications={s.applications} profile={s.profile} expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter} isGeneratingCoverLetter={s.isGeneratingCoverLetter} setIsGeneratingCoverLetter={s.setIsGeneratingCoverLetter} coverLetterForm={s.coverLetterForm} setCoverLetterForm={s.setCoverLetterForm} generatedCoverLetter={s.generatedCoverLetter} setGeneratedCoverLetter={s.setGeneratedCoverLetter} />}
        {s.activeTab === 'ai-chat' && <AIChatTab chatMessages={s.chatMessages} setChatMessages={s.setChatMessages} isChatLoading={s.isChatLoading} setIsChatLoading={s.setIsChatLoading} chatContext={s.chatContext} setChatContext={s.setChatContext} message={s.message} setMessage={s.setMessage} chatEndRef={s.chatEndRef} profile={s.profile} />}
      </main>
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">Hambisa&apos;s Auto-Apply System — Marketing & Sales Manager • Addis Ababa, Ethiopia</p>
        </div>
      </footer>
    </div>
  );
}
