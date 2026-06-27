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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  FileText, Bot, User, MapPin, Building2, ExternalLink, Send, Plus, Trash2,
  Copy, Check, ChevronRight, ChevronDown, Sparkles, Briefcase, X, Loader2,
  Mail, Phone, Calendar, Target, Zap, BarChart3, Activity, CheckCircle2,
  ThumbsUp, ThumbsDown, MailCheck, FileCheck, Search, Globe, MessageSquare,
  Lightbulb, GraduationCap, Edit, Crown, Users, LayoutDashboard, Building,
  LogOut, LogIn, ArrowRight, Star, TrendingUp, Brain, ScanSearch, Rocket,
  RefreshCw, FileDown, Download, Printer, ShieldCheck, Clock, AlertCircle,
  Eye, Play
} from 'lucide-react';

// ===== TYPES =====
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
interface AuthUser {
  id: string; email: string; name: string | null; phone: string | null;
  role: string; tier: string;
}
type Tab = 'dashboard' | 'auto-apply' | 'applications' | 'cover-letters'
  | 'cv-analyzer' | 'interview-prep' | 'profile' | 'ai-chat'
  | 'job-board' | 'employer-jobs' | 'admin';

const statusColor = (s: string) =>
  s === 'pending_review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
  s === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
  s === 'submitted' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' :
  s === 'rejected' ? 'bg-red-100 text-red-800' :
  'bg-gray-100 text-gray-800';
const statusLabel = (s: string) =>
  s === 'pending_review' ? 'Pending Review' :
  s === 'approved' ? 'Approved' :
  s === 'submitted' ? 'Sent' :
  s.replace(/_/g, ' ');

// ===== STATE =====
function useLocalState() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', phone: '' });
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
  const [nextSearchIn, setNextSearchIn] = useState(3600000);
  const [cvAnalysis, setCvAnalysis] = useState<any>(null);
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [interviewPreps, setInterviewPreps] = useState<any[]>([]);
  const [currentPrep, setCurrentPrep] = useState<any>(null);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [prepForm, setPrepForm] = useState({ jobTitle: '', company: '', jobDescription: '' });
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [employerJobs, setEmployerJobs] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('career-ai-token');
    if (saved) {
      setAuthToken(saved);
      fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + saved } })
        .then(r => r.json())
        .then(d => { if (d.success) setCurrentUser(d.user); else localStorage.removeItem('career-ai-token'); })
        .catch(() => localStorage.removeItem('career-ai-token'));
    }
  }, []);

  const handleLogin = async () => {
    if (!authForm.email || !authForm.password) { toast.error('Email and password required'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user); setAuthToken(data.token);
        localStorage.setItem('career-ai-token', data.token);
        setShowAuthModal(false); setAuthForm({ email: '', password: '', name: '', phone: '' });
        toast.success('Welcome, ' + (data.user.name || data.user.email) + '!');
      } else toast.error(data.error || 'Login failed');
    } catch { toast.error('Login failed'); } finally { setAuthLoading(false); }
  };

  const handleRegister = async () => {
    if (!authForm.email || !authForm.password || !authForm.name) { toast.error('Name, email and password required'); return; }
    if (authForm.password.length < 6) { toast.error('Password must be 6+ characters'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user); setAuthToken(data.token);
        localStorage.setItem('career-ai-token', data.token);
        setShowAuthModal(false); setAuthForm({ email: '', password: '', name: '', phone: '' });
        toast.success('Account created! Welcome!');
      } else toast.error(data.error || 'Registration failed');
    } catch { toast.error('Registration failed'); } finally { setAuthLoading(false); }
  };

  const handleLogout = () => { setCurrentUser(null); setAuthToken(null); localStorage.removeItem('career-ai-token'); toast.success('Logged out'); };

  useEffect(() => { const i = setInterval(() => setNextSearchIn(p => Math.max(0, p - 10000)), 10000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (nextSearchIn <= 0 && !isRunningCycle) {
      setNextSearchIn(3600000);
      fetch('/api/auto-apply/run?full=true', { method: 'POST' })
        .then(r => r.json()).then(d => { if (d.success) { toast.success('Auto-search found jobs!'); fetch('/api/applications').then(r => r.json()).then(dd => { if (dd.success) setApplications(dd.applications); }); } }).catch(() => {});
      setIsRunningCycle(true); setTimeout(() => setIsRunningCycle(false), 120000);
    }
  }, [nextSearchIn, isRunningCycle]);
  useEffect(() => { const i = setInterval(() => fetch('/api/applications').then(r => r.json()).then(d => { if (d.success) setApplications(d.applications); }).catch(() => {}), 120000); return () => clearInterval(i); }, []);

  const countdownStr = useMemo(() => Math.floor(nextSearchIn / 60000) + 'm ' + Math.floor((nextSearchIn % 60000) / 1000) + 's', [nextSearchIn]);

  return {
    currentUser, authToken, showAuthModal, setShowAuthModal, authMode, setAuthMode,
    authLoading, authForm, setAuthForm, handleLogin, handleRegister, handleLogout,
    activeTab, setActiveTab, applications, setApplications, profile, setProfile,
    chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext,
    message, setMessage, generatedCoverLetter, setGeneratedCoverLetter,
    isGeneratingCoverLetter, setIsGeneratingCoverLetter, coverLetterForm, setCoverLetterForm,
    expandedCoverLetter, setExpandedCoverLetter, pdfDialogApp, setPdfDialogApp,
    pdfData, setPdfData, isGeneratingPdf, setIsGeneratingPdf, runLogs, setRunLogs,
    isRunningCycle, setIsRunningCycle, countdownStr, chatEndRef,
    cvAnalysis, setCvAnalysis, isAnalyzingCv, setIsAnalyzingCv,
    interviewPreps, setInterviewPreps, currentPrep, setCurrentPrep,
    isGeneratingPrep, setIsGeneratingPrep, prepForm, setPrepForm,
    expandedQuestion, setExpandedQuestion, profileEditing, setProfileEditing,
    employerJobs, setEmployerJobs,
  };
}

