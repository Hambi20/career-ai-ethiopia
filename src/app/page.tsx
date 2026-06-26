'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw,
  Download, Printer, FileDown,
  ShieldCheck, Clock, ThumbsUp, ThumbsDown,
  MailCheck, FileCheck, FileX, Search, Globe
} from 'lucide-react';

// ========== TYPES ==========
interface Application {
  id: string; jobId: string | null; jobTitle: string; company: string | null;
  location: string | null; status: string; url: string | null;
  coverLetter: string | null; notes: string | null; matchScore?: number | null;
  source?: string | null; appliedAt: string | null; createdAt: string;
  matchReasoning?: string | null; jobDeadline?: string | null; jobDescription?: string | null;
}

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; }

interface UserProfile {
  id: string; fullName: string | null; email: string | null; phone: string | null;
  location: string | null; title: string | null; summary: string | null;
  skills: string; education: string | null; experience: string | null;
}

type Tab = 'dashboard' | 'applications' | 'auto-apply' | 'cover-letters' | 'ai-chat';

// ========== HELPERS ==========
const statusColor = (s: string) =>
  s === 'pending_review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
  s === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
  s === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
  s === 'interview' ? 'bg-purple-100 text-purple-800' :
  s === 'offered' ? 'bg-amber-100 text-amber-800' :
  s === 'rejected' ? 'bg-red-100 text-red-800' :
  s === 'withdrawn' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-800';

const statusLabel = (s: string) =>
  s === 'pending_review' ? 'Pending Review' :
  s === 'approved' ? 'Approved' :
  s === 'submitted' ? 'Sent' :
  s.replace(/_/g, ' ');

