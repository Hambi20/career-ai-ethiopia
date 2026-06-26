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
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Search, Bookmark, FileText, Bot, User, MapPin, Building2, Clock,
  ExternalLink, BookmarkCheck, Send, Plus, Trash2, Copy, Check, ChevronRight,
  Sparkles, Briefcase, GraduationCap, Award, X, Loader2, Globe, Mail, Phone,
  Calendar, Tag, MessageSquare, Target, Zap, Play, BarChart3, Activity,
  CheckCircle2, XCircle, AlertCircle, TrendingUp, Eye, RefreshCw, Radar, AutoIcon
} from 'lucide-react';
import Image from 'next/image';

// ========== TYPES ==========
interface JobResult {
  id: string; title: string; company: string | null; location: string | null;
  type: string | null; salary: string | null; description: string;
  url: string; source: string | null; postedDate: string | null;
  deadline: string | null; category: string | null;
}

interface SavedJob {
  id: string; title: string; company: string | null; location: string | null;
  type: string | null; description: string | null; url: string;
  source: string | null; postedDate: string | null; deadline: string | null;
  category: string | null; createdAt: string;
}

interface Application {
  id: string; jobId: string | null; jobTitle: string; company: string | null;
  location: string | null; status: string; url: string | null;
  coverLetter: string | null; notes: string | null; matchScore?: number | null;
  source?: string | null; appliedAt: string | null; createdAt: string;
}

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; }

interface AutoApplyStatus {
  serviceRunning: boolean;
  status?: string;
  currentCycle?: { cycleNumber: number; phase: string; jobsFound: number; jobsMatched: number; jobsApplied: number; startedAt: string };
  lastCycle?: { cycleNumber: number; completedAt: string; jobsFound: number; jobsMatched: number; jobsApplied: number; duration: string };
  stats?: { totalCycles: number; totalJobsFound: number; totalJobsApplied: number; lastRun: string | null };
  recentLogs?: Array<{ timestamp: string; action: string; jobTitle: string; company: string; matchScore: number; status: string }>;
}

interface UserProfile {
  id: string; fullName: string | null; email: string | null; phone: string | null;
  location: string | null; title: string | null; summary: string | null;
  skills: string; education: string | null; experience: string | null;
}

type Tab = 'dashboard' | 'applications' | 'auto-apply' | 'cover-letters' | 'ai-chat';