// ===== LANDING PAGE =====
function LandingPage({ setShowAuthModal, setAuthMode }: any) {
  const features = [
    { icon: Target, title: 'AI Job Matching', desc: '0-100 match scores based on skills & experience' },
    { icon: Zap, title: 'Auto-Apply Bot', desc: 'Searches 15+ sites and auto-applies to matches' },
    { icon: ScanSearch, title: 'CV Analyzer', desc: 'ATS scoring, missing skills, optimization' },
    { icon: MessageSquare, title: 'Interview Prep', desc: 'AI questions with tailored answers' },
    { icon: Sparkles, title: 'AI Cover Letters', desc: 'Professional letters for each job' },
    { icon: Globe, title: 'Multi-Source Search', desc: 'EthioJobs, LinkedIn, RemoteOK & more' },
  ];
  const tiers = [
    { name: 'Free', price: '0', period: 'forever', pop: false, f: ['5 searches/day', '3 cover letters/day', 'Basic CV analysis', '50 applications'] },
    { name: 'Premium', price: '500', period: 'ETB/month', pop: true, f: ['Unlimited searches', 'All AI tools', 'Priority alerts', 'Unlimited applications'] },
    { name: 'Employer', price: '2,000', period: 'ETB/month', pop: false, f: ['Post unlimited jobs', 'Candidate search', 'Analytics dashboard'] },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <section className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <Badge className="bg-white/20 text-white border-0 mb-4">🇪🇹 Built for Ethiopian Job Seekers</Badge>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">AI-Powered Job Search for Ethiopia</h1>
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-8">Let AI find, evaluate, and apply to the best jobs across 15+ Ethiopian and international job sites with 0-100 match scoring.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 gap-2 text-base px-8" onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}>
              <Rocket className="w-5 h-5" />Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white gap-2 text-base px-8" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
              <LogIn className="w-5 h-5" />Login
            </Button>
          </div>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Everything You Need to Land Your Dream Job</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <Card key={f.title}><CardContent className="p-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3"><f.icon className="w-5 h-5 text-emerald-600" /></div>
                <h3 className="font-semibold mb-1">{f.title}</h3><p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[{ n: '1', t: 'Create Profile', d: 'Add your skills, experience and education' }, { n: '2', t: 'AI Finds Jobs', d: 'Searches 15+ sources and scores matches' }, { n: '3', t: 'Apply with One Click', d: 'Auto-approve, generate cover letters' }].map(s => (
              <div key={s.n}><div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">{s.n}</div><h3 className="font-semibold mb-1">{s.t}</h3><p className="text-sm text-muted-foreground">{s.d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Simple Pricing</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {tiers.map(t => (
              <Card key={t.name} className={t.pop ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}>
                <CardHeader className="pb-2 text-center pt-6"><CardTitle>{t.name}</CardTitle><div className="mt-2"><span className="text-3xl font-bold">{t.price}</span><span className="text-sm text-muted-foreground ml-1">/{t.period}</span></div></CardHeader>
                <CardContent className="p-5"><ul className="space-y-2 mb-5">{t.f.map(f => <li key={f} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />{f}</li>)}</ul>
                  <Button className="w-full gap-2" variant={t.pop ? 'default' : 'outline'} onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}>{t.name === 'Free' ? 'Start Free' : 'Get Started'} <ArrowRight className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Briefcase className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-lg">Career AI Ethiopia</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 Career AI Ethiopia • Built by Hambisa Bekuma Tefera</p>
        </div>
      </footer>
    </div>
  );
}