// ========== STATE ==========
function useLocalState() {
  const [activeTab, setActiveTab] = useState<Tab>('auto-apply');
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
  const [lastAutoSearch, setLastAutoSearch] = useState<number>(Date.now());
  const [nextSearchIn, setNextSearchIn] = useState<number>(3600000);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoSearchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-search every 1 hour
  useEffect(() => {
    const interval = setInterval(() => {
      setNextSearchIn(prev => Math.max(0, prev - 10000));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Trigger auto-search when countdown hits 0
  useEffect(() => {
    if (nextSearchIn <= 0 && !isRunningCycle) {
      setLastAutoSearch(Date.now());
      setNextSearchIn(3600000); // reset to 1 hour
      // Auto trigger search via fetch
      fetch('/api/auto-apply/run?full=true', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            toast.success(`Auto-search found ${data.totalSaved} new jobs!`);
            fetch('/api/applications').then(r => r.json()).then(d => {
              if (d.success) setApplications(d.applications);
            });
          }
        })
        .catch(() => {});
      setIsRunningCycle(true);
      setTimeout(() => setIsRunningCycle(false), 120000); // assume done after 2 min
    }
  }, [nextSearchIn, isRunningCycle, setApplications]);

  // Auto-refresh applications every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/applications').then(r => r.json()).then(d => {
        if (d.success) setApplications(d.applications);
      }).catch(() => {});
    }, 120000);
    return () => clearInterval(interval);
  }, [setApplications]);

  const countdownStr = useMemo(() => {
    const mins = Math.floor(nextSearchIn / 60000);
    const secs = Math.floor((nextSearchIn % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [nextSearchIn]);

  return {
    activeTab, setActiveTab,
    applications, setApplications, profile, setProfile,
    chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext,
    message, setMessage, generatedCoverLetter, setGeneratedCoverLetter, isGeneratingCoverLetter, setIsGeneratingCoverLetter,
    coverLetterForm, setCoverLetterForm, expandedCoverLetter, setExpandedCoverLetter,
    pdfDialogApp, setPdfDialogApp, pdfData, setPdfData, isGeneratingPdf, setIsGeneratingPdf,
    runLogs, setRunLogs, isRunningCycle, setIsRunningCycle,
    lastAutoSearch, nextSearchIn, countdownStr,
    chatEndRef,
  };
}

// ========== HEADER ==========
function Header({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (t: Tab) => void }) {
  const pendingCount = 0; // Will be passed as prop in real usage
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
              { id: 'auto-apply' as const, label: 'Review & Apply', icon: ShieldCheck },
              { id: 'applications' as const, label: 'Applications', icon: FileText },
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
                {['dashboard', 'auto-apply', 'applications', 'cover-letters', 'ai-chat'].map((tab) => (
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
  const pendingReview = applications.filter(a => a.status === 'pending_review');
  const approved = applications.filter(a => a.status === 'approved');
  const submitted = applications.filter(a => a.status === 'submitted');
  const highMatch = applications.filter(a => (a.matchScore || 0) >= 70);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              HT
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Welcome back, {profile?.fullName || 'Hambisa'}!</h2>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                {pendingReview.length > 0
                  ? `You have ${pendingReview.length} job${pendingReview.length === 1 ? '' : 's'} waiting for your review.`
                  : submitted.length > 0
                    ? `${submitted.length} application${submitted.length === 1 ? '' : 's'} sent so far!`
                    : 'Ready to find your next opportunity?'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={pendingReview.length > 0 ? 'border-amber-300 dark:border-amber-700' : ''}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2"><Clock className="w-5 h-5 text-amber-600" /></div>
            <p className="text-2xl font-bold">{pendingReview.length}</p>
            <p className="text-xs text-muted-foreground">Needs Review</p>
          </CardContent>
        </Card>
        <Card className={approved.length > 0 ? 'border-emerald-300 dark:border-emerald-700' : ''}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <p className="text-2xl font-bold">{approved.length}</p>
            <p className="text-xs text-muted-foreground">Ready to Send</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2"><Send className="w-5 h-5 text-blue-600" /></div>
            <p className="text-2xl font-bold">{submitted.length}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2"><Target className="w-5 h-5 text-purple-600" /></div>
            <p className="text-2xl font-bold">{highMatch.length}</p>
            <p className="text-xs text-muted-foreground">High Match (70+)</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity yet. Go to &quot;Review &amp; Apply&quot; to start finding jobs.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2">
                {applications.slice(0, 15).map((app) => (
                  <div key={app.id} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${app.status === 'pending_review' ? 'bg-amber-100 dark:bg-amber-900/30' : app.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {app.status === 'pending_review' ? <Clock className="w-3.5 h-3.5 text-amber-600" /> : app.status === 'approved' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Briefcase className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.jobTitle}</p>
                      <div className="flex items-center gap-1.5">
                        {app.company && <span className="text-xs text-muted-foreground">{app.company}</span>}
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${statusColor(app.status)}`}>{statusLabel(app.status)}</Badge>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">{new Date(app.createdAt).toLocaleDateString()}</span>
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

// ========== AUTO-APPLY TAB (Review & Apply) ==========
function AutoApplyTab({
  applications, setApplications,
  pdfDialogApp, setPdfDialogApp, pdfData, setPdfData, isGeneratingPdf, setIsGeneratingPdf,
  isRunningCycle, setIsRunningCycle, runLogs, setRunLogs,
  expandedCoverLetter, setExpandedCoverLetter,
  countdownStr,
}: {
  applications: Application[]; setApplications: (a: Application[]) => void;
  pdfDialogApp: Application | null; setPdfDialogApp: (a: Application | null) => void;
  pdfData: { cvHtml: string; coverLetterHtml: string } | null; setPdfData: (d: any) => void;
  isGeneratingPdf: boolean; setIsGeneratingPdf: (v: boolean) => void;
  isRunningCycle: boolean; setIsRunningCycle: (v: boolean) => void;
  runLogs: string[]; setRunLogs: (l: string[]) => void;
  expandedCoverLetter: string | null; setExpandedCoverLetter: (id: string | null) => void;
  countdownStr: string;
}) {
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const refreshApps = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch { /* ignore */ }
  }, [setApplications]);

  const pendingApps = applications.filter(a => a.status === 'pending_review').sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  const approvedApps = applications.filter(a => a.status === 'approved');
  const submittedApps = applications.filter(a => a.status === 'submitted');

  // Trigger async search with polling
  const triggerRun = async (category?: string) => {
    if (isRunningCycle) return;
    setIsRunningCycle(true);
    const catLabel = category === 'linkedin' ? 'LinkedIn' : category === 'remote' ? 'Remote Data Entry' : category === 'ethiopia' ? 'Ethiopian Sites' : 'All Sources';
    setRunLogs([`🔍 Starting ${catLabel} job search...`, 'Please wait — results appear here live...']);
    try {
      // Step 1: Start the search (returns immediately)
      const queryStr = category ? `?category=${category}` : '';
      const res = await fetch(`/api/auto-apply/run${queryStr}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        setRunLogs(['❌ ' + (data.error || 'Failed to start search')]);
        toast.error(data.error || 'Failed to start');
        setIsRunningCycle(false);
        return;
      }
      if (data.alreadyRunning) {
        setRunLogs(['⚠️ A search is already running, polling its progress...']);
      }
      const searchId = data.searchId;

      // Step 2: Poll for results every 3 seconds
      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/auto-apply/run?searchId=${searchId}`);
          const status = await statusRes.json();
          if (status.logs) setRunLogs(status.logs);
          if (status.status === 'completed') {
            clearInterval(poll);
            setIsRunningCycle(false);
            toast.success(`[${catLabel}] Found ${status.results?.totalFound || 0} jobs, ${status.results?.totalExpired || 0} expired, ${status.results?.totalSaved || 0} new for review`);
            refreshApps();
          } else if (status.status === 'failed') {
            clearInterval(poll);
            setIsRunningCycle(false);
            toast.error('Search failed: ' + (status.error || 'Unknown error'));
          }
        } catch {
          // Keep polling even if one poll fails
        }
      }, 3000);
    } catch (e) {
      setRunLogs(['❌ ' + String(e)]);
      toast.error('Failed to start search');
      setIsRunningCycle(false);
    }
  };

  // Approve single
  const approveApp = async (id: string) => {
    setIsApproving(id);
    try {
      const res = await fetch(`/api/applications/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Application approved! Ready to send.');
        refreshApps();
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Error approving'); }
    finally { setIsApproving(null); }
  };

  // Reject single
  const rejectApp = async (id: string) => {
    try {
      const res = await fetch(`/api/applications/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Application rejected');
        refreshApps();
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Error rejecting'); }
  };

  // Batch approve all pending
  const batchApprove = async () => {
    if (pendingApps.length === 0) return;
    try {
      const ids = pendingApps.map(a => a.id);
      const res = await fetch('/api/applications/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.approved} applications approved!`);
        refreshApps();
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Error batch approving'); }
  };

  // Mark as sent
  const markAsSent = async (id: string) => {
    try {
      await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'submitted', appliedAt: new Date().toISOString() }),
      });
      toast.success('Marked as sent!');
      refreshApps();
    } catch { toast.error('Error'); }
  };

  // Send email (mailto link)
  const sendEmail = (app: Application) => {
    const subject = encodeURIComponent(`Application for ${app.jobTitle} - Hambisa Bekuma Tefera`);
    const body = encodeURIComponent(
      `Dear Hiring Manager,\n\nI am writing to express my interest in the ${app.jobTitle} position at ${app.company || 'your esteemed organization'}.\n\n${app.coverLetter ? app.coverLetter.substring(0, 500) + '...' : ''}\n\nPlease find my attached CV and cover letter for your consideration.\n\nBest regards,\nHambisa Bekuma Tefera\nPhone: +251 952 341 525\nEmail: hambisa1992@gmail.com\nLocation: Addis Ababa, Ethiopia`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.success('Email client opened — attach your PDF to the email');
  };

  // PDF preview
  const previewPdf = async (app: Application) => {
    setIsGeneratingPdf(true);
    setPdfDialogApp(app);
    setPdfData(null);
    try {
      const res = await fetch(`/api/auto-apply/generate-pdf?id=${app.id}&type=both`);
      const data = await res.json();
      if (data.success) setPdfData({ cvHtml: data.cvHtml, coverLetterHtml: data.coverLetterHtml });
      else toast.error('Failed to generate PDF');
    } catch { toast.error('Error generating'); }
    finally { setIsGeneratingPdf(false); }
  };

  const downloadCV = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await fetch('/api/auto-apply/generate-pdf?id=cv&type=cv-only');
      const data = await res.json();
      if (data.success && data.cvHtml) {
        const win = window.open('', '_blank');
        if (win) { win.document.write(data.cvHtml); win.document.title = 'Hambisa_Bekuma_Tefera_CV.pdf'; win.document.close(); }
      }
    } catch { toast.error('Error'); }
    finally { setIsGeneratingPdf(false); }
  };

  const openInTab = (html: string, title: string) => {
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.title = title; win.document.close(); setTimeout(() => win.print(), 500); }
  };

  return (
    <div className="space-y-6">
      {/* ===== SECTION 1: Search Controls ===== */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRunningCycle ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                {isRunningCycle ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Zap className="w-6 h-6 text-emerald-600" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg">Smart Job Search</h3>
                <p className="text-sm text-muted-foreground">
                  {isRunningCycle ? 'Searching 20 queries across 20+ sources...' :
                    pendingApps.length > 0 ? `${pendingApps.length} jobs waiting for your review` :
                      approvedApps.length > 0 ? `${approvedApps.length} jobs approved — ready to send` :
                        'Click to search job sites & Telegram for matching jobs'}
                </p>
                {!isRunningCycle && (
                  <p className="text-xs text-emerald-600 mt-0.5">Auto-search in {countdownStr}</p>
                )}
                {isRunningCycle && (
                  <p className="text-xs text-orange-600 mt-0.5">Search running...</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={downloadCV} disabled={isGeneratingPdf} variant="outline" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />My CV
              </Button>
              <Button onClick={() => triggerRun()} disabled={isRunningCycle} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {isRunningCycle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isRunningCycle ? 'Searching...' : 'Find All Jobs'}
              </Button>
              <Button onClick={() => triggerRun('linkedin')} disabled={isRunningCycle} variant="outline" className="gap-1.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50">
                <Globe className="w-3.5 h-3.5" />LinkedIn Only
              </Button>
              <Button onClick={() => triggerRun('remote')} disabled={isRunningCycle} variant="outline" className="gap-1.5 text-xs text-purple-600 border-purple-300 hover:bg-purple-50">
                <Activity className="w-3.5 h-3.5" />Remote Data Entry
              </Button>
              <Button onClick={() => triggerRun('ethiopia')} disabled={isRunningCycle} variant="outline" className="gap-1.5 text-xs text-orange-600 border-orange-300 hover:bg-orange-50">
                <Target className="w-3.5 h-3.5" />Ethiopian Sites
              </Button>
            </div>
          </div>

          {/* Search info */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Searches across 20+ sources with 20 smart queries:</p>
            <div className="flex flex-wrap gap-1.5">
              {['EthioJobs.net', 'Mekanisa.com', 'Jobs.et', 'AddisJobs.com', 'JobWebEthiopia', 'EthiopianJobs.com', 'EthioCareers.com', 'GeezJob.com', 'HarmeJobs.com', 'EthioVacancy.com', 'ReporterEthiopia.com', 'VacancyEth.com', 'ZameJobs.com', 'HiredET.com', 'LinkedIn', 'RemoteOK', 'WeWorkRemotely', 'Upwork', 'Telegram Groups'].map(s => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
            </div>
            <p className="mt-2">Matching: Sales, Marketing, Business Dev, Commercial, Account Mgmt, Brand Mgmt, Data Entry, Remote Work, Virtual Assistant + related roles</p>
            <p className="mt-1 text-emerald-600">Auto-search runs every 1 hour • New sites: GeezJob, HarmeJobs, EthioVacancy, Reporter, LinkedIn, Remote Data Entry</p>
          </div>

          {/* Live Run Logs */}
          {runLogs.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-gray-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto">
              {runLogs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={pendingApps.length > 0 ? 'border-amber-300' : ''}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingApps.length}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card className={approvedApps.length > 0 ? 'border-emerald-300' : ''}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{approvedApps.length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{submittedApps.length}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== SECTION 2: Pending Review — Needs Your Approval ===== */}
      <Card className={pendingApps.length > 0 ? 'border-amber-300 dark:border-amber-700' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending Review ({pendingApps.length})
              </CardTitle>
              <CardDescription>Review each job and approve or reject before sending</CardDescription>
            </div>
            {pendingApps.length > 1 && (
              <Button onClick={batchApprove} size="sm" variant="outline" className="gap-1.5 text-xs text-emerald-600 border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />Approve All ({pendingApps.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No jobs waiting for review</p>
              <p className="text-xs mt-1">Click &quot;Find Jobs Now&quot; to start searching</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[700px]">
              <div className="space-y-3">
                {pendingApps.map((app) => (
                  <div key={app.id} className="border-2 border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden bg-gradient-to-r from-amber-50/50 to-white dark:from-amber-950/10 dark:to-background">
                    {/* Job Summary Header */}
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Left: Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h4 className="text-sm font-bold">{app.jobTitle}</h4>
                            {app.matchScore && (
                              <Badge className={`text-[10px] border-0 ${(app.matchScore || 0) >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : (app.matchScore || 0) >= 50 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600'}`}>
                                {app.matchScore}% match
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            {app.company && (
                              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{app.company}</span>
                            )}
                            {app.location && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>
                            )}
                            {app.source && (
                              <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{app.source}</span>
                            )}
                          </div>

                          {/* Match Reasoning */}
                          {app.matchReasoning && (
                            <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-[11px] text-muted-foreground">
                                <span className="font-semibold text-amber-700 dark:text-amber-400">Why this matches:</span> {app.matchReasoning}
                              </p>
                            </div>
                          )}

                          {/* Deadline */}
                          {app.jobDeadline && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs">
                              <Calendar className="w-3 h-3 text-red-500" />
                              <span className="text-red-600 dark:text-red-400 font-medium">Deadline: {app.jobDeadline}</span>
                            </div>
                          )}

                          {/* Job Description snippet */}
                          {app.jobDescription && (
                            <div className="mt-2">
                              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 p-0 text-muted-foreground" onClick={() => setExpandedCoverLetter(expandedCoverLetter === app.id ? null : app.id)}>
                                <Eye className="w-3 h-3" />
                                {expandedCoverLetter === app.id ? 'Hide' : 'Show'} full description & cover letter
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex flex-col gap-2 flex-shrink-0 sm:min-w-[160px]">
                          <Button
                            size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            disabled={isApproving === app.id}
                            onClick={() => approveApp(app.id)}
                          >
                            {isApproving === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                            {isApproving === app.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => rejectApp(app.id)}>
                            <ThumbsDown className="w-3.5 h-3.5" />Reject
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => previewPdf(app)}>
                            <FileDown className="w-3.5 h-3.5" />Preview PDF
                          </Button>
                          {app.url && (
                            <Button asChild size="sm" variant="ghost" className="gap-1 text-xs">
                              <a href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" />Job Site</a>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded: Cover letter + description */}
                      {expandedCoverLetter === app.id && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {app.jobDescription && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Job Description</p>
                              <ScrollArea className="max-h-32">
                                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{app.jobDescription}</p>
                              </ScrollArea>
                            </div>
                          )}
                          {app.coverLetter && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-emerald-600">Generated Cover Letter</p>
                                <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={() => { navigator.clipboard.writeText(app.coverLetter || ''); toast.success('Copied!'); }}>
                                  <Copy className="w-3 h-3" />Copy
                                </Button>
                              </div>
                              <ScrollArea className="max-h-48">
                                <p className="text-xs whitespace-pre-line leading-relaxed font-serif text-muted-foreground">{app.coverLetter}</p>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 3: Approved — Ready to Send ===== */}
      <Card className={approvedApps.length > 0 ? 'border-emerald-300 dark:border-emerald-700' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Approved & Ready to Send ({approvedApps.length})
          </CardTitle>
          <CardDescription>Download PDFs, send via email, or mark as sent after applying</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedApps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No approved applications yet</p>
              <p className="text-xs mt-1">Approve jobs from the &quot;Pending Review&quot; section above</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {approvedApps.map((app) => (
                  <div key={app.id} className="border border-emerald-200 dark:border-emerald-800 rounded-lg overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-4.5 h-4.5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium">{app.jobTitle}</h4>
                          {app.matchScore && <Badge variant="outline" className="text-[10px]">{app.matchScore}%</Badge>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          {app.company && <span>{app.company}</span>}
                          {app.jobDeadline && <span className="text-red-500">Deadline: {app.jobDeadline}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => previewPdf(app)}>
                          <Download className="w-3 h-3" />PDF
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => sendEmail(app)}>
                          <Mail className="w-3 h-3" />Send Email
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-blue-600 border-blue-200" onClick={() => markAsSent(app.id)}>
                          <MailCheck className="w-3 h-3" />Mark Sent
                        </Button>
                        {app.url && (
                          <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
                            <a href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" />Visit</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 4: Submitted ===== */}
      {submittedApps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MailCheck className="w-4 h-4 text-blue-500" />
              Sent Applications ({submittedApps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {submittedApps.map((app) => (
                  <div key={app.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.jobTitle}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {app.company && <span>{app.company}</span>}
                        {app.appliedAt && <span>Sent: {new Date(app.appliedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => previewPdf(app)}>
                      <Eye className="w-3 h-3" />View
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ===== PDF Preview Dialog ===== */}
      <Dialog open={!!pdfDialogApp} onOpenChange={() => setPdfDialogApp(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Application Package — {pdfDialogApp?.jobTitle}</DialogTitle>
            <DialogDescription>
              {pdfDialogApp?.company} • {pdfDialogApp?.matchScore}% match
              {pdfDialogApp?.jobDeadline && ` • Deadline: ${pdfDialogApp.jobDeadline}`}
            </DialogDescription>
          </DialogHeader>
          {isGeneratingPdf ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
          ) : pdfData ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => pdfData.cvHtml && openInTab(pdfData.cvHtml, 'Hambisa_CV.pdf')}>
                  <Download className="w-3.5 h-3.5" />Download CV (Print to PDF)
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => pdfData.coverLetterHtml && openInTab(pdfData.coverLetterHtml, 'Cover_Letter.pdf')}>
                  <Download className="w-3.5 h-3.5" />Download Cover Letter
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => pdfData.cvHtml && openInTab(pdfData.cvHtml, 'Hambisa_CV.pdf')}>
                  <Printer className="w-3.5 h-3.5" />Print CV
                </Button>
                {pdfDialogApp && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => { sendEmail(pdfDialogApp); }}>
                    <Mail className="w-3.5 h-3.5" />Send via Email
                  </Button>
                )}
                {pdfDialogApp?.url && (
                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                    <a href={pdfDialogApp.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" />Go to Job Site</a>
                  </Button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {pdfData.cvHtml && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-emerald-600">Curriculum Vitae</p>
                    <div className="border rounded-lg h-[400px] overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: pdfData.cvHtml }} />
                  </div>
                )}
                {pdfData.coverLetterHtml && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-emerald-600">Cover Letter</p>
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

// ========== APPLICATIONS TAB ==========
function ApplicationsTab({ applications, setApplications }: {
  applications: Application[]; setApplications: (apps: Application[]) => void;
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [newApp, setNewApp] = useState({ jobTitle: '', company: '', location: '', status: 'pending_review', url: '' });

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

  const statusCounts: Record<string, number> = { all: applications.length, pending_review: 0, approved: 0, submitted: 0, interview: 0, offered: 0, rejected: 0, withdrawn: 0 };
  applications.forEach((a) => { const s = a.status; if (s in statusCounts) statusCounts[s]++; });

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
      setNewApp({ jobTitle: '', company: '', location: '', status: 'pending_review', url: '' });
      refreshApps();
    } catch { toast.error('Failed to add'); }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Object.entries(statusCounts).filter(([, count]) => count > 0).slice(0, 6).map(([key, count]) => (
          <Card key={key} className={filterStatus === key ? 'border-emerald-500' : ''} onClick={() => setFilterStatus(key === filterStatus ? 'all' : key)}>
            <CardContent className="p-3 text-center cursor-pointer">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground">{key === 'all' ? 'All' : statusLabel(key)}</p>
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
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="offered">Offered</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
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
              <p className="text-sm">{applications.length === 0 ? 'No applications yet.' : 'No applications match filters.'}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-2">
                {filtered.map((app) => (
                  <div key={app.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2.5 p-3 hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        {app.status === 'pending_review' ? <Clock className="w-4 h-4 text-amber-600" /> :
                         app.status === 'approved' ? <Check className="w-4 h-4 text-emerald-600" /> :
                         (app.matchScore || 0) >= 70 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                         <Briefcase className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{app.jobTitle}</p>
                          {app.matchScore && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{app.matchScore}%</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {app.company && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{app.company}</span>}
                          {app.location && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{app.location}</span>}
                          {app.jobDeadline && <span className="text-xs text-red-500 flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{app.jobDeadline}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge className={`text-[10px] px-2 py-0 border-0 ${statusColor(app.status)}`}>{statusLabel(app.status)}</Badge>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">{new Date(app.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                            <SelectTrigger className="w-7 h-7 p-0 border-0" disabled={isUpdating === app.id}>
                              {isUpdating === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending_review">Pending Review</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
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
                    {expandedId === app.id && (
                      <div className="px-3 pb-3 border-t bg-muted/20">
                        {app.matchReasoning && (
                          <div className="mt-2 mb-2">
                            <p className="text-[11px] text-muted-foreground"><span className="font-semibold">Match Reasoning:</span> {app.matchReasoning}</p>
                          </div>
                        )}
                        {app.coverLetter && (
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-emerald-600">Cover Letter</p>
                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(app.coverLetter || ''); toast.success('Copied!'); }}><Copy className="w-3 h-3" />Copy</Button>
                          </div>
                        )}
                        {app.coverLetter && <ScrollArea className="max-h-48"><p className="text-xs whitespace-pre-line leading-relaxed font-serif text-muted-foreground">{app.coverLetter}</p></ScrollArea>}
                      </div>
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
function AIChatTab({ chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext, message, setMessage, chatEndRef }: {
  chatMessages: ChatMessage[]; setChatMessages: (m: ChatMessage[]) => void;
  isChatLoading: boolean; setIsChatLoading: (v: boolean) => void;
  chatContext: string; setChatContext: (c: string) => void;
  message: string; setMessage: (m: string) => void; chatEndRef: React.RefObject<HTMLDivElement>;
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
                  <div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Bot className="w-3 h-3 text-emerald-600" /></div><div className="bg-muted rounded-lg p-2.5"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>
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
        {s.activeTab === 'auto-apply' && (
          <AutoApplyTab
            applications={s.applications} setApplications={s.setApplications}
            pdfDialogApp={s.pdfDialogApp} setPdfDialogApp={s.setPdfDialogApp}
            pdfData={s.pdfData} setPdfData={s.setPdfData}
            isGeneratingPdf={s.isGeneratingPdf} setIsGeneratingPdf={s.setIsGeneratingPdf}
            isRunningCycle={s.isRunningCycle} setIsRunningCycle={s.setIsRunningCycle}
            runLogs={s.runLogs} setRunLogs={s.setRunLogs}
            expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter}
            countdownStr={s.countdownStr}
          />
        )}
        {s.activeTab === 'applications' && <ApplicationsTab applications={s.applications} setApplications={s.setApplications} />}
        {s.activeTab === 'cover-letters' && (
          <CoverLettersTab
            applications={s.applications} profile={s.profile}
            expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter}
            isGeneratingCoverLetter={s.isGeneratingCoverLetter} setIsGeneratingCoverLetter={s.setIsGeneratingCoverLetter}
            coverLetterForm={s.coverLetterForm} setCoverLetterForm={s.setCoverLetterForm}
            generatedCoverLetter={s.generatedCoverLetter} setGeneratedCoverLetter={s.setGeneratedCoverLetter}
          />
        )}
        {s.activeTab === 'ai-chat' && (
          <AIChatTab
            chatMessages={s.chatMessages} setChatMessages={s.setChatMessages}
            isChatLoading={s.isChatLoading} setIsChatLoading={s.setIsChatLoading}
            chatContext={s.chatContext} setChatContext={s.setChatContext}
            message={s.message} setMessage={s.setMessage} chatEndRef={s.chatEndRef}
          />
        )}
      </main>
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Hambisa Bekuma Tefera — Marketing &amp; Sales Manager • Addis Ababa, Ethiopia • +251 952 341 525
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Auto-searches every 1 hour across 20+ sources: EthioJobs, Mekanisa, Jobs.et, GeezJob, HarmeJobs, EthioVacancy, Reporter, LinkedIn, RemoteOK, WeWorkRemotely, Telegram Groups &amp; more
          </p>
        </div>
      </footer>
    </div>
  );
}