// ========== STATE ==========
function useLocalState() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchResults, setSearchResults] = useState<JobResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [jobDetail, setJobDetail] = useState<Record<string, unknown> | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatContext, setChatContext] = useState('job-search');
  const [message, setMessage] = useState('');
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [autoStatus, setAutoStatus] = useState<AutoApplyStatus | null>(null);
  const [autoLogs, setAutoLogs] = useState<Array<Record<string, unknown>>>([]);
  const [isTriggeringSearch, setIsTriggeringSearch] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newApp, setNewApp] = useState({ jobTitle: '', company: '', location: '', status: 'preparing', url: '', notes: '' });
  const [coverLetterForm, setCoverLetterForm] = useState({ jobTitle: '', company: '', jobDescription: '' });
  const [expandedCoverLetter, setExpandedCoverLetter] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  return {
    activeTab, setActiveTab,
    searchQuery, setSearchQuery, searchLocation, setSearchLocation,
    searchCategory, setSearchCategory, searchType, setSearchType,
    searchResults, setSearchResults, isSearching, setIsSearching, hasSearched, setHasSearched,
    selectedJob, setSelectedJob, jobDetail, setJobDetail, isLoadingDetail, setIsLoadingDetail,
    bookmarkedIds, setBookmarkedIds, savedJobs, setSavedJobs,
    applications, setApplications, profile, setProfile,
    chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext,
    message, setMessage, generatedCoverLetter, setGeneratedCoverLetter, isGeneratingCoverLetter, setIsGeneratingCoverLetter,
    autoStatus, setAutoStatus, autoLogs, setAutoLogs, isTriggeringSearch, setIsTriggeringSearch,
    showAddDialog, setShowAddDialog, newApp, setNewApp,
    coverLetterForm, setCoverLetterForm, expandedCoverLetter, setExpandedCoverLetter,
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

// ========== AUTO-APPLY TAB ==========
function AutoApplyTab({
  autoStatus, autoLogs, isTriggeringSearch, setIsTriggeringSearch,
  applications, expandedCoverLetter, setExpandedCoverLetter
}: {
  autoStatus: AutoApplyStatus | null; autoLogs: Array<Record<string, unknown>>;
  isTriggeringSearch: boolean; setIsTriggeringSearch: (v: boolean) => void;
  applications: Application[]; expandedCoverLetter: string | null; setExpandedCoverLetter: (id: string | null) => void;
}) {
  const [logs, setLocalLogs] = useState(autoLogs);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/auto-apply/logs');
      const data = await res.json();
      if (data.success && data.logs) setLocalLogs(data.logs);
    } catch { /* ignore */ }
  }, []);

  const triggerSearch = async () => {
    setIsTriggeringSearch(true);
    try {
      const res = await fetch('/api/auto-apply/status', { method: 'POST' });
      const data = await res.json();
      if (data.success) toast.success('Auto-search triggered! It will run in background.');
      else toast.error(data.error || 'Failed to trigger');
    } catch { toast.error('Service not reachable'); }
    finally {
      setTimeout(() => setIsTriggeringSearch(false), 2000);
      setTimeout(fetchLogs, 30000);
    }
  };

  const statusIcon = !autoStatus?.serviceRunning ? <XCircle className="w-5 h-5 text-red-500" /> :
    autoStatus?.status === 'idle' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
    <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;

  const statusText = !autoStatus?.serviceRunning ? 'Service Offline' :
    autoStatus?.status === 'idle' ? 'Ready & Waiting' :
    `Running: ${autoStatus?.currentCycle?.phase || 'Searching...'}`;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {statusIcon}
              <div>
                <h3 className="font-semibold">Auto-Apply Service</h3>
                <p className="text-sm text-muted-foreground">{statusText}</p>
              </div>
            </div>
            <Button onClick={triggerSearch} disabled={isTriggeringSearch || !autoStatus?.serviceRunning || autoStatus?.status !== 'idle'} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {isTriggeringSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isTriggeringSearch ? 'Starting...' : 'Run Now'}
            </Button>
          </div>

          {autoStatus?.stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-emerald-600">{autoStatus.stats.totalJobsFound}</p>
                <p className="text-xs text-muted-foreground">Jobs Found</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-600">{autoStatus.stats.totalJobsApplied}</p>
                <p className="text-xs text-muted-foreground">Applications Sent</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-orange-600">{autoStatus.stats.totalCycles}</p>
                <p className="text-xs text-muted-foreground">Search Cycles</p>
              </div>
            </div>
          )}

          {autoStatus?.lastCycle && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground mb-1">Last Cycle #{autoStatus.lastCycle.cycleNumber} — {autoStatus.lastCycle.completedAt}</p>
              <div className="flex gap-4 text-xs">
                <span>Found: <strong>{autoStatus.lastCycle.jobsFound}</strong></span>
                <span>Matched: <strong>{autoStatus.lastCycle.jobsMatched}</strong></span>
                <span>Applied: <strong>{autoStatus.lastCycle.jobsApplied}</strong></span>
                <span>Duration: <strong>{autoStatus.lastCycle.duration}</strong></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Radar className="w-4 h-4 text-emerald-600" /> How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { step: '1', title: 'Auto-Search', desc: 'Searches 8+ queries across Ethiopian job sites every 4 hours' },
              { step: '2', title: 'Smart Matching', desc: 'LLM scores each job 0-100 against your CV skills & experience' },
              { step: '3', title: 'Cover Letters', desc: 'Generates tailored cover letter for jobs matching 50+ score' },
              { step: '4', title: 'Application', desc: 'Saves application with cover letter ready for submission' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">{item.step}</div>
                <div>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>💡 Note:</strong> The system finds and prepares applications automatically. For actual submission to company websites, you may need to visit the link and apply directly — some sites require manual forms.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Application Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ScrollArea className="w-4 h-4 text-emerald-600" /> Application Log</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1 text-xs"><RefreshCw className="w-3 h-3" />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No application logs yet. Trigger a search or wait for the next cycle.</p>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {logs.map((log, i) => {
                  const logAny = log as Record<string, string | number | null>;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        logAny.status === 'applied' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        logAny.status === 'matched' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        logAny.status === 'skipped' ? 'bg-gray-100 dark:bg-gray-900/30' :
                        'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                        {logAny.status === 'applied' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                         logAny.status === 'matched' ? <Target className="w-4 h-4 text-blue-600" /> :
                         logAny.status === 'skipped' ? <XCircle className="w-4 h-4 text-gray-400" /> :
                         <AlertCircle className="w-4 h-4 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{String(logAny.jobTitle || 'Unknown')}</p>
                          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                            logAny.status === 'applied' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' :
                            logAny.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>{String(logAny.status || '')}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {logAny.company && <span className="text-xs text-muted-foreground">{String(logAny.company)}</span>}
                          {logAny.matchScore != null && <span className="text-xs text-muted-foreground">Score: {String(logAny.matchScore)}%</span>}
                          {logAny.timestamp && <span className="text-[10px] text-muted-foreground">{String(logAny.timestamp)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Applications with Cover Letters */}
      {applications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600" /> Applications with Cover Letters</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {applications.filter(a => a.coverLetter).map((app) => (
                  <div key={app.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate">{app.jobTitle}</h4>
                          {app.matchScore && <Badge variant="outline" className="text-[10px]">{app.matchScore}%</Badge>}
                        </div>
                        {app.company && <p className="text-xs text-muted-foreground">{app.company} {app.location ? `• ${app.location}` : ''}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {app.url && (
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <a href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" />Apply</a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setExpandedCoverLetter(expandedCoverLetter === app.id ? null : app.id)}>
                          <Eye className="w-3 h-3" />{expandedCoverLetter === app.id ? 'Hide' : 'View'}
                        </Button>
                      </div>
                    </div>
                    {expandedCoverLetter === app.id && app.coverLetter && (
                      <div className="p-4 border-t bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-emerald-600">Generated Cover Letter</p>
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

  // Fetch auto-apply status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/auto-apply/status');
        const data = await res.json();
        s.setAutoStatus(data);
      } catch { /* ignore */ }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeTab={s.activeTab} setActiveTab={s.setActiveTab} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {s.activeTab === 'dashboard' && <DashboardTab applications={s.applications} profile={s.profile} />}
        {s.activeTab === 'applications' && <DashboardTab applications={s.applications} profile={s.profile} />}
        {s.activeTab === 'auto-apply' && <AutoApplyTab autoStatus={s.autoStatus} autoLogs={s.autoLogs} isTriggeringSearch={s.isTriggeringSearch} setIsTriggeringSearch={s.setIsTriggeringSearch} applications={s.applications} expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter} />}
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