// ===== AUTH MODAL =====
function AuthModal({ show, setShow, mode, setMode, form, setForm, loading, onLogin, onRegister }: any) {
  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-600" />Career AI Ethiopia</DialogTitle>
          <DialogDescription>{mode === 'login' ? 'Welcome back!' : 'Create your account'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex rounded-lg border p-0.5 bg-muted">
            <button className={'flex-1 py-2 text-sm rounded-md ' + (mode === 'login' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground')} onClick={() => setMode('login')}>Login</button>
            <button className={'flex-1 py-2 text-sm rounded-md ' + (mode === 'register' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground')} onClick={() => setMode('register')}>Register</button>
          </div>
          {mode === 'register' && <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>}
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
          <div><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={mode === 'register' ? '6+ characters' : 'Password'} onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? onLogin() : onRegister())} /></div>
          {mode === 'register' && <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251 ..." /></div>}
        </div>
        <DialogFooter><Button onClick={mode === 'login' ? onLogin : onRegister} disabled={loading} className="w-full bg-emerald-600 text-white gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== HEADER =====
function Header({ activeTab, setActiveTab, currentUser, onLogout, onShowAuth }: any) {
  const seekerTabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'auto-apply' as const, label: 'Search & Apply', icon: ShieldCheck },
    { id: 'applications' as const, label: 'Applications', icon: FileText },
    { id: 'cover-letters' as const, label: 'Cover Letters', icon: Sparkles },
    { id: 'ai-chat' as const, label: 'AI Coach', icon: Bot },
    { id: 'cv-analyzer' as const, label: 'CV Analyzer', icon: FileCheck },
    { id: 'interview-prep' as const, label: 'Interview Prep', icon: MessageSquare },
    { id: 'job-board' as const, label: 'Job Board', icon: Search },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];
  const employerTabs = [
    { id: 'employer-jobs' as const, label: 'My Jobs', icon: Building },
    { id: 'job-board' as const, label: 'Job Board', icon: Search },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];
  const adminTabs = [
    { id: 'admin' as const, label: 'Admin Panel', icon: LayoutDashboard },
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  ];
  const tabs = currentUser?.role === 'employer' ? employerTabs : currentUser?.role === 'admin' ? adminTabs : seekerTabs;
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Briefcase className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-sm font-bold leading-none">Career AI Ethiopia</h1><p className="text-[10px] text-muted-foreground">Smart Job Search</p></div>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((item) => (
              <Button key={item.id} variant={activeTab === item.id ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab(item.id)} className="gap-1.5 text-xs">
                <item.icon className="w-3.5 h-3.5" />{item.label}
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {currentUser && <Badge variant={currentUser.tier === 'premium' ? 'default' : 'outline'} className="text-[10px] gap-1">{currentUser.tier}</Badge>}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">{(currentUser.name || currentUser.email)[0].toUpperCase()}</div>
                  <span className="text-xs font-medium max-w-[100px] truncate">{currentUser.name || currentUser.email}</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-red-500" onClick={onLogout}><LogOut className="w-3.5 h-3.5" /></Button>
              </div>
            ) : (
              <Button size="sm" className="bg-emerald-600 text-white gap-1.5 text-xs" onClick={onShowAuth}><LogIn className="w-3.5 h-3.5" />Login</Button>
            )}
            <div className="lg:hidden">
              <Select value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{tabs.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ===== DASHBOARD =====
function DashboardTab({ applications, profile, currentUser }: { applications: Application[]; profile: UserProfile | null; currentUser: AuthUser | null }) {
  const name = currentUser?.name || profile?.fullName || 'Job Seeker';
  const pending = applications.filter(a => a.status === 'pending_review');
  const approved = applications.filter(a => a.status === 'approved');
  const submitted = applications.filter(a => a.status === 'submitted');
  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6"><div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">{name.charAt(0).toUpperCase()}</div>
          <div><h2 className="text-lg font-bold text-emerald-900">Welcome back, {name}!</h2>
            <p className="text-sm text-emerald-700 mt-1">{pending.length > 0 ? 'You have ' + pending.length + ' job(s) to review.' : submitted.length > 0 ? submitted.length + ' application(s) sent!' : 'Ready to find jobs?'}</p>
          </div>
        </div></CardContent>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ l: 'Needs Review', c: pending.length, i: Clock }, { l: 'Ready to Send', c: approved.length, i: CheckCircle2 }, { l: 'Sent', c: submitted.length, i: Send }, { l: 'High Match', c: applications.filter(a => (a.matchScore || 0) >= 70).length, i: Target }].map(s => (
          <Card key={s.l}><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-2"><s.i className="w-5 h-5 text-emerald-600" /></div><p className="text-2xl font-bold">{s.c}</p><p className="text-xs text-muted-foreground">{s.l}</p></CardContent></Card>
        ))}
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>{applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><Activity className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No activity yet.</p></div>
        ) : (
          <ScrollArea className="max-h-[350px]"><div className="space-y-2">
            {applications.slice(0, 15).map((app) => (
              <div key={app.id} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/30">
                <div className={'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ' + (app.status === 'pending_review' ? 'bg-amber-100' : 'bg-gray-100')}>
                  {app.status === 'pending_review' ? <Clock className="w-3.5 h-3.5 text-amber-600" /> : <Briefcase className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{app.jobTitle}</p>
                  <div className="flex items-center gap-1.5">{app.company && <span className="text-xs text-muted-foreground">{app.company}</span>}
                    <Badge className={'text-[10px] px-1.5 py-0 border-0 ' + statusColor(app.status)}>{statusLabel(app.status)}</Badge>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">{new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div></ScrollArea>
        )}</CardContent>
      </Card>
    </div>
  );
}

// ===== AUTO-APPLY TAB =====
function AutoApplyTab(props: any) {
  const { applications, setApplications, pdfDialogApp, setPdfDialogApp, pdfData, setPdfData, isGeneratingPdf, setIsGeneratingPdf, isRunningCycle, setIsRunningCycle, runLogs, setRunLogs, expandedCoverLetter, setExpandedCoverLetter, countdownStr, currentUser } = props;
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const refresh = () => fetch('/api/applications').then(r => r.json()).then(d => { if (d.success) setApplications(d.applications); }).catch(() => {});
  const pending = applications.filter(a => a.status === 'pending_review').sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  const approved = applications.filter(a => a.status === 'approved');
  const sent = applications.filter(a => a.status === 'submitted');

  const triggerRun = async (cat?: string) => {
    if (isRunningCycle) return;
    setIsRunningCycle(true);
    setRunLogs(['Starting search...']);
    try {
      const res = await fetch('/api/auto-apply/run' + (cat ? '?category=' + cat : ''), { method: 'POST' });
      const data = await res.json();
      if (data.alreadyRunning) setRunLogs(['Already running...']);
      const sid = data.searchId;
      const poll = setInterval(async () => {
        try { const sr = await fetch('/api/auto-apply/run?searchId=' + sid); const st = await sr.json(); if (st.logs) setRunLogs(st.logs); if (st.status === 'completed') { clearInterval(poll); setIsRunningCycle(false); toast.success('Found ' + (st.results?.totalSaved || 0) + ' jobs!'); refresh(); } else if (st.status === 'failed') { clearInterval(poll); setIsRunningCycle(false); } } catch { /* keep polling */ }
      }, 3000);
    } catch { toast.error('Failed'); setIsRunningCycle(false); }
  };
  const approveApp = (id: string) => { setIsApproving(id); fetch('/api/applications/' + id + '/approve', { method: 'POST' }).then(r => r.json()).then(d => { if (d.success) { toast.success('Approved!'); refresh(); } setIsApproving(null); }); };
  const rejectApp = (id: string) => { fetch('/api/applications/' + id + '/reject', { method: 'POST' }).then(r => r.json()).then(d => { if (d.success) { toast.success('Rejected'); refresh(); } }); };
  const markSent = (id: string) => { fetch('/api/applications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'submitted', appliedAt: new Date().toISOString() }) }); toast.success('Marked as sent!'); refresh(); };
  const sendEmail = (app: Application) => { const n = currentUser?.name || 'Hambisa Bekuma Tefera'; window.open('mailto:?subject=' + encodeURIComponent('Application for ' + app.jobTitle + ' - ' + n), '_blank'); };
  const previewPdf = (app: Application) => { setIsGeneratingPdf(true); setPdfDialogApp(app); setPdfData(null); fetch('/api/auto-apply/generate-pdf?id=' + app.id + '&type=both').then(r => r.json()).then(d => { if (d.success) setPdfData({ cvHtml: d.cvHtml, coverLetterHtml: d.coverLetterHtml }); setIsGeneratingPdf(false); }); };
  const openTab = (html: string, title: string) => { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.title = title; w.document.close(); } };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200"><CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' + (isRunningCycle ? 'bg-orange-100' : 'bg-emerald-100')}>
              {isRunningCycle ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Zap className="w-6 h-6 text-emerald-600" />}
            </div>
            <div><h3 className="font-semibold text-lg">Smart Job Search</h3>
              <p className="text-sm text-muted-foreground">{isRunningCycle ? 'Searching...' : pending.length + ' jobs to review'}</p>
              {!isRunningCycle && <p className="text-xs text-emerald-600 mt-0.5">Auto-search in {countdownStr}</p>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => triggerRun()} disabled={isRunningCycle} className="bg-emerald-600 text-white gap-2">{isRunningCycle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{isRunningCycle ? 'Searching...' : 'Find All'}</Button>
            <Button onClick={() => triggerRun('linkedin')} disabled={isRunningCycle} variant="outline" className="gap-1.5 text-xs">LinkedIn</Button>
            <Button onClick={() => triggerRun('remote')} disabled={isRunningCycle} variant="outline" className="gap-1.5 text-xs">Remote</Button>
            <Button onClick={() => triggerRun('ethiopia')} disabled={isRunningCycle} variant="outline" className="gap-1.5 text-xs">Ethiopian</Button>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p className="font-medium mb-1">🤖 Pipeline: EthioJobs, Mekanisa, LinkedIn, RemoteOK + 10 more</p>
          <p>Auto-approve ≥60% | Auto-submit ≥80% with cover letters</p>
        </div>
        {runLogs.length > 0 && <div className="mt-4 p-3 rounded-lg bg-gray-950 text-emerald-400 font-mono text-[11px] max-h-48 overflow-y-auto">{runLogs.map((l, i) => <div key={i}>{l}</div>)}</div>}
      </CardContent></Card>

      <div className="grid grid-cols-3 gap-3">
        {[{ l: 'Pending', c: pending.length }, { l: 'Approved', c: approved.length }, { l: 'Sent', c: sent.length }].map(s => <Card key={s.l}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.c}</p><p className="text-xs text-muted-foreground">{s.l}</p></CardContent></Card>)}
      </div>

      <Card className={pending.length > 0 ? 'border-amber-300' : ''}><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Pending ({pending.length})</CardTitle></CardHeader>
        <CardContent>{pending.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No jobs waiting</p></div> : (
          <ScrollArea className="max-h-[600px]"><div className="space-y-3">
            {pending.map((app) => (
              <div key={app.id} className="border-2 border-amber-200 rounded-xl overflow-hidden">
                <div className="p-4"><div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><h4 className="text-sm font-bold">{app.jobTitle}</h4>{app.matchScore && <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-800">{app.matchScore}%</Badge>}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">{app.company && <span>{app.company}</span>}{app.location && <span>{app.location}</span>}{app.source && <span>{app.source}</span>}</div>
                    {app.matchReasoning && <div className="mt-2 p-2.5 rounded-lg bg-muted/50"><p className="text-[11px]">{app.matchReasoning}</p></div>}
                  </div>
                  <div className="flex flex-col gap-2 sm:min-w-[140px]">
                    <Button size="sm" className="bg-emerald-600 text-white text-xs gap-1" disabled={isApproving === app.id} onClick={() => approveApp(app.id)}>{isApproving === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}Approve</Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600" onClick={() => rejectApp(app.id)}><ThumbsDown className="w-3 h-3" />Reject</Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => previewPdf(app)}><FileDown className="w-3 h-3" />PDF</Button>
                    {app.url && <Button asChild size="sm" variant="ghost" className="text-xs gap-1"><a href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>}
                  </div>
                </div></div>
              </div>
            ))}
          </div></ScrollArea>
        )}</CardContent>
      </Card>

      {approved.length > 0 && <Card className="border-emerald-300"><CardHeader className="pb-3"><CardTitle className="text-base">Approved ({approved.length})</CardTitle></CardHeader><CardContent><ScrollArea className="max-h-[400px]"><div className="space-y-2">{approved.map(app => (
        <div key={app.id} className="flex items-center gap-3 p-3 border border-emerald-200 rounded-lg bg-emerald-50/50">
          <div className="flex-1 min-w-0"><p className="text-sm font-medium">{app.jobTitle}</p><p className="text-xs text-muted-foreground">{app.company}</p></div>
          <div className="flex gap-1"><Button size="sm" className="h-8 text-xs bg-emerald-600 text-white" onClick={() => previewPdf(app)}>PDF</Button><Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => sendEmail(app)}><Mail className="w-3 h-3" /></Button><Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => markSent(app.id)}>Sent</Button></div>
        </div>
      ))}</div></ScrollArea></CardContent></Card>}

      {sent.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Sent ({sent.length})</CardTitle></CardHeader><CardContent><ScrollArea className="max-h-[300px]"><div className="space-y-2">{sent.map(app => <div key={app.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50/50"><div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center"><Check className="w-3 h-3 text-sky-600" /></div><div className="flex-1"><p className="text-sm font-medium">{app.jobTitle}</p><p className="text-xs text-muted-foreground">{app.company}</p></div></div>)}</div></ScrollArea></CardContent></Card>}

      <Dialog open={!!pdfDialogApp} onOpenChange={() => setPdfDialogApp(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader><DialogTitle>{pdfDialogApp?.jobTitle}</DialogTitle><DialogDescription>{pdfDialogApp?.company} • {pdfDialogApp?.matchScore}%</DialogDescription></DialogHeader>
          {isGeneratingPdf ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : pdfData ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => pdfData.cvHtml && openTab(pdfData.cvHtml, 'CV.pdf')}>Download CV</Button>
                <Button size="sm" onClick={() => sendEmail(pdfDialogApp)} className="bg-emerald-600 text-white">Send Email</Button>
                {pdfDialogApp?.url && <Button asChild size="sm"><a href={pdfDialogApp.url} target="_blank" rel="noopener noreferrer">Job Site</a></Button>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {pdfData.cvHtml && <div><p className="text-xs font-semibold mb-2">CV</p><div className="border rounded-lg h-[400px] overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: pdfData.cvHtml }} /></div>}
                {pdfData.coverLetterHtml && <div><p className="text-xs font-semibold mb-2">Cover Letter</p><div className="border rounded-lg h-[400px] overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: pdfData.coverLetterHtml }} /></div>}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== APPLICATIONS TAB =====
function ApplicationsTab({ applications, setApplications }: { applications: Application[]; setApplications: (a: Application[]) => void }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({ jobTitle: '', company: '', location: '', url: '' });
  const refresh = () => fetch('/api/applications').then(r => r.json()).then(d => { if (d.success) setApplications(d.applications); }).catch(() => {});
  const filtered = applications.filter((a) => (filterStatus === 'all' || a.status === filterStatus) && (!filterText || a.jobTitle.toLowerCase().includes(filterText.toLowerCase())));
  const updateStatus = (id: string, status: string) => { fetch('/api/applications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); toast.success('Updated'); refresh(); };
  const deleteApp = (id: string) => { fetch('/api/applications?id=' + id, { method: 'DELETE' }); toast.success('Deleted'); refresh(); };
  const addApp = () => { if (!newApp.jobTitle) return; fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newApp }) }); toast.success('Added'); setShowAdd(false); setNewApp({ jobTitle: '', company: '', location: '', url: '' }); refresh(); };
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="flex-1 h-9 text-sm" />
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending_review">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="submitted">Sent</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
        <Button onClick={() => setShowAdd(true)} size="sm" className="bg-emerald-600 text-white gap-1.5 h-9"><Plus className="w-3.5 h-3.5" />Add</Button>
      </div>
      <Card><CardContent className="p-3">
        {filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No applications</p></div> : (
          <ScrollArea className="max-h-[600px]"><div className="space-y-2">
            {filtered.map((app) => (
              <div key={app.id} className="border rounded-lg p-3 hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{app.jobTitle}</p><div className="flex items-center gap-1 text-xs text-muted-foreground">{app.company}</div></div>
                  <Badge className={'text-[10px] px-2 py-0 border-0 ' + statusColor(app.status)}>{statusLabel(app.status)}</Badge>
                  <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}><SelectTrigger className="w-24 h-7 text-[10px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending_review">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="submitted">Sent</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteApp(app.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div></ScrollArea>
        )}
      </CardContent></Card>
      <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>Add Application</DialogTitle></DialogHeader><div className="space-y-3">
        <div><Label>Job Title *</Label><Input value={newApp.jobTitle} onChange={(e) => setNewApp({ ...newApp, jobTitle: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Company</Label><Input value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} /></div><div><Label>Location</Label><Input value={newApp.location} onChange={(e) => setNewApp({ ...newApp, location: e.target.value })} /></div></div>
        <div><Label>URL</Label><Input value={newApp.url} onChange={(e) => setNewApp({ ...newApp, url: e.target.value })} /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={addApp} className="bg-emerald-600 text-white">Add</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ===== COVER LETTERS =====
function CoverLettersTab(props: any) {
  const { applications, coverLetterForm, setCoverLetterForm, generatedCoverLetter, setGeneratedCoverLetter, isGeneratingCoverLetter, setIsGeneratingCoverLetter, expandedCoverLetter, setExpandedCoverLetter } = props;
  const handleGen = () => { if (!coverLetterForm.jobTitle || !coverLetterForm.company) return; setIsGeneratingCoverLetter(true); fetch('/api/ai/cover-letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coverLetterForm) }).then(r => r.json()).then(d => { if (d.success) { setGeneratedCoverLetter(d.coverLetter); toast.success('Generated!'); } setIsGeneratingCoverLetter(false); }); };
  const withLetters = applications.filter(a => a.coverLetter);
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle className="text-base">Generate Cover Letter</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4"><div><Label>Job Title *</Label><Input value={coverLetterForm.jobTitle} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, jobTitle: e.target.value })} /></div><div><Label>Company *</Label><Input value={coverLetterForm.company} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, company: e.target.value })} /></div></div>
        <Button onClick={handleGen} disabled={isGeneratingCoverLetter} className="bg-emerald-600 text-white gap-2">{isGeneratingCoverLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{isGeneratingCoverLetter ? 'Generating...' : 'Generate'}</Button>
      </CardContent></Card>
      {generatedCoverLetter && <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Generated Letter</CardTitle><Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generatedCoverLetter); toast.success('Copied!'); }}>Copy</Button></div></CardHeader><CardContent><ScrollArea className="h-[300px]"><p className="whitespace-pre-line text-sm font-serif">{generatedCoverLetter}</p></ScrollArea></CardContent></Card>}
      {withLetters.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Auto-Generated ({withLetters.length})</CardTitle></CardHeader><CardContent><ScrollArea className="max-h-[400px]"><div className="space-y-2">{withLetters.map((app: Application) => (
        <div key={app.id} className="border rounded-lg"><div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer" onClick={() => setExpandedCoverLetter(expandedCoverLetter === app.id ? null : app.id)}><div><p className="text-sm font-medium">{app.jobTitle}</p><p className="text-xs text-muted-foreground">{app.company}</p></div><ChevronRight className={'w-4 h-4 ' + (expandedCoverLetter === app.id ? 'rotate-90' : '')} /></div>{expandedCoverLetter === app.id && app.coverLetter && <div className="p-4 border-t"><ScrollArea className="max-h-48"><p className="text-xs font-serif text-muted-foreground">{app.coverLetter}</p></ScrollArea></div>}</div>
      ))}</div></ScrollArea></CardContent></Card>}
    </div>
  );
}

// ===== CV ANALYZER =====
function CvAnalyzerTab({ cvAnalysis, setCvAnalysis, isAnalyzingCv, setIsAnalyzingCv }: any) {
  const handleAnalyze = (force = false) => { setIsAnalyzingCv(true); fetch('/api/ai/cv-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ forceNew: force }) }).then(r => r.json()).then(d => { if (d.success) { setCvAnalysis(d.analysis); toast.success('Analyzed!'); } setIsAnalyzingCv(false); }); };
  useEffect(() => { fetch('/api/ai/cv-analysis').then(r => r.json()).then(d => { if (d.success && d.analysis) setCvAnalysis(d.analysis); }); }, []);
  if (!cvAnalysis) return (<Card><CardContent className="p-8 text-center"><ScanSearch className="w-16 h-16 mx-auto mb-4 text-emerald-600/30" /><h3 className="text-lg font-semibold mb-2">Analyze Your CV</h3><Button onClick={() => handleAnalyze()} disabled={isAnalyzingCv} className="bg-emerald-600 text-white gap-2">{isAnalyzingCv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}{isAnalyzingCv ? 'Analyzing...' : 'Analyze My CV'}</Button></CardContent></Card>);
  const strengths = JSON.parse(cvAnalysis.strengths || '[]');
  const weaknesses = JSON.parse(cvAnalysis.weaknesses || '[]');
  const missing = JSON.parse(cvAnalysis.missingSkills || '[]');
  return (
    <div className="space-y-6">
      <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Results</h3><Button size="sm" variant="outline" onClick={() => handleAnalyze(true)} disabled={isAnalyzingCv} className="gap-1.5 text-xs"><RefreshCw className={'w-3.5 h-3.5 ' + (isAnalyzingCv ? 'animate-spin' : '')} />Refresh</Button></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[{ l: 'Overall', v: cvAnalysis.overallScore }, { l: 'ATS', v: cvAnalysis.atsScore }, { l: 'Format', v: cvAnalysis.formatScore }, { l: 'Content', v: cvAnalysis.contentScore }].map(s => <div key={s.l} className="text-center"><Progress value={s.v} className="h-2 mb-2" /><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-muted-foreground">{s.l}</p></div>)}
        </div></CardContent></Card>
      <div className="grid sm:grid-cols-3 gap-4">
        {strengths.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-600">Strengths</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{strengths.map((s: string, i: number) => <Badge key={i} className="bg-emerald-100 text-emerald-800 text-xs">{s}</Badge>)}</div></CardContent></Card>}
        {weaknesses.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Weaknesses</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{weaknesses.map((w: string, i: number) => <Badge key={i} className="bg-red-100 text-red-800 text-xs">{w}</Badge>)}</div></CardContent></Card>}
        {missing.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-amber-600">Missing Skills</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{missing.map((m: string, i: number) => <Badge key={i} className="bg-amber-100 text-amber-800 text-xs">{m}</Badge>)}</div></CardContent></Card>}
      </div>
      {cvAnalysis.recommendation && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recommendation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-line">{cvAnalysis.recommendation}</p></CardContent></Card>}
    </div>
  );
}

// ===== INTERVIEW PREP =====
function InterviewPrepTab(props: any) {
  const { interviewPreps, setInterviewPreps, currentPrep, setCurrentPrep, isGeneratingPrep, setIsGeneratingPrep, prepForm, setPrepForm, expandedQuestion, setExpandedQuestion } = props;
  const handleGen = () => { if (!prepForm.jobTitle) return; setIsGeneratingPrep(true); fetch('/api/ai/interview-prep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prepForm) }).then(r => r.json()).then(d => { if (d.success) { setCurrentPrep(d.prep); setInterviewPreps(prev => [d.prep, ...prev]); toast.success('Prep generated!'); } setIsGeneratingPrep(false); }); };
  useEffect(() => { fetch('/api/ai/interview-prep').then(r => r.json()).then(d => { if (d.success) setInterviewPreps(d.preps); }); }, []);
  const questions = currentPrep ? JSON.parse(currentPrep.questions || '[]') : [];
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle className="text-base">Generate Interview Prep</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4"><div><Label>Job Title *</Label><Input value={prepForm.jobTitle} onChange={(e) => setPrepForm({ ...prepForm, jobTitle: e.target.value })} /></div><div><Label>Company</Label><Input value={prepForm.company} onChange={(e) => setPrepForm({ ...prepForm, company: e.target.value })} /></div></div>
        <Button onClick={handleGen} disabled={isGeneratingPrep} className="bg-purple-600 text-white gap-2">{isGeneratingPrep ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}{isGeneratingPrep ? 'Generating...' : 'Generate'}</Button>
      </CardContent></Card>
      {currentPrep && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Questions for {currentPrep.jobTitle}</CardTitle></CardHeader><CardContent>
        <div className="space-y-3">{questions.map((q: any, i: number) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}>
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">{i + 1}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium">{q.question}</p><div className="flex items-center gap-1.5 mt-0.5"><Badge variant="outline" className="text-[10px]">{q.category}</Badge><Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge></div></div>
              <ChevronDown className={'w-4 h-4 ' + (expandedQuestion === i ? 'rotate-180' : '')} />
            </div>
            {expandedQuestion === i && <div className="px-4 pb-4 pt-2 border-t bg-muted/20"><p className="text-xs font-semibold text-emerald-600 mb-1">Suggested Answer:</p><p className="text-sm text-muted-foreground whitespace-pre-line">{q.suggestedAnswer}</p></div>}
          </div>
        ))}</div>
      </CardContent></Card>}
      {interviewPreps.length > 1 && <Card><CardHeader className="pb-3"><CardTitle className="text-sm">History</CardTitle></CardHeader><CardContent><div className="space-y-2">{interviewPreps.slice(1).map((p: any) => <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setCurrentPrep(p)}><GraduationCap className="w-4 h-4 text-purple-500" /><div className="flex-1"><p className="text-sm font-medium">{p.jobTitle}{p.company ? ' at ' + p.company : ''}</p></div></div>)}</div></CardContent></Card>}
    </div>
  );
}

// ===== AI CHAT =====
function AIChatTab(props: any) {
  const { chatMessages, setChatMessages, isChatLoading, setIsChatLoading, chatContext, setChatContext, message, setMessage, chatEndRef } = props;
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  const handleSend = () => {
    if (!message.trim() || isChatLoading) return;
    const userMsg = message.trim(); setMessage(''); setIsChatLoading(true);
    const updated = [...chatMessages, { id: 'msg-' + Date.now(), role: 'user', content: userMsg, createdAt: new Date().toISOString() }];
    setChatMessages(updated);
    fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg, context: chatContext }) })
      .then(r => r.json()).then(d => { if (d.success) setChatMessages([...updated, { id: 'msg-' + (Date.now() + 1), role: 'assistant', content: d.response, createdAt: new Date().toISOString() }]); setIsChatLoading(false); })
      .catch(() => { toast.error('Failed'); setIsChatLoading(false); });
  };
  const quickQs = ['What sales roles are available?', 'How to prepare for interviews?', 'Salary tips for Addis Ababa?', 'How to write a great CV?'];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div><div className="flex-1"><h3 className="font-semibold">AI Career Coach</h3><p className="text-xs text-muted-foreground">Ethiopian job market advice</p></div>
        <Select value={chatContext} onValueChange={setChatContext}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="job-search">Job Search</SelectItem><SelectItem value="interview">Interview</SelectItem><SelectItem value="career">Career</SelectItem></SelectContent></Select>
      </div>
      <Card className="overflow-hidden"><div className="h-[400px] flex flex-col"><ScrollArea className="flex-1 p-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center"><Bot className="w-14 h-14 text-muted-foreground/20 mb-3" /><h4 className="font-semibold text-sm mb-1">Ask Your AI Coach</h4><div className="flex flex-wrap gap-1.5 justify-center mt-4">{quickQs.map(q => <Badge key={q} variant="outline" className="cursor-pointer text-[10px] py-1 px-2.5 max-w-[200px]" onClick={() => setMessage(q)}>{q}</Badge>)}</div></div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((msg: ChatMessage) => (
              <div key={msg.id} className={'flex gap-2.5 ' + (msg.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ' + (msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-600')}>{msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}</div>
                <div className={'max-w-[80%] rounded-lg p-2.5 ' + (msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}><p className="whitespace-pre-line text-xs">{msg.content}</p></div>
              </div>
            ))}
            {isChatLoading && <div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><Bot className="w-3 h-3 text-emerald-600" /></div><div className="bg-muted rounded-lg p-2.5"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>}
            <div ref={chatEndRef} />
          </div>
        )}
      </ScrollArea><div className="border-t p-2.5"><div className="flex gap-2"><Input placeholder="Ask about jobs, CVs..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 text-sm" /><Button onClick={handleSend} disabled={!message.trim() || isChatLoading} size="sm" className="bg-emerald-600 text-white"><Send className="w-3.5 h-3.5" /></Button></div></div></div></Card>
    </div>
  );
}

// ===== PROFILE =====
function ProfileTab({ profile, setProfile, profileEditing, setProfileEditing, currentUser }: any) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', location: '', title: '', summary: '', skills: '[]', education: '', experience: '' });
  useEffect(() => { if (profile) setForm({ fullName: profile.fullName || '', email: profile.email || '', phone: profile.phone || '', location: profile.location || '', title: profile.title || '', summary: profile.summary || '', skills: profile.skills || '[]', education: profile.education || '', experience: profile.experience || '' }); }, [profile]);
  const handleSave = () => { fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).then(r => r.json()).then(d => { if (d.success) { setProfile(d.profile); setProfileEditing(false); toast.success('Saved!'); } }); };
  const skills = JSON.parse(form.skills || '[]');
  const [newSkill, setNewSkill] = useState('');
  return (
    <div className="space-y-6"><Card><CardContent className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">{(currentUser?.name || 'U')[0].toUpperCase()}</div>
          <div><h2 className="text-lg font-bold">{currentUser?.name || profile?.fullName || 'Set Your Name'}</h2><p className="text-sm text-muted-foreground">{profile?.title || 'Job Seeker'}</p></div>
        </div>
        <Button onClick={() => setProfileEditing(!profileEditing)} variant="outline" className="gap-1.5"><Edit className="w-3.5 h-3.5" />{profileEditing ? 'Cancel' : 'Edit'}</Button>
      </div>
      {profileEditing ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4"><div><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div><div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div></div>
          <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} /></div>
          <div><Label>Skills</Label><div className="flex flex-wrap gap-1.5 mb-2">{skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
            <div className="flex gap-2"><Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill..." /><Button size="sm" variant="outline" onClick={() => { if (newSkill.trim()) { setForm({ ...form, skills: JSON.stringify([...skills, newSkill.trim()]) }); setNewSkill(''); } }}>Add</Button></div></div>
          <Button onClick={handleSave} className="bg-emerald-600 text-white gap-2"><Check className="w-4 h-4" />Save</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-4"><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{profile?.email}</p></div><div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm">{profile?.phone}</p></div><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm">{profile?.location}</p></div><div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm">{profile?.title}</p></div></div>
          {skills.length > 0 && <div><p className="text-xs text-muted-foreground mb-1">Skills ({skills.length})</p><div className="flex flex-wrap gap-1.5">{skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></div>}
        </div>
      )}
    </CardContent></Card></div>
  );
}

// ===== JOB BOARD =====
function JobBoardTab({ employerJobs, setEmployerJobs }: any) {
  useEffect(() => { fetch('/api/employer/jobs?all=true').then(r => r.json()).then(d => { if (d.success) setEmployerJobs(d.jobs); }); }, []);
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Job Board</h2>
      {employerJobs.length === 0 ? <Card><CardContent className="p-8 text-center"><Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" /><p className="text-sm text-muted-foreground">No jobs posted yet</p></CardContent></Card> : (
        <div className="grid sm:grid-cols-2 gap-4">{employerJobs.map((job: any) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow"><CardContent className="p-5">
            <h3 className="font-semibold">{job.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">{job.company && <span>{job.company}</span>}{job.location && <span>• {job.location}</span>}</div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
            {job.deadline && <p className="text-xs text-muted-foreground mt-2">Deadline: {job.deadline}</p>}
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
}

// ===== EMPLOYER PORTAL =====
function EmployerPortalTab({ employerJobs, setEmployerJobs, currentUser, authToken }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', company: '', location: '', type: '', salary: '', category: '', description: '', requirements: '', deadline: '' });
  const [posting, setPosting] = useState(false);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

  useEffect(() => { fetch('/api/employer/jobs', { headers: { Authorization: 'Bearer ' + authToken } }).then(r => r.json()).then(d => { if (d.success) setEmployerJobs(d.jobs); }); }, [authToken]);
  const handlePost = () => { if (!form.title || !form.description) return; setPosting(true); fetch('/api/employer/jobs', { method: 'POST', headers, body: JSON.stringify(form) }).then(r => r.json()).then(d => { if (d.success) { toast.success('Posted!'); setForm({ title: '', company: '', location: '', type: '', salary: '', category: '', description: '', requirements: '', deadline: '' }); setShowForm(false); fetch('/api/employer/jobs', { headers: { Authorization: 'Bearer ' + authToken } }).then(r => r.json()).then(dd => { if (dd.success) setEmployerJobs(dd.jobs); }); } }); setPosting(false); };
  const handleDel = (id: string) => { fetch('/api/employer/jobs?id=' + id, { method: 'DELETE', headers }); toast.success('Deleted'); setEmployerJobs(employerJobs.filter((j: any) => j.id !== id)); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Employer Portal</h2><Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white gap-2"><Plus className="w-4 h-4" />Post Job</Button></div>
      {showForm && <Card className="border-emerald-200"><CardContent className="p-5 space-y-4">
        <h3 className="font-semibold">Post New Job</h3>
        <div className="grid sm:grid-cols-2 gap-4"><div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div><div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div><div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="full-time">Full-Time</SelectItem><SelectItem value="part-time">Part-Time</SelectItem><SelectItem value="remote">Remote</SelectItem></SelectContent></Select></div></div>
        <div><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
        <div><Label>Requirements</Label><Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={2} /></div>
        <div className="flex gap-2"><Button onClick={handlePost} disabled={posting} className="bg-emerald-600 text-white gap-2">{posting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{posting ? 'Posting...' : 'Post Job'}</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
      </CardContent></Card>}
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Your Jobs ({employerJobs.length})</CardTitle></CardHeader><CardContent>
        {employerJobs.length === 0 ? <div className="text-center py-8 text-muted-foreground"><p className="text-sm">No jobs posted</p></div> : (
          <ScrollArea className="max-h-[400px]"><div className="space-y-2">{employerJobs.map((job: any) => (<div key={job.id} className="flex items-center gap-3 p-3 border rounded-lg"><div className="flex-1"><p className="text-sm font-medium">{job.title}</p><p className="text-xs text-muted-foreground">{job.company} • {job.location || 'N/A'}</p></div><Button variant="ghost" size="sm" className="h-8 text-xs text-red-500" onClick={() => handleDel(job.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>))}</div></ScrollArea>
        )}
      </CardContent></Card>
    </div>
  );
}

// ===== ADMIN PANEL =====
function AdminPanelTab({ authToken }: any) {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const load = () => { const h: Record<string, string> = {}; if (authToken) h['Authorization'] = 'Bearer ' + authToken; Promise.all([fetch('/api/admin/stats', { headers: h }), fetch('/api/admin/users?limit=10', { headers: h })]).then(([sr, ur]) => Promise.all([sr.json(), ur.json()])).then(([sd, ud]) => { if (sd.success) setStats(sd.stats); if (ud.success) setUsers(ud.users); }); };
  useEffect(() => { load(); }, [authToken]);
  const updateUser = (userId: string, updates: any) => { const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (authToken) h['Authorization'] = 'Bearer ' + authToken; fetch('/api/admin/users', { method: 'PUT', headers: h, body: JSON.stringify({ userId, ...updates }) }).then(() => { toast.success('Updated'); load(); }); };
  if (!stats) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Admin Dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[{ l: 'Users', v: stats.totalUsers }, { l: 'Seekers', v: stats.totalJobSeekers }, { l: 'Employers', v: stats.totalEmployers }, { l: 'Premium', v: stats.totalPremium }, { l: 'Active Today', v: stats.activeToday }].map(s => <Card key={s.l}><CardContent className="p-4 text-center"><p className="text-xl font-bold">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></CardContent></Card>)}
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Users</CardTitle></CardHeader><CardContent>
        <ScrollArea className="max-h-[500px]"><div className="space-y-2">{users.map((u: any) => (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">{(u.name || u.email)[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{u.name || u.email}</p><p className="text-xs text-muted-foreground">{u.email} • {new Date(u.createdAt).toLocaleDateString()}</p></div>
            <div className="flex gap-2">
              <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v })}><SelectTrigger className="w-24 h-7 text-[10px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobseeker">Seeker</SelectItem><SelectItem value="employer">Employer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
              <Select value={u.tier} onValueChange={(v) => updateUser(u.id, { tier: v })}><SelectTrigger className="w-24 h-7 text-[10px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select>
            </div>
          </div>
        ))}</div></ScrollArea>
      </CardContent></Card>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  const s = useLocalState();
  useEffect(() => { fetch('/api/profile').then(r => r.json()).then(d => { if (d.success) s.setProfile(d.profile); }).catch(() => {}); }, []);
  useEffect(() => { fetch('/api/applications').then(r => r.json()).then(d => { if (d.success) s.setApplications(d.applications); }).catch(() => {}); }, []);

  if (!s.currentUser) {
    return (<><LandingPage setShowAuthModal={s.setShowAuthModal} setAuthMode={s.setAuthMode} /><AuthModal show={s.showAuthModal} setShow={s.setShowAuthModal} mode={s.authMode} setMode={s.setAuthMode} form={s.authForm} setForm={s.setAuthForm} loading={s.authLoading} onLogin={s.handleLogin} onRegister={s.handleRegister} /></>);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeTab={s.activeTab} setActiveTab={s.setActiveTab} currentUser={s.currentUser} onLogout={s.handleLogout} onShowAuth={() => s.setShowAuthModal(true)} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {s.activeTab === 'dashboard' && <DashboardTab applications={s.applications} profile={s.profile} currentUser={s.currentUser} />}
        {s.activeTab === 'auto-apply' && <AutoApplyTab applications={s.applications} setApplications={s.setApplications} pdfDialogApp={s.pdfDialogApp} setPdfDialogApp={s.setPdfDialogApp} pdfData={s.pdfData} setPdfData={s.setPdfData} isGeneratingPdf={s.isGeneratingPdf} setIsGeneratingPdf={s.setIsGeneratingPdf} isRunningCycle={s.isRunningCycle} setIsRunningCycle={s.setIsRunningCycle} runLogs={s.runLogs} setRunLogs={s.setRunLogs} expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter} countdownStr={s.countdownStr} currentUser={s.currentUser} />}
        {s.activeTab === 'applications' && <ApplicationsTab applications={s.applications} setApplications={s.setApplications} />}
        {s.activeTab === 'cover-letters' && <CoverLettersTab applications={s.applications} coverLetterForm={s.coverLetterForm} setCoverLetterForm={s.setCoverLetterForm} generatedCoverLetter={s.generatedCoverLetter} setGeneratedCoverLetter={s.setGeneratedCoverLetter} isGeneratingCoverLetter={s.isGeneratingCoverLetter} setIsGeneratingCoverLetter={s.setIsGeneratingCoverLetter} expandedCoverLetter={s.expandedCoverLetter} setExpandedCoverLetter={s.setExpandedCoverLetter} />}
        {s.activeTab === 'cv-analyzer' && <CvAnalyzerTab cvAnalysis={s.cvAnalysis} setCvAnalysis={s.setCvAnalysis} isAnalyzingCv={s.isAnalyzingCv} setIsAnalyzingCv={s.setIsAnalyzingCv} />}
        {s.activeTab === 'interview-prep' && <InterviewPrepTab interviewPreps={s.interviewPreps} setInterviewPreps={s.setInterviewPreps} currentPrep={s.currentPrep} setCurrentPrep={s.setCurrentPrep} isGeneratingPrep={s.isGeneratingPrep} setIsGeneratingPrep={s.setIsGeneratingPrep} prepForm={s.prepForm} setPrepForm={s.setPrepForm} expandedQuestion={s.expandedQuestion} setExpandedQuestion={s.setExpandedQuestion} />}
        {s.activeTab === 'ai-chat' && <AIChatTab chatMessages={s.chatMessages} setChatMessages={s.setChatMessages} isChatLoading={s.isChatLoading} setIsChatLoading={s.setIsChatLoading} chatContext={s.chatContext} setChatContext={s.setChatContext} message={s.message} setMessage={s.setMessage} chatEndRef={s.chatEndRef} />}
        {s.activeTab === 'profile' && <ProfileTab profile={s.profile} setProfile={s.setProfile} profileEditing={s.profileEditing} setProfileEditing={s.setProfileEditing} currentUser={s.currentUser} />}
        {s.activeTab === 'job-board' && <JobBoardTab employerJobs={s.employerJobs} setEmployerJobs={s.setEmployerJobs} />}
        {s.activeTab === 'employer-jobs' && <EmployerPortalTab employerJobs={s.employerJobs} setEmployerJobs={s.setEmployerJobs} currentUser={s.currentUser} authToken={s.authToken} />}
        {s.activeTab === 'admin' && <AdminPanelTab authToken={s.authToken} />}
      </main>
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2"><div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Briefcase className="w-3 h-3 text-white" /></div><span className="font-semibold text-sm">Career AI Ethiopia</span></div>
          <p className="text-xs text-muted-foreground">Hambisa Bekuma Tefera — Addis Ababa, Ethiopia • +251 952 341 525</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">🤖 AI-Powered Job Search • Auto-search every hour • 15+ sources</p>
        </div>
      </footer>
    </div>
  );
}
