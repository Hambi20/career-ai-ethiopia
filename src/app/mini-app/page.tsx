'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, LayoutGrid, Search, User, RefreshCw, Loader2,
  ChevronLeft, Clock, CalendarDays, FileText, CheckSquare,
  Building2, GraduationCap, Monitor, Briefcase, Mail,
  Target, BookOpen, BarChart3, Database, Bot, Users,
  Settings, Bell, Zap, Lightbulb, TrendingUp, ClipboardList,
  Upload, Download, Send, Globe, Brain, UserPlus, BarChart2,
  MessageSquare, FileUp, PenTool, Compass, AlertCircle, Star,
  ChevronDown, ChevronUp, ArrowLeft, CircleDot, Hash,
  StickyNote, Bookmark, FolderOpen, Link2, Cpu, Heart,
  Shield, Info, Activity, PieChart, ListChecks, Award,
  Wallet, ArrowUpRight, ArrowDownRight, ChevronRight, Plus, CheckCircle2,
  X, Check, Camera, ScanLine, Sparkles, Eye, FileSearch, DownloadCloud,
  KeyRound, MailOpen, ArrowDownToLine, LineChart, Predicted
} from 'lucide-react';

// ─── Telegram WebApp Types ───────────────────────────────────────────────────

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    color: string;
    textColor: string;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    chat?: { id: number; type: string; title?: string };
    start_param?: string;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ type: string; text: string }> }) => void;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset: { top: number; bottom: number; left: number; right: number };
  headerColor: string;
  backgroundColor: string;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

// ─── Data Types ──────────────────────────────────────────────────────────────

interface BotData {
  success: boolean;
  hasData: boolean;
  summary: {
    totalRomelReports: number;
    totalVdReports: number;
    totalTasks: number;
    tasksDone: number;
    tasksTodo: number;
    tasksInProgress: number;
    taskCompletionRate: number;
    totalNotes: number;
    totalContacts: number;
    totalKnowledge: number;
    dailyAchievementRate: number;
    lastSync: string | null;
    totalSyncs: number;
  };
  sales: {
    summary: Record<string, unknown>;
    totalDailyTarget: number;
    totalDailyActual: number;
    latestReport: Record<string, unknown> | null;
    reports: Record<string, unknown>[];
  };
  tasks: { list: TaskItem[]; byPriority: Record<string, number>; byStatus: Record<string, number> };
  notes: NoteItem[];
  contacts: { list: ContactItem[]; breakdown: Record<string, number> };
  knowledgeBase: KnowledgeItem[];
  vdReports: Record<string, unknown>[];
  recentActivities: ActivityItem[];
  rawSyncData: Record<string, unknown>;
  syncCount: number;
  updatedAt: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
  category?: string;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  category?: string;
}

interface ContactItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  type?: string;
  company?: string;
  notes?: string;
}

interface KnowledgeItem {
  id: string;
  topic: string;
  content: string;
  createdAt?: string;
  source?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface ReportsData {
  success: boolean;
  total: number;
  filtered: ReportItem[];
  filters: { types: string[]; companies: string[] };
  stats: {
    total: number;
    today: number;
    thisWeek: number;
    byType: Record<string, number>;
  };
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'time';
  placeholder: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
}

interface ReportItem {
  id: string;
  type: string;
  company: string;
  category: string;
  title: string;
  content: string;
  summary: string;
  date: string;
  timestamp: string;
}

// ─── Category Definitions ────────────────────────────────────────────────────

type CategoryId = 'daily' | 'romel' | 'college' | 'tech' | 'jobs' | 'communication' | 'strategy' | 'learning' | 'reports' | 'data' | 'ai' | 'crm' | 'core' | 'business' | 'finance' | 'calendar' | 'documents';

interface CommandDef {
  name: string;
  cmd: string;
  description: string;
}

interface CategoryDef {
  id: CategoryId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  commands: CommandDef[];
  dataKeys: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'daily', name: 'Daily', emoji: '📋', color: 'emerald',
    bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400',
    commands: [
      { name: 'Briefing', cmd: '/briefing', description: 'Get your daily briefing' },
      { name: 'Verse', cmd: '/verse', description: 'Daily inspiration verse' },
      { name: 'Set Reminder', cmd: '/setreminder', description: 'Create a new reminder' },
      { name: 'Reminders', cmd: '/reminders', description: 'View all reminders' },
    ],
    dataKeys: [],
  },
  {
    id: 'romel', name: 'ROMEL', emoji: '🏢', color: 'orange',
    bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30', textColor: 'text-orange-400',
    commands: [
      { name: 'Log', cmd: '/log', description: 'Log sales activity' },
      { name: 'KPI', cmd: '/kpi', description: 'View KPI performance' },
      { name: 'Romel', cmd: '/romel', description: 'Romel sales report' },
      { name: 'Romel History', cmd: '/romelhistory', description: 'View sales history' },
      { name: 'Target', cmd: '/target', description: 'View/set sales targets' },
    ],
    dataKeys: ['sales', 'reports'],
  },
  {
    id: 'college', name: 'College', emoji: '🎓', color: 'purple',
    bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30', textColor: 'text-purple-400',
    commands: [
      { name: 'College', cmd: '/college', description: 'College overview' },
      { name: 'Admission', cmd: '/admission', description: 'Admission info' },
      { name: 'Exam', cmd: '/exam', description: 'Exam schedule & results' },
      { name: 'Report', cmd: '/reportcollege', description: 'College report' },
      { name: 'Evaluate', cmd: '/eval', description: 'Evaluate performance' },
      { name: 'VC Report', cmd: '/vicereport', description: 'Vice Dean single report' },
      { name: 'VC Reports', cmd: '/vicereports', description: 'All VC reports' },
      { name: 'Quarterly', cmd: '/quarterly', description: 'Quarterly summary' },
      { name: 'Employees', cmd: '/employees', description: 'Employee records' },
      { name: 'Staff', cmd: '/staff', description: 'Staff management' },
    ],
    dataKeys: ['vdReports', 'reports'],
  },
  {
    id: 'tech', name: 'Tech', emoji: '💻', color: 'cyan',
    bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-400',
    commands: [
      { name: 'Tech', cmd: '/tech', description: 'Tech overview' },
      { name: 'Students', cmd: '/students', description: 'Student records' },
    ],
    dataKeys: [],
  },
  {
    id: 'jobs', name: 'Jobs', emoji: '💼', color: 'blue',
    bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30', textColor: 'text-blue-400',
    commands: [
      { name: 'Apply', cmd: '/apply', description: 'Apply for a job' },
      { name: 'My CV', cmd: '/cv', description: 'View your CV' },
      { name: 'Courses', cmd: '/courses', description: 'Available courses' },
      { name: 'Upload CV', cmd: '/uploadcv', description: 'Upload CV file' },
      { name: 'Paste CV', cmd: '/cvpaste', description: 'Paste CV text' },
      { name: 'Find Jobs', cmd: '/findjobs', description: 'Search for jobs' },
      { name: 'My CVs', cmd: '/mycv', description: 'Manage your CVs' },
    ],
    dataKeys: ['rawSyncData'],
  },
  {
    id: 'communication', name: 'Communication', emoji: '📧', color: 'pink',
    bgColor: 'bg-pink-500/15', borderColor: 'border-pink-500/30', textColor: 'text-pink-400',
    commands: [
      { name: 'Email', cmd: '/email', description: 'Compose email' },
      { name: 'Meeting', cmd: '/meeting', description: 'Schedule meeting' },
      { name: 'Draft', cmd: '/draft', description: 'View/edit drafts' },
    ],
    dataKeys: [],
  },
  {
    id: 'strategy', name: 'Strategy', emoji: '🎯', color: 'amber',
    bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', textColor: 'text-amber-400',
    commands: [
      { name: 'Goals', cmd: '/goals', description: 'View/set goals' },
      { name: 'SWOT', cmd: '/swot', description: 'SWOT analysis' },
      { name: 'Plan', cmd: '/plan', description: 'Strategic plan' },
    ],
    dataKeys: [],
  },
  {
    id: 'learning', name: 'Learning', emoji: '📚', color: 'indigo',
    bgColor: 'bg-indigo-500/15', borderColor: 'border-indigo-500/30', textColor: 'text-indigo-400',
    commands: [
      { name: 'Books', cmd: '/books', description: 'Book recommendations' },
      { name: 'Podcast', cmd: '/podcast', description: 'Podcast suggestions' },
      { name: 'Tasks', cmd: '/tasks', description: 'View learning tasks' },
      { name: 'Ask', cmd: '/ask', description: 'Ask a question' },
    ],
    dataKeys: ['tasks'],
  },
  {
    id: 'reports', name: 'Reports', emoji: '📊', color: 'teal',
    bgColor: 'bg-teal-500/15', borderColor: 'border-teal-500/30', textColor: 'text-teal-400',
    commands: [
      { name: 'Week Report', cmd: '/weekreport', description: 'Weekly summary report' },
      { name: 'Raw Report', cmd: '/rawreport', description: 'Raw data report' },
    ],
    dataKeys: ['reports'],
  },
  {
    id: 'data', name: 'Data', emoji: '💾', color: 'slate',
    bgColor: 'bg-slate-500/15', borderColor: 'border-slate-500/30', textColor: 'text-slate-400',
    commands: [
      { name: 'Note', cmd: '/note', description: 'Create a note' },
      { name: 'Notes', cmd: '/notes', description: 'View all notes' },
      { name: 'Search', cmd: '/search', description: 'Search data' },
      { name: 'Save Data', cmd: '/savedata', description: 'Save data to memory' },
      { name: 'Load Data', cmd: '/loaddata', description: 'Load saved data' },
      { name: 'Export JSON', cmd: '/exportjson', description: 'Export as JSON' },
      { name: 'Send Data', cmd: '/senddata', description: 'Send data to chat' },
      { name: 'Sync Web', cmd: '/syncweb', description: 'Sync with web' },
    ],
    dataKeys: ['notes'],
  },
  {
    id: 'ai', name: 'AI', emoji: '🤖', color: 'violet',
    bgColor: 'bg-violet-500/15', borderColor: 'border-violet-500/30', textColor: 'text-violet-400',
    commands: [
      { name: 'Auto Learn', cmd: '/autolearn', description: 'AI auto-learning mode' },
      { name: 'Teach', cmd: '/teach', description: 'Teach the AI' },
      { name: 'Knowledge', cmd: '/knowledge', description: 'View knowledge base' },
    ],
    dataKeys: ['knowledgeBase'],
  },
  {
    id: 'crm', name: 'CRM', emoji: '📇', color: 'rose',
    bgColor: 'bg-rose-500/15', borderColor: 'border-rose-500/30', textColor: 'text-rose-400',
    commands: [
      { name: 'Scrape', cmd: '/scrape', description: 'Scrape contacts' },
      { name: 'Contacts', cmd: '/contacts', description: 'View contacts' },
      { name: 'Analytics', cmd: '/analytics', description: 'CRM analytics' },
    ],
    dataKeys: ['contacts'],
  },
  {
    id: 'core', name: 'Core', emoji: '⚙️', color: 'gray',
    bgColor: 'bg-gray-500/15', borderColor: 'border-gray-500/30', textColor: 'text-gray-400',
    commands: [
      { name: 'Help', cmd: '/help', description: 'Show help & commands' },
      { name: 'Dashboard', cmd: '/dashboard', description: 'Open dashboard' },
      { name: 'Sync', cmd: '/sync', description: 'Sync all data' },
      { name: 'Profile', cmd: '/profile', description: 'View profile' },
    ],
    dataKeys: [],
  },
  {
    id: 'business', name: 'Business', emoji: '🏢', color: 'emerald',
    bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400',
    commands: [
      { name: 'Business', cmd: '/business', description: 'Business overview' },
      { name: 'Businesses', cmd: '/businesses', description: 'View all businesses' },
      { name: 'Biz', cmd: '/biz', description: 'Quick business info' },
    ],
    dataKeys: [],
  },
  {
    id: 'finance', name: 'Finance', emoji: '💰', color: 'orange',
    bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30', textColor: 'text-orange-400',
    commands: [
      { name: 'Income', cmd: '/income', description: 'Log income' },
      { name: 'Expense', cmd: '/expense', description: 'Log expense' },
      { name: 'Budget', cmd: '/budget', description: 'View/set budget' },
      { name: 'Finance', cmd: '/finance', description: 'Finance overview' },
      { name: 'Transfer', cmd: '/transfer', description: 'Transfer funds' },
    ],
    dataKeys: [],
  },
  {
    id: 'calendar', name: 'Calendar', emoji: '📅', color: 'cyan',
    bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-400',
    commands: [
      { name: 'Event', cmd: '/event', description: 'Create an event' },
      { name: 'Events', cmd: '/events', description: 'View all events' },
      { name: 'Remind', cmd: '/remind', description: 'Set a reminder' },
      { name: 'Schedule', cmd: '/schedule', description: 'View schedule' },
    ],
    dataKeys: [],
  },
  {
    id: 'documents', name: 'Documents', emoji: '📄', color: 'slate',
    bgColor: 'bg-slate-500/15', borderColor: 'border-slate-500/30', textColor: 'text-slate-400',
    commands: [
      { name: 'Save File', cmd: '/savefile', description: 'Save a file' },
      { name: 'Files', cmd: '/files', description: 'View all files' },
      { name: 'Documents', cmd: '/documents', description: 'View documents' },
    ],
    dataKeys: [],
  },
];

// Quick actions for Home tab (most-used commands)
const QUICK_ACTIONS: CommandDef[] = [
  { name: 'Briefing', cmd: '/briefing', description: 'Daily briefing' },
  { name: 'KPI', cmd: '/kpi', description: 'KPI performance' },
  { name: 'Tasks', cmd: '/tasks', description: 'View tasks' },
  { name: 'Notes', cmd: '/notes', description: 'All notes' },
  { name: 'Contacts', cmd: '/contacts', description: 'CRM contacts' },
  { name: 'Knowledge', cmd: '/knowledge', description: 'AI knowledge' },
  { name: 'Week Report', cmd: '/weekreport', description: 'Weekly report' },
  { name: 'Find Jobs', cmd: '/findjobs', description: 'Job search' },
  { name: 'Business', cmd: '/business', description: 'Business overview' },
  { name: 'Income', cmd: '/income', description: 'Log income' },
  { name: 'Event', cmd: '/event', description: 'Create event' },
  { name: 'Files', cmd: '/files', description: 'View files' },
];

// ─── Theme Helper ────────────────────────────────────────────────────────────

interface ThemeColors {
  bg: string;
  bgCard: string;
  bgCardHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  isDark: boolean;
  safeTop: number;
  safeBottom: number;
}

function getTelegramTheme(): ThemeColors {
  if (typeof window === 'undefined') {
    return {
      bg: '#1a1a2e', bgCard: '#16213e', bgCardHover: '#1a2744',
      text: '#e4e4e7', textSecondary: '#a1a1aa', textMuted: '#71717a',
      border: '#27272a', isDark: true, safeTop: 0, safeBottom: 0,
    };
  }

  const tg = window.Telegram?.WebApp;
  const tp = tg?.themeParams || {};
  const isDark = tg?.colorScheme === 'dark';

  return {
    bg: tp.bg_color || (isDark ? '#1a1a2e' : '#ffffff'),
    bgCard: tp.secondary_bg_color || (isDark ? '#16213e' : '#f4f4f5'),
    bgCardHover: isDark ? '#1a2744' : '#e4e4e7',
    text: tp.text_color || (isDark ? '#e4e4e7' : '#18181b'),
    textSecondary: tp.hint_color || (isDark ? '#a1a1aa' : '#71717a'),
    textMuted: isDark ? '#52525b' : '#a1a1aa',
    border: isDark ? '#27272a' : '#e4e4e7',
    isDark,
    safeTop: tg?.safeAreaInset?.top || 0,
    safeBottom: tg?.safeAreaInset?.bottom || 0,
  };
}

// ─── Telegram Helpers ────────────────────────────────────────────────────────

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined') {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  }
}

function showCommandPopup(cmd: string) {
  haptic('light');
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showPopup) {
    window.Telegram.WebApp.showPopup({
      title: 'Command',
      message: `Type ${cmd} in chat to use this feature`,
    });
  } else if (typeof window !== 'undefined') {
    // Fallback for dev mode
    alert(`Type ${cmd} in chat to use this feature`);
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/10 ${className || ''}`} />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type TabId = 'home' | 'categories' | 'finance' | 'calendar' | 'ai' | 'search' | 'profile';

export default function MiniAppPage() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryDef | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [botData, setBotData] = useState<BotData | null>(null);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeColors>(getTelegramTheme);
  const [expandedSearchItem, setExpandedSearchItem] = useState<string | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [financeData, setFinanceData] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any>(null);

  // AI Features state
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptAnalysis, setReceiptAnalysis] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [docFile, setDocFile] = useState<string | null>(null);
  const [docAnalysis, setDocAnalysis] = useState<any>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [aiView, setAiView] = useState<'menu' | 'receipt' | 'document' | 'analytics' | 'email' | 'api'>('menu');
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window === 'undefined') return new Date().toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  });

  // Form modal state
  const [formModal, setFormModal] = useState<{
    open: boolean;
    type: string;
    title: string;
    fields: FormField[];
  }>({ open: false, type: '', title: '', fields: [] });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);

  // Initialize Telegram
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTheme(getTelegramTheme());
      // Listen for theme changes
      tg.onEvent?.('themeChanged', () => {
        setTheme(getTelegramTheme());
      });
    }
  }, []);

  // Back button handling for category drill-down
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    if (selectedCategory) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        haptic('light');
        setSelectedCategory(null);
      });
    } else {
      tg.BackButton.hide();
    }
    return () => {
      tg.BackButton.hide();
    };
  }, [selectedCategory]);

  // Fetch data
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const [dataRes, reportsRes] = await Promise.all([
        fetch('/api/bot/data'),
        fetch('/api/bot/reports'),
      ]);
      if (!dataRes.ok || !reportsRes.ok) throw new Error('Failed to fetch data');
      const [dataJson, reportsJson] = await Promise.all([dataRes.json(), reportsRes.json()]);
      setBotData(dataJson);
      setReportsData(reportsJson);

      // Finance
      try {
        const r = await fetch('/api/finance?limit=50');
        const d = await r.json();
        if (d.success) setFinanceData(d);
      } catch { /* silent */ }

      // Calendar
      try {
        const r = await fetch('/api/calendar?limit=50');
        const d = await r.json();
        if (d.success) setCalendarData(d);
      } catch { /* silent */ }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setPullRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current === 0) return;
    if (scrollRef.current && scrollRef.current.scrollTop > 0) {
      pullStartY.current = 0;
      pullDistance.current = 0;
      return;
    }
    const dist = e.touches[0].clientY - pullStartY.current;
    if (dist > 0) {
      pullDistance.current = Math.min(dist * 0.5, 80);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 50) {
      setPullRefreshing(true);
      fetchData(false);
    }
    pullStartY.current = 0;
    pullDistance.current = 0;
  }, [fetchData]);

  // Navigation
  const goToCategory = (cat: CategoryDef) => {
    haptic('medium');
    setSelectedCategory(cat);
  };

  const goBack = () => {
    haptic('light');
    setSelectedCategory(null);
  };

  // ─── Form System ─────────────────────────────────────────────────────────

  const FORM_CONFIGS: Record<string, { title: string; fields: FormField[] }> = {
    income: {
      title: 'Add Income',
      fields: [
        { name: 'amount', label: 'Amount (ETB)', type: 'number', placeholder: '0', required: true },
        { name: 'category', label: 'Category', type: 'select', placeholder: 'Select category', options: ['Salary', 'Sales', 'Service', 'Freelance', 'Investment', 'Other'] },
        { name: 'description', label: 'Description', type: 'text', placeholder: 'What is this income for?' },
      ],
    },
    expense: {
      title: 'Add Expense',
      fields: [
        { name: 'amount', label: 'Amount (ETB)', type: 'number', placeholder: '0', required: true },
        { name: 'category', label: 'Category', type: 'select', placeholder: 'Select category', options: ['Food', 'Transport', 'Rent', 'Supplies', 'Utility', 'Internet', 'Phone', 'Other'] },
        { name: 'description', label: 'Description', type: 'text', placeholder: 'What is this expense for?' },
      ],
    },
    event: {
      title: 'Add Event',
      fields: [
        { name: 'title', label: 'Event title', type: 'text', placeholder: 'Meeting with team', required: true },
        { name: 'date', label: 'Date', type: 'date', placeholder: '', required: true },
        { name: 'time', label: 'Time', type: 'time', placeholder: '' },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'Office, Zoom, etc.' },
        { name: 'type', label: 'Type', type: 'select', placeholder: 'Select type', options: ['Event', 'Meeting', 'Reminder', 'Deadline'], defaultValue: 'Event' },
        { name: 'priority', label: 'Priority', type: 'select', placeholder: 'Select priority', options: ['Low', 'Medium', 'High', 'Urgent'], defaultValue: 'Medium' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Event details...' },
      ],
    },
    reminder: {
      title: 'Add Reminder',
      fields: [
        { name: 'title', label: 'Reminder title', type: 'text', placeholder: 'Call the client', required: true },
        { name: 'date', label: 'Date', type: 'date', placeholder: '', required: true },
        { name: 'time', label: 'Time', type: 'time', placeholder: '' },
        { name: 'priority', label: 'Priority', type: 'select', placeholder: 'Select priority', options: ['Low', 'Medium', 'High', 'Urgent'], defaultValue: 'High' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Reminder details...' },
      ],
    },
    business: {
      title: 'Add Business',
      fields: [
        { name: 'name', label: 'Business name', type: 'text', placeholder: 'My Company', required: true },
        { name: 'type', label: 'Type', type: 'select', placeholder: 'Select type', options: ['Tech', 'College', 'Consulting', 'EV Charging', 'Training', 'Other'] },
        { name: 'industry', label: 'Industry', type: 'text', placeholder: 'Technology, Education, etc.' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Business description...' },
      ],
    },
    note: {
      title: 'Add Note',
      fields: [
        { name: 'title', label: 'Note title', type: 'text', placeholder: 'Meeting notes', required: true },
        { name: 'content', label: 'Note content', type: 'textarea', placeholder: 'Write your note here...', required: true },
      ],
    },
    document: {
      title: 'Add Document',
      fields: [
        { name: 'title', label: 'Document title', type: 'text', placeholder: 'Monthly Report', required: true },
        { name: 'category', label: 'Category', type: 'select', placeholder: 'Select category', options: ['Report', 'Invoice', 'Contract', 'CV', 'Letter', 'Memo', 'Receipt', 'Certificate', 'Other'] },
        { name: 'description', label: 'Description', type: 'text', placeholder: 'Brief description' },
        { name: 'tags', label: 'Tags (comma separated)', type: 'text', placeholder: 'finance, monthly, 2024' },
      ],
    },
  };

  const openForm = (type: string) => {
    const config = FORM_CONFIGS[type];
    if (!config) return false;
    haptic('medium');
    const initialValues: Record<string, string> = {};
    config.fields.forEach((f) => {
      initialValues[f.name] = f.defaultValue || '';
    });
    setFormValues(initialValues);
    setFormError('');
    setFormModal({ open: true, type, title: config.title, fields: config.fields });
    return true;
  };

  const openFormForCommand = (cmd: string) => {
    const cmdMap: Record<string, string> = {
      '/income': 'income',
      '/expense': 'expense',
      '/event': 'event',
      '/remind': 'reminder',
      '/setreminder': 'reminder',
      '/business': 'business',
      '/note': 'note',
      '/files': 'document',
      '/documents': 'document',
      '/savefile': 'document',
    };
    const formType = cmdMap[cmd];
    if (formType && openForm(formType)) return;
    showCommandPopup(cmd);
  };

  const closeForm = () => {
    haptic('light');
    setFormModal({ open: false, type: '', title: '', fields: [] });
    setFormValues({});
    setFormError('');
  };

  const updateFormValue = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    // Validate required fields
    const missingField = formModal.fields.find((f) => f.required && !formValues[f.name]?.trim());
    if (missingField) {
      haptic('error' as any);
      setFormError(`${missingField.label} is required`);
      return;
    }

    setFormLoading(true);
    setFormError('');
    try {
      let url = '';
      let body: Record<string, unknown> = {};

      switch (formModal.type) {
        case 'income':
        case 'expense':
          url = '/api/finance';
          body = {
            type: formModal.type,
            amount: parseFloat(formValues.amount),
            category: formValues.category || 'Other',
            description: formValues.description || '',
            date: new Date().toISOString().split('T')[0],
            chatId: 0,
          };
          break;
        case 'event':
          url = '/api/calendar';
          body = {
            title: formValues.title,
            date: formValues.date,
            time: formValues.time || null,
            location: formValues.location || '',
            type: (formValues.type || 'event').toLowerCase(),
            priority: (formValues.priority || 'medium').toLowerCase(),
            chatId: 0,
          };
          break;
        case 'reminder':
          url = '/api/calendar';
          body = {
            title: formValues.title,
            date: formValues.date,
            time: formValues.time || null,
            type: 'reminder',
            priority: 'high',
            chatId: 0,
          };
          break;
        case 'business':
          url = '/api/businesses';
          body = {
            name: formValues.name,
            type: formValues.type || 'Other',
            industry: formValues.industry || '',
            description: formValues.description || '',
          };
          break;
        case 'note':
          url = '/api/bot/reports';
          body = {
            type: 'note',
            title: formValues.title,
            content: formValues.content,
            category: 'note',
            chatId: 0,
          };
          break;
        case 'document':
          url = '/api/documents';
          body = {
            title: formValues.title,
            category: formValues.category || 'Other',
            description: formValues.description || '',
            tags: JSON.stringify(
              (formValues.tags || '')
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean) || []
            ),
          };
          break;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        if (typeof window !== 'undefined') {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        }
        setFormModal({ open: false, type: '', title: '', fields: [] });
        setFormValues({});
        setFormSuccess(true);
        setTimeout(() => setFormSuccess(false), 2000);
        fetchData(false);
      } else {
        if (typeof window !== 'undefined') {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
        }
        setFormError(data.error || 'Failed to save');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setFormLoading(false);
    }
  };

  // ─── AI Feature Functions ────────────────────────────────────────────────

  const handleReceiptScan = async (file: File) => {
    haptic('medium');
    setReceiptLoading(true);
    setReceiptAnalysis(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setReceiptImage(reader.result as string);
        const res = await fetch('/api/ai/analyze-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          setReceiptAnalysis(data.data);
          haptic('success' as any);
        } else {
          setReceiptAnalysis({ error: data.error || 'Failed to analyze receipt' });
        }
        setReceiptLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setReceiptAnalysis({ error: 'Failed to read file' });
      setReceiptLoading(false);
    }
  };

  const handleReceiptConfirm = async () => {
    if (!receiptAnalysis || receiptAnalysis.error) return;
    setReceiptLoading(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          amount: parseFloat(receiptAnalysis.amount) || 0,
          category: receiptAnalysis.category || 'Other',
          description: receiptAnalysis.merchantName || receiptAnalysis.description || 'Receipt',
          date: receiptAnalysis.date || new Date().toISOString().split('T')[0],
          chatId: 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        }
        setReceiptImage(null);
        setReceiptAnalysis(null);
        setAiView('menu');
        setFormSuccess(true);
        setTimeout(() => setFormSuccess(false), 2000);
        fetchData(false);
      }
    } catch { /* silent */ }
    setReceiptLoading(false);
  };

  const handleDocumentUpload = async (file: File) => {
    haptic('medium');
    setDocLoading(true);
    setDocAnalysis(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setDocFile(reader.result as string);
        const res = await fetch('/api/ai/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, fileName: file.name, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.success) {
          setDocAnalysis(data.data);
          haptic('success' as any);
        } else {
          setDocAnalysis({ error: data.error || 'Failed to analyze document' });
        }
        setDocLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setDocAnalysis({ error: 'Failed to read file' });
      setDocLoading(false);
    }
  };

  const handleLoadForecast = async () => {
    haptic('medium');
    setForecastLoading(true);
    try {
      const res = await fetch('/api/analytics/forecast?period=monthly&limit=100');
      const data = await res.json();
      if (data.success) {
        setForecastData(data);
        haptic('success' as any);
      }
    } catch { /* silent */ }
    setForecastLoading(false);
  };

  const handleExport = async (type: string, format: string) => {
    haptic('medium');
    setExporting(`${type}-${format}`);
    try {
      const params = new URLSearchParams({ type, period: 'all' });
      if (format === 'csv') {
        const res = await fetch(`/api/export/excel?${params}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.open(`/api/export/pdf?${params}`, '_blank');
      }
      haptic('success' as any);
    } catch { /* silent */ }
    setExporting(null);
  };

  const handleSendEmail = async () => {
    if (!emailForm.to || !emailForm.subject) return;
    haptic('medium');
    setEmailSending(true);
    setEmailSent(false);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Compose a professional email:\nTo: ${emailForm.to}\nSubject: ${emailForm.subject}\nBody: ${emailForm.body}\n\nPlease draft a polished version of this email.`,
          chatId: 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
        haptic('success' as any);
      }
    } catch { /* silent */ }
    setEmailSending(false);
  };

  // ─── Search logic ─────────────────────────────────────────────────────────
  const searchResults = (() => {
    if (!searchQuery.trim() || !botData) return { reports: [], notes: [], tasks: [], contacts: [], knowledge: [] };
    const q = searchQuery.toLowerCase();

    const reports = (reportsData?.filtered || [])
      .filter((r: ReportItem) =>
        r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map((r: ReportItem) => ({ id: r.id, type: 'report' as const, title: r.title, detail: r.content, date: r.date, sub: r.type }));

    const notes = (botData.notes || [])
      .filter((n: NoteItem) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 10)
      .map((n: NoteItem) => ({ id: n.id, type: 'note' as const, title: n.title, detail: n.content, date: n.createdAt || '', sub: n.category || 'Note' }));

    const tasks = (botData.tasks?.list || [])
      .filter((t: TaskItem) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
      .slice(0, 10)
      .map((t: TaskItem) => ({ id: t.id, type: 'task' as const, title: t.title, detail: t.description || '', date: t.dueDate || t.createdAt || '', sub: t.status }));

    const contacts = (botData.contacts?.list || [])
      .filter((c: ContactItem) => c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
      .slice(0, 10)
      .map((c: ContactItem) => ({ id: c.id, type: 'contact' as const, title: c.name, detail: `${c.company || ''} ${c.email || ''} ${c.phone || ''}`.trim(), date: '', sub: c.type || 'Contact' }));

    const knowledge = (botData.knowledgeBase || [])
      .filter((k: KnowledgeItem) => k.topic.toLowerCase().includes(q) || k.content.toLowerCase().includes(q))
      .slice(0, 10)
      .map((k: KnowledgeItem) => ({ id: k.id, type: 'knowledge' as const, title: k.topic, detail: k.content, date: k.createdAt || '', sub: k.source || 'Knowledge' }));

    return { reports, notes, tasks, contacts, knowledge };
  })();

  const totalSearchResults = searchResults.reports.length + searchResults.notes.length + searchResults.tasks.length + searchResults.contacts.length + searchResults.knowledge.length;

  // Category data extraction
  const getCategoryData = (cat: CategoryDef) => {
    if (!botData) return null;
    switch (cat.id) {
      case 'romel':
        return {
          items: (botData.sales?.reports || []).slice(0, 20),
          totalCount: botData.summary.totalRomelReports,
          label: 'Sales Reports',
          emptyCmd: '/log',
          emptyText: 'Log a sales activity to see reports here',
        };
      case 'college':
        return {
          items: (botData.vdReports || []).slice(0, 20),
          totalCount: botData.summary.totalVdReports,
          label: 'Vice Dean Reports',
          emptyCmd: '/vicereport',
          emptyText: 'Create a VC report to see data here',
        };
      case 'jobs':
        return {
          items: ((botData.rawSyncData?.applications as unknown[]) || []).slice(0, 20),
          totalCount: ((botData.rawSyncData?.applications as unknown[]) || []).length,
          label: 'Applications',
          emptyCmd: '/apply',
          emptyText: 'Apply for a job to see applications here',
        };
      case 'data':
        return {
          items: (botData.notes || []).slice(0, 20),
          totalCount: botData.summary.totalNotes,
          label: 'Notes',
          emptyCmd: '/note',
          emptyText: 'Create a note to see data here',
        };
      case 'learning':
        return {
          items: (botData.tasks?.list || []).slice(0, 20),
          totalCount: botData.summary.totalTasks,
          label: 'Learning Tasks',
          emptyCmd: '/tasks',
          emptyText: 'Add tasks to see them here',
        };
      case 'crm':
        return {
          items: (botData.contacts?.list || []).slice(0, 20),
          totalCount: botData.summary.totalContacts,
          label: 'Contacts',
          emptyCmd: '/contacts',
          emptyText: 'Add contacts to see them here',
        };
      case 'ai':
        return {
          items: (botData.knowledgeBase || []).slice(0, 20),
          totalCount: botData.summary.totalKnowledge,
          label: 'Knowledge Base',
          emptyCmd: '/teach',
          emptyText: 'Teach the AI to build your knowledge base',
        };
      case 'reports':
        return {
          items: (reportsData?.filtered || []).slice(0, 20),
          totalCount: reportsData?.total || 0,
          label: 'All Reports',
          emptyCmd: '/weekreport',
          emptyText: 'Generate a report to see data here',
        };
      default:
        return null;
    }
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────

  const t = theme;
  const user = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;
  const firstName = user?.first_name || 'Hambisa';
  const username = user?.username || '';

  // ─── Loading State ───────────────────────────────────────────────────────

  if (loading && !botData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: t.bg, paddingTop: t.safeTop }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium" style={{ color: t.text }}>Career AI Ethiopia</p>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: t.textSecondary }} />
              <p className="text-xs" style={{ color: t.textSecondary }}>Loading your data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────

  if (error && !botData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: t.bg, paddingTop: t.safeTop }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-sm font-medium" style={{ color: t.text }}>Failed to load</p>
          <p className="text-xs" style={{ color: t.textSecondary }}>{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Category Detail Page ────────────────────────────────────────────────

  const renderCategoryDetail = () => {
    if (!selectedCategory) return null;
    const cat = selectedCategory;
    const catData = getCategoryData(cat);

    return (
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors active:scale-95"
            style={{ backgroundColor: t.bgCard }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: t.text }} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{cat.emoji}</span>
            <div>
              <h1 className="text-lg font-bold" style={{ color: t.text }}>{cat.name}</h1>
              <p className="text-xs" style={{ color: t.textSecondary }}>{cat.commands.length} commands</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
            Commands
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {cat.commands.map((cmd) => (
              <button
                key={cmd.cmd}
                onClick={() => openFormForCommand(cmd.cmd)}
                className={`p-3.5 rounded-xl text-left transition-all active:scale-[0.97] border ${cat.bgColor} ${cat.borderColor}`}
              >
                <p className={`text-sm font-semibold ${cat.textColor}`}>{cmd.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textSecondary }}>
                  {cmd.cmd}
                </p>
                <p className="text-[10px] mt-1 leading-tight" style={{ color: t.textMuted }}>
                  {cmd.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Data View */}
        {catData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
                {catData.label}
              </h2>
              {catData.totalCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.bgCard, color: t.textSecondary }}>
                  {catData.totalCount}
                </span>
              )}
            </div>

            {catData.items.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {catData.items.map((item: Record<string, unknown>, idx: number) => {
                  const title = (item.title as string) || (item.topic as string) || (item.name as string) || `Item ${idx + 1}`;
                  const detail = (item.content as string) || (item.report as string) || (item.details as string) || (item.description as string) || '';
                  const date = (item.date as string) || (item.createdAt as string) || '';
                  const status = (item.status as string) || (item.priority as string) || '';
                  const type = (item.type as string) || '';

                  return (
                    <div
                      key={(item.id as string) || idx}
                      className="p-3 rounded-xl transition-colors"
                      style={{ backgroundColor: t.bgCard }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug" style={{ color: t.text }}>
                          {truncate(title, 60)}
                        </p>
                        {status && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400">
                            {status}
                          </span>
                        )}
                      </div>
                      {detail && (
                        <p className="text-[11px] mt-1 leading-relaxed" style={{ color: t.textSecondary }}>
                          {truncate(detail, 120)}
                        </p>
                      )}
                      {(date || type) && (
                        <div className="flex items-center gap-2 mt-1.5">
                          {type && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.bg, color: t.textMuted }}>
                              {type}
                            </span>
                          )}
                          {date && (
                            <span className="text-[10px]" style={{ color: t.textMuted }}>
                              {date}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                <div className={`w-12 h-12 rounded-xl ${cat.bgColor} flex items-center justify-center`}>
                  <Database className={`w-6 h-6 ${cat.textColor}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: t.text }}>No data yet</p>
                  <p className="text-xs mt-1" style={{ color: t.textSecondary }}>
                    Use {catData.emptyCmd} in Telegram to {catData.emptyText.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={() => openFormForCommand(catData.emptyCmd)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium ${cat.bgColor} ${cat.textColor} border ${cat.borderColor} active:scale-95 transition-transform`}
                >
                  {catData.emptyCmd}
                </button>
              </div>
            )}
          </div>
        )}

        {!catData && (
          <div className="flex flex-col items-center gap-3 py-8 rounded-xl" style={{ backgroundColor: t.bgCard }}>
            <div className={`w-12 h-12 rounded-xl ${cat.bgColor} flex items-center justify-center`}>
              <Zap className={`w-6 h-6 ${cat.textColor}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: t.text }}>Interactive Commands</p>
              <p className="text-xs mt-1" style={{ color: t.textSecondary }}>
                Tap any command above to use it in Telegram
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Home Tab ────────────────────────────────────────────────────────────

  const renderHome = () => {
    const s = botData?.summary;
    return (
      <div className="flex flex-col gap-5 pb-4">
        {/* Welcome Card */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-base font-bold">Welcome back, {firstName}! 👋</p>
            </div>
            <p className="text-xs text-emerald-100/80">
              Career AI Ethiopia — Your executive assistant
            </p>
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <p className="text-[10px] text-emerald-200/70">
                {s?.lastSync ? `Synced ${timeAgo(s.lastSync)}` : 'Ready'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Overview</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Reports', value: (s?.totalRomelReports || 0) + (s?.totalVdReports || 0), icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/15' },
              { label: 'Tasks', value: s?.totalTasks || 0, icon: CheckSquare, color: 'text-amber-400', bg: 'bg-amber-500/15', sub: s ? `${s.taskCompletionRate}% done` : '' },
              { label: 'Contacts', value: s?.totalContacts || 0, icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/15' },
              { label: 'Knowledge', value: s?.totalKnowledge || 0, icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/15' },
            ].map((stat) => (
              <div key={stat.label} className="p-3.5 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold" style={{ color: t.text }}>{stat.value}</span>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-[11px] mt-1" style={{ color: t.textSecondary }}>{stat.label}</p>
                {stat.sub && <p className="text-[10px]" style={{ color: t.textMuted }}>{stat.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.cmd}
                onClick={() => openFormForCommand(action.cmd)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95"
                style={{ backgroundColor: t.bgCard }}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-medium leading-tight text-center" style={{ color: t.textSecondary }}>
                  {action.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Recent Activity</h2>
          {botData?.recentActivities && botData.recentActivities.length > 0 ? (
            <div className="flex flex-col gap-2">
              {botData.recentActivities.slice(0, 5).map((act: ActivityItem) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: t.bgCard }}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: t.text }}>
                      {truncate(act.action, 70)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
                      {timeAgo(act.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: t.bgCard }}>
              <p className="text-xs" style={{ color: t.textSecondary }}>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Categories Tab ──────────────────────────────────────────────────────

  const renderCategories = () => (
    <div className="flex flex-col gap-4 pb-4">
      <div>
        <h1 className="text-lg font-bold" style={{ color: t.text }}>All Categories</h1>
        <p className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
          17 categories · 60+ commands
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {CATEGORIES.map((cat) => {
          const itemCount = getItemCount(cat);
          return (
            <button
              key={cat.id}
              onClick={() => goToCategory(cat)}
              className={`p-4 rounded-xl text-left transition-all active:scale-[0.97] border ${cat.bgColor} ${cat.borderColor}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{cat.emoji}</span>
                {itemCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.bg, color: t.textSecondary }}>
                    {itemCount}
                  </span>
                )}
              </div>
              <p className={`text-sm font-semibold mt-2 ${cat.textColor}`}>{cat.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: t.textSecondary }}>
                {cat.commands.length} commands
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Count items for a category
  function getItemCount(cat: CategoryDef): number {
    if (!botData) return 0;
    switch (cat.id) {
      case 'romel': return botData.summary.totalRomelReports;
      case 'college': return botData.summary.totalVdReports;
      case 'data': return botData.summary.totalNotes;
      case 'learning': return botData.summary.totalTasks;
      case 'crm': return botData.summary.totalContacts;
      case 'ai': return botData.summary.totalKnowledge;
      case 'reports': return reportsData?.total || 0;
      default: return 0;
    }
  }

  // ─── Search Tab ──────────────────────────────────────────────────────────

  const renderSearch = () => {
    const resultGroups = [
      { key: 'reports', label: 'Reports', icon: FileText, color: 'text-teal-400', items: searchResults.reports },
      { key: 'notes', label: 'Notes', icon: StickyNote, color: 'text-slate-400', items: searchResults.notes },
      { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-amber-400', items: searchResults.tasks },
      { key: 'contacts', label: 'Contacts', icon: Users, color: 'text-rose-400', items: searchResults.contacts },
      { key: 'knowledge', label: 'Knowledge', icon: Brain, color: 'text-violet-400', items: searchResults.knowledge },
    ].filter(g => g.items.length > 0);

    return (
      <div className="flex flex-col gap-4 pb-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { haptic('light'); setSearchQuery(e.target.value); setExpandedSearchItem(null); }}
            placeholder="Search reports, notes, tasks..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-colors"
            style={{
              backgroundColor: t.bgCard,
              color: t.text,
              border: `1px solid ${t.border}`,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { haptic('light'); setSearchQuery(''); setExpandedSearchItem(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded-md"
              style={{ backgroundColor: t.bg, color: t.textSecondary }}
            >
              Clear
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            {totalSearchResults} result{totalSearchResults !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Results */}
        {searchQuery.trim() ? (
          resultGroups.length > 0 ? (
            <div className="flex flex-col gap-4">
              {resultGroups.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <group.icon className={`w-3.5 h-3.5 ${group.color}`} />
                    <h3 className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                      {group.label}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.bgCard, color: t.textMuted }}>
                      {group.items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.items.map((item) => {
                      const isExpanded = expandedSearchItem === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { haptic('light'); setExpandedSearchItem(isExpanded ? null : item.id); }}
                          className="p-3 rounded-xl text-left transition-colors w-full"
                          style={{ backgroundColor: t.bgCard }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug" style={{ color: t.text }}>
                              {truncate(item.title, 50)}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.bg, color: t.textMuted }}>
                                {item.sub}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" style={{ color: t.textMuted }} />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" style={{ color: t.textMuted }} />
                              )}
                            </div>
                          </div>
                          {item.date && (
                            <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>{item.date}</p>
                          )}
                          {isExpanded && item.detail && (
                            <p className="text-xs mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: t.textSecondary }}>
                              {truncate(item.detail, 500)}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: t.bgCard }}>
                <Search className="w-6 h-6" style={{ color: t.textMuted }} />
              </div>
              <p className="text-sm font-medium" style={{ color: t.text }}>No results found</p>
              <p className="text-xs text-center max-w-[200px]" style={{ color: t.textSecondary }}>
                Try different keywords or use commands in Telegram to add data
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: t.bgCard }}>
              <Search className="w-6 h-6" style={{ color: t.textMuted }} />
            </div>
            <p className="text-sm font-medium" style={{ color: t.text }}>Search everything</p>
            <p className="text-xs text-center max-w-[200px]" style={{ color: t.textSecondary }}>
              Find reports, notes, tasks, contacts, and knowledge
            </p>
          </div>
        )}
      </div>
    );
  };

  // ─── Profile Tab ─────────────────────────────────────────────────────────

  const renderProfile = () => {
    const s = botData?.summary;
    return (
      <div className="flex flex-col gap-5 pb-4">
        {/* User Card */}
        <div className="p-5 rounded-2xl flex items-center gap-4" style={{ backgroundColor: t.bgCard }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold" style={{ color: t.text }}>{firstName}</p>
            {username && (
              <p className="text-xs" style={{ color: t.textSecondary }}>@{username}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-[10px]" style={{ color: t.textMuted }}>Online</p>
            </div>
          </div>
        </div>

        {/* Bot Info */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: t.text }}>@hambi_career_ai_bot</p>
              <p className="text-[11px]" style={{ color: t.textSecondary }}>Career AI Ethiopia</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Statistics</h2>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Total Reports', value: (s?.totalRomelReports || 0) + (s?.totalVdReports || 0), icon: BarChart3 },
              { label: 'Tasks Completed', value: s?.tasksDone || 0, icon: CheckCircle2 },
              { label: 'Completion Rate', value: `${s?.taskCompletionRate || 0}%`, icon: TrendingUp },
              { label: 'Total Notes', value: s?.totalNotes || 0, icon: StickyNote },
              { label: 'Contacts', value: s?.totalContacts || 0, icon: Users },
              { label: 'Knowledge Base', value: s?.totalKnowledge || 0, icon: Brain },
              { label: 'Data Syncs', value: s?.totalSyncs || 0, icon: RefreshCw },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{ backgroundColor: t.bgCard }}
              >
                <div className="flex items-center gap-3">
                  <stat.icon className="w-4 h-4" style={{ color: t.textSecondary }} />
                  <span className="text-sm" style={{ color: t.text }}>{stat.label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: t.text }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>About</h2>
          <p className="text-xs leading-relaxed" style={{ color: t.textSecondary }}>
            Career AI Ethiopia is your executive assistant bot for managing sales, college operations, 
            job applications, tasks, notes, contacts, and more. Use commands in Telegram to interact 
            with your data, or browse through this dashboard.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Sales', 'College', 'Jobs', 'Tasks', 'Notes', 'CRM', 'AI'].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: t.bg, color: t.textMuted }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Version & Features */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Available Features</h2>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Receipt Scanner', desc: 'AI reads receipts → auto expense', icon: Camera, color: 'text-orange-400' },
              { label: 'Document AI', desc: 'Upload docs → AI summary', icon: FileSearch, color: 'text-violet-400' },
              { label: 'Predictive Analytics', desc: 'AI forecasts cash flow', icon: LineChart, color: 'text-emerald-400' },
              { label: 'Email AI', desc: 'AI-assisted emails', icon: MailOpen, color: 'text-pink-400' },
              { label: 'Export Reports', desc: 'CSV & PDF downloads', icon: DownloadCloud, color: 'text-cyan-400' },
              { label: 'Role Management', desc: 'Multi-user permissions', icon: Shield, color: 'text-amber-400' },
              { label: 'API Access', desc: 'REST API for integrations', icon: KeyRound, color: 'text-teal-400' },
            ].map((feat) => (
              <div key={feat.label} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: t.bg }}>
                <feat.icon className={`w-4 h-4 ${feat.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: t.text }}>{feat.label}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>{feat.desc}</p>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Role Management */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: t.text }}>Role & Permissions</p>
              <p className="text-[10px]" style={{ color: t.textSecondary }}>Manage access levels</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { role: 'Admin', desc: 'Full access to all features', active: true },
              { role: 'Manager', desc: 'Business & finance access', active: false },
              { role: 'Viewer', desc: 'Read-only access', active: false },
            ].map((r) => (
              <div key={r.role} className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: t.bg }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: t.text }}>{r.role}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>{r.desc}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${r.active ? 'bg-emerald-400' : 'bg-gray-500/30'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Version */}
        <div className="text-center py-2">
          <p className="text-[10px]" style={{ color: t.textMuted }}>Mini App v3 · Career AI Ethiopia · 7 AI Features</p>
        </div>
      </div>
    );
  };

  // ─── Finance Tab ─────────────────────────────────────────────────────────

  const renderFinance = () => {
    const txns = (financeData?.transactions || []) as Array<{
      id: string; type: string; amount: number; category?: string;
      description?: string; date?: string; currency?: string;
    }>;
    const summary = financeData?.summary || {};

    const totalIncome = summary.totalIncome ?? txns.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = summary.totalExpenses ?? txns.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    const summaryCards = [
      { label: 'Total Income', value: `${totalIncome.toLocaleString()} ETB`, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
      { label: 'Total Expenses', value: `${totalExpenses.toLocaleString()} ETB`, color: 'text-red-400', bg: 'bg-red-500/15' },
      { label: 'Net Profit', value: `${netProfit.toLocaleString()} ETB`, color: netProfit >= 0 ? 'text-emerald-400' : 'text-red-400', bg: netProfit >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15' },
      { label: 'Transactions', value: String(txns.length), color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
    ];

    return (
      <div className="flex flex-col gap-5 pb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: t.text }}>Finance</h1>
          <p className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
            Track your income & expenses
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {summaryCards.map((card) => (
            <div key={card.label} className={`p-3.5 rounded-xl ${card.bg}`}>
              <p className="text-[11px]" style={{ color: t.textSecondary }}>{card.label}</p>
              <p className={`text-lg font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Transaction List */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
            Recent Transactions
          </h2>
          {txns.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {txns.map((txn) => {
                const isIncome = txn.type === 'income';
                return (
                  <div
                    key={txn.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: t.bgCard }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      {isIncome
                        ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        : <ArrowDownRight className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: t.text }}>
                          {txn.description || (isIncome ? 'Income' : 'Expense')}
                        </p>
                        {txn.category && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-slate-500/15 text-slate-400">
                            {txn.category}
                          </span>
                        )}
                      </div>
                      {txn.date && (
                        <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>{txn.date}</p>
                      )}
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isIncome ? '+' : '-'}{txn.amount?.toLocaleString()} {txn.currency || 'ETB'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 rounded-xl" style={{ backgroundColor: t.bgCard }}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium" style={{ color: t.text }}>No transactions yet</p>
              <p className="text-xs text-center max-w-[200px]" style={{ color: t.textSecondary }}>
                Use /income or /expense in Telegram to track your finances
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => openForm('income')}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">Income</span>
          </button>
          <button
            onClick={() => openForm('expense')}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">Expense</span>
          </button>
          <button
            onClick={() => handleExport('finance', 'csv')}
            disabled={!!exporting}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 active:scale-95 transition-transform disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span className="text-xs font-medium">{exporting === 'finance-csv' ? '...' : 'Export'}</span>
          </button>
        </div>
      </div>
    );
  };

  // ─── Calendar Tab ────────────────────────────────────────────────────────

  const renderCalendar = () => {
    const events = (calendarData?.events || []) as Array<{
      id: string; title: string; date?: string; time?: string;
      type?: string; priority?: string; description?: string;
    }>;

    const todayEvents = selectedDate
      ? events.filter((e) => e.date === selectedDate)
      : events;

    const typeColors: Record<string, { bg: string; text: string }> = {
      event: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
      meeting: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
      reminder: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
      deadline: { bg: 'bg-red-500/15', text: 'text-red-400' },
    };

    const priorityColors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-amber-500',
      low: 'bg-green-500',
    };

    const navigateDate = (direction: number) => {
      haptic('light');
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + direction);
      setSelectedDate(d.toISOString().split('T')[0]);
    };

    const goToday = () => {
      haptic('light');
      setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const formatDateDisplay = (dateStr: string) => {
      try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div className="flex flex-col gap-5 pb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: t.text }}>Calendar</h1>
          <p className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
            Manage your events & reminders
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: t.bgCard }}>
          <button onClick={() => navigateDate(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-95" style={{ backgroundColor: t.bg }}>
            <ChevronLeft className="w-4 h-4" style={{ color: t.text }} />
          </button>
          <button onClick={goToday} className="flex flex-col items-center">
            <span className="text-sm font-semibold" style={{ color: t.text }}>{formatDateDisplay(selectedDate)}</span>
            {selectedDate === todayStr && (
              <span className="text-[10px] text-emerald-400 font-medium">Today</span>
            )}
          </button>
          <button onClick={() => navigateDate(1)} className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-95" style={{ backgroundColor: t.bg }}>
            <ChevronRight className="w-4 h-4" style={{ color: t.text }} />
          </button>
        </div>

        {/* Today's Events */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
            Events for {selectedDate === todayStr ? 'Today' : 'Selected Date'}
          </h2>
          {todayEvents.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {todayEvents.map((evt) => {
                const tc = typeColors[evt.type || ''] || typeColors.event;
                const pc = priorityColors[evt.priority || ''];
                return (
                  <div
                    key={evt.id}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: t.bgCard }}
                  >
                    <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                      {pc && <div className={`w-2 h-2 rounded-full ${pc}`} />}
                      {evt.time && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-500/15 text-slate-400 font-medium whitespace-nowrap">
                          {evt.time}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: t.text }}>
                        {evt.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {evt.type && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tc.bg} ${tc.text}`}>
                            {evt.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 rounded-xl" style={{ backgroundColor: t.bgCard }}>
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-sm font-medium" style={{ color: t.text }}>No events</p>
              <p className="text-xs text-center max-w-[200px]" style={{ color: t.textSecondary }}>
                Use /event or /remind in Telegram to add events
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => openForm('event')}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">Event</span>
          </button>
          <button
            onClick={() => openForm('reminder')}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">Reminder</span>
          </button>
          <button
            onClick={() => handleExport('calendar', 'csv')}
            disabled={!!exporting}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 active:scale-95 transition-transform disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span className="text-xs font-medium">{exporting === 'calendar-csv' ? '...' : 'Export'}</span>
          </button>
        </div>
      </div>
    );
  };

  // ─── AI Tools Tab ─────────────────────────────────────────────────────────

  const renderAI = () => {
    const inputStyle: React.CSSProperties = {
      backgroundColor: t.bg,
      color: t.text,
      border: `1px solid ${t.border}`,
    };

    // AI Menu
    if (aiView === 'menu') {
      return (
        <div className="flex flex-col gap-5 pb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: t.text }}>AI Tools</h1>
            <p className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
              Smart features powered by AI
            </p>
          </div>

          {/* AI Feature Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Receipt Scanner */}
            <button
              onClick={() => { haptic('medium'); setAiView('receipt'); }}
              className="p-4 rounded-xl text-left transition-all active:scale-[0.97] border bg-orange-500/10 border-orange-500/20"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center mb-3">
                <Camera className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-sm font-semibold text-orange-400">Scan Receipt</p>
              <p className="text-[10px] mt-1 leading-tight" style={{ color: t.textSecondary }}>
                Photo → auto expense
              </p>
            </button>

            {/* Document AI */}
            <button
              onClick={() => { haptic('medium'); setAiView('document'); }}
              className="p-4 rounded-xl text-left transition-all active:scale-[0.97] border bg-violet-500/10 border-violet-500/20"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-3">
                <FileSearch className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-violet-400">Document AI</p>
              <p className="text-[10px] mt-1 leading-tight" style={{ color: t.textSecondary }}>
                Upload → AI summary
              </p>
            </button>

            {/* Predictive Analytics */}
            <button
              onClick={() => { haptic('medium'); setAiView('analytics'); handleLoadForecast(); }}
              className="p-4 rounded-xl text-left transition-all active:scale-[0.97] border bg-emerald-500/10 border-emerald-500/20"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                <LineChart className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-400">Analytics</p>
              <p className="text-[10px] mt-1 leading-tight" style={{ color: t.textSecondary }}>
                AI forecasts & trends
              </p>
            </button>

            {/* Email Assistant */}
            <button
              onClick={() => { haptic('medium'); setAiView('email'); }}
              className="p-4 rounded-xl text-left transition-all active:scale-[0.97] border bg-pink-500/10 border-pink-500/20"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center mb-3">
                <MailOpen className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-sm font-semibold text-pink-400">Email AI</p>
              <p className="text-[10px] mt-1 leading-tight" style={{ color: t.textSecondary }}>
                AI email assistant
              </p>
            </button>
          </div>

          {/* Export Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
              Export Reports
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Finance CSV', type: 'finance', format: 'csv' as const },
                { label: 'Finance PDF', type: 'finance', format: 'pdf' as const },
                { label: 'Calendar CSV', type: 'calendar', format: 'csv' as const },
              ].map((exp) => (
                <button
                  key={`${exp.type}-${exp.format}`}
                  onClick={() => handleExport(exp.type, exp.format)}
                  disabled={!!exporting}
                  className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 active:scale-95 transition-transform disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{exp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Access */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: t.text }}>API Access</p>
                <p className="text-[10px]" style={{ color: t.textSecondary }}>Connect external apps</p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: t.textSecondary }}>
              Use the REST API to integrate Career AI with your tools. Available endpoints: /api/finance, /api/calendar, /api/businesses, /api/documents, /api/analytics/forecast
            </p>
            <div className="mt-2 p-2.5 rounded-lg text-[10px] font-mono" style={{ backgroundColor: t.bg, color: t.textMuted }}>
              GET /api/finance?period=monthly<br />
              POST /api/finance {'{'}"type":"income"{'}'}<br />
              GET /api/analytics/forecast
            </div>
          </div>
        </div>
      );
    }

    // Receipt Scanner View
    if (aiView === 'receipt') {
      return (
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAiView('menu')} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ backgroundColor: t.bgCard }}>
              <ChevronLeft className="w-5 h-5" style={{ color: t.text }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: t.text }}>📷 Scan Receipt</h1>
              <p className="text-xs" style={{ color: t.textSecondary }}>Take a photo of your receipt</p>
            </div>
          </div>

          {/* Upload Area */}
          {!receiptImage && !receiptLoading && (
            <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors" style={{ borderColor: t.border, backgroundColor: t.bgCard }}>
              <div className="w-16 h-16 rounded-2xl bg-orange-500/15 flex items-center justify-center">
                <Camera className="w-8 h-8 text-orange-400" />
              </div>
              <p className="text-sm font-medium" style={{ color: t.text }}>Tap to upload receipt</p>
              <p className="text-[10px]" style={{ color: t.textSecondary }}>Supports JPG, PNG, WEBP</p>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleReceiptScan(e.target.files[0])} />
            </label>
          )}

          {/* Loading */}
          {receiptLoading && !receiptAnalysis && (
            <div className="flex flex-col items-center gap-3 py-12 rounded-xl" style={{ backgroundColor: t.bgCard }}>
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              <p className="text-sm" style={{ color: t.textSecondary }}>Analyzing receipt with AI...</p>
            </div>
          )}

          {/* Image Preview */}
          {receiptImage && receiptAnalysis && (
            <div className="flex flex-col gap-3">
              {receiptImage && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: t.bgCard }}>
                  <img src={receiptImage} alt="Receipt" className="w-full h-48 object-cover" />
                </div>
              )}

              {/* Analysis Results */}
              {receiptAnalysis.error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{receiptAnalysis.error}</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: t.bgCard }}>
                  <h3 className="text-sm font-semibold" style={{ color: t.text }}>Extracted Data</h3>
                  {receiptAnalysis.merchantName && (
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: t.textSecondary }}>Merchant</span>
                      <span className="text-xs font-medium" style={{ color: t.text }}>{receiptAnalysis.merchantName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: t.textSecondary }}>Amount</span>
                    <span className="text-sm font-bold text-orange-400">{receiptAnalysis.amount || receiptAnalysis.subtotal || 'N/A'} {receiptAnalysis.currency || 'ETB'}</span>
                  </div>
                  {receiptAnalysis.category && (
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: t.textSecondary }}>Category</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">{receiptAnalysis.category}</span>
                    </div>
                  )}
                  {receiptAnalysis.date && (
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: t.textSecondary }}>Date</span>
                      <span className="text-xs font-medium" style={{ color: t.text }}>{receiptAnalysis.date}</span>
                    </div>
                  )}
                  {receiptAnalysis.items && receiptAnalysis.items.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: t.textSecondary }}>Items</p>
                      <div className="flex flex-col gap-1">
                        {receiptAnalysis.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span style={{ color: t.text }}>{item.name || item.description}</span>
                            <span style={{ color: t.textMuted }}>{item.price || item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleReceiptConfirm}
                    disabled={receiptLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-orange-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {receiptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save as Expense</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => { setReceiptImage(null); setReceiptAnalysis(null); }}
                className="w-full py-2.5 rounded-xl text-xs font-medium border active:scale-95 transition-transform"
                style={{ borderColor: t.border, color: t.textSecondary }}
              >
                Scan Another Receipt
              </button>
            </div>
          )}
        </div>
      );
    }

    // Document AI View
    if (aiView === 'document') {
      return (
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAiView('menu')} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ backgroundColor: t.bgCard }}>
              <ChevronLeft className="w-5 h-5" style={{ color: t.text }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: t.text }}>📄 Document AI</h1>
              <p className="text-xs" style={{ color: t.textSecondary }}>Upload & analyze with AI</p>
            </div>
          </div>

          {!docFile && !docLoading && (
            <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors" style={{ borderColor: t.border, backgroundColor: t.bgCard }}>
              <div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center">
                <FileUp className="w-8 h-8 text-violet-400" />
              </div>
              <p className="text-sm font-medium" style={{ color: t.text }}>Tap to upload document</p>
              <p className="text-[10px]" style={{ color: t.textSecondary }}>Supports PDF, Image, DOCX</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0])} />
            </label>
          )}

          {docLoading && !docAnalysis && (
            <div className="flex flex-col items-center gap-3 py-12 rounded-xl" style={{ backgroundColor: t.bgCard }}>
              <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
              <p className="text-sm" style={{ color: t.textSecondary }}>Analyzing document with AI...</p>
            </div>
          )}

          {docAnalysis && (
            <div className="flex flex-col gap-3">
              {docAnalysis.error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{docAnalysis.error}</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: t.bgCard }}>
                  {docAnalysis.documentType && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">{docAnalysis.documentType}</span>
                      {docAnalysis.language && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: t.bg, color: t.textMuted }}>{docAnalysis.language}</span>
                      )}
                    </div>
                  )}

                  {docAnalysis.summary && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: t.text }}>Summary</p>
                      <p className="text-xs leading-relaxed" style={{ color: t.textSecondary }}>{docAnalysis.summary}</p>
                    </div>
                  )}

                  {docAnalysis.keyPoints && docAnalysis.keyPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: t.text }}>Key Points</p>
                      <div className="flex flex-col gap-1">
                        {docAnalysis.keyPoints.map((point: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                            <p className="text-[11px] leading-relaxed" style={{ color: t.textSecondary }}>{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {docAnalysis.keywords && docAnalysis.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {docAnalysis.keywords.map((kw: string, i: number) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: t.bg, color: t.textMuted }}>{kw}</span>
                      ))}
                    </div>
                  )}

                  {docAnalysis.sentiment && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: t.textSecondary }}>Sentiment:</span>
                      <span className={`text-xs font-medium ${docAnalysis.sentiment === 'positive' ? 'text-emerald-400' : docAnalysis.sentiment === 'negative' ? 'text-red-400' : 'text-amber-400'}`}>
                        {docAnalysis.sentiment}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => { setDocFile(null); setDocAnalysis(null); }}
                className="w-full py-2.5 rounded-xl text-xs font-medium border active:scale-95 transition-transform"
                style={{ borderColor: t.border, color: t.textSecondary }}
              >
                Analyze Another Document
              </button>
            </div>
          )}
        </div>
      );
    }

    // Analytics View
    if (aiView === 'analytics') {
      const fc = forecastData?.forecast;
      const fs = forecastData?.stats;

      return (
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAiView('menu')} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ backgroundColor: t.bgCard }}>
              <ChevronLeft className="w-5 h-5" style={{ color: t.text }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: t.text }}>📊 Predictive Analytics</h1>
              <p className="text-xs" style={{ color: t.textSecondary }}>AI-powered financial forecasts</p>
            </div>
          </div>

          {forecastLoading && !forecastData ? (
            <div className="flex flex-col items-center gap-3 py-12 rounded-xl" style={{ backgroundColor: t.bgCard }}>
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm" style={{ color: t.textSecondary }}>Generating AI forecast...</p>
            </div>
          ) : forecastData && fc ? (
            <div className="flex flex-col gap-3">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-400">AI Assessment</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: t.text }}>{fc.summary || 'No analysis available'}</p>
              </div>

              {/* Next Month Prediction */}
              {fc.nextMonthPrediction && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: t.text }}>Next Month Forecast</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                      <p className="text-[10px]" style={{ color: t.textSecondary }}>Income</p>
                      <p className="text-sm font-bold text-emerald-400">{(fc.nextMonthPrediction.income || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 text-center">
                      <p className="text-[10px]" style={{ color: t.textSecondary }}>Expense</p>
                      <p className="text-sm font-bold text-red-400">{(fc.nextMonthPrediction.expense || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-500/10 text-center">
                      <p className="text-[10px]" style={{ color: t.textSecondary }}>Net</p>
                      <p className={`text-sm font-bold ${(fc.nextMonthPrediction.net || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(fc.nextMonthPrediction.net || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trends */}
              {fc.trends && fc.trends.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: t.text }}>📈 Trends</p>
                  <div className="flex flex-col gap-1.5">
                    {fc.trends.map((trend: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed" style={{ color: t.textSecondary }}>{trend}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {fc.insights && fc.insights.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: t.text }}>💡 Insights</p>
                  <div className="flex flex-col gap-1.5">
                    {fc.insights.map((insight: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed" style={{ color: t.textSecondary }}>{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {fc.recommendations && fc.recommendations.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: t.text }}>🎯 Recommendations</p>
                  <div className="flex flex-col gap-1.5">
                    {fc.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed" style={{ color: t.textSecondary }}>{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Alerts */}
              {fc.riskAlerts && fc.riskAlerts.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-semibold mb-2 text-red-400">⚠️ Risk Alerts</p>
                  <div className="flex flex-col gap-1.5">
                    {fc.riskAlerts.map((alert: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed text-red-300">{alert}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Summary */}
              {fs && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: t.bgCard }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: t.text }}>📊 Period Stats</p>
                  <div className="flex flex-col gap-1">
                    {[
                      { label: 'Transactions Analyzed', value: fs.totalTransactions },
                      { label: 'Total Income', value: `${(fs.totalIncome || 0).toLocaleString()} ETB` },
                      { label: 'Total Expenses', value: `${(fs.totalExpense || 0).toLocaleString()} ETB` },
                      { label: 'Period', value: fs.periodAnalyzed || 'N/A' },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between text-[11px]">
                        <span style={{ color: t.textSecondary }}>{s.label}</span>
                        <span className="font-medium" style={{ color: t.text }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleLoadForecast}
                className="w-full py-2.5 rounded-xl text-xs font-medium bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Forecast</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 rounded-xl" style={{ backgroundColor: t.bgCard }}>
              <LineChart className="w-10 h-10" style={{ color: t.textMuted }} />
              <p className="text-sm" style={{ color: t.text }}>No forecast data</p>
              <p className="text-xs text-center max-w-[200px]" style={{ color: t.textSecondary }}>
                Add transactions first, then AI will generate forecasts
              </p>
            </div>
          )}
        </div>
      );
    }

    // Email View
    if (aiView === 'email') {
      return (
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAiView('menu')} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ backgroundColor: t.bgCard }}>
              <ChevronLeft className="w-5 h-5" style={{ color: t.text }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: t.text }}>✉️ Email AI</h1>
              <p className="text-xs" style={{ color: t.textSecondary }}>AI-assisted email composition</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: t.textSecondary }}>To</label>
              <input
                type="email"
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                placeholder="recipient@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: t.textSecondary }}>Subject</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Meeting follow-up"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: t.textSecondary }}>Message (AI will polish this)</label>
              <textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                placeholder="Write your rough message here, AI will help improve it..."
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
              />
            </div>

            {emailSent && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-400">Email drafted! Check your Telegram chat for the result.</p>
              </div>
            )}

            <button
              onClick={handleSendEmail}
              disabled={emailSending || !emailForm.to || !emailForm.subject}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-pink-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>AI Compose & Send</span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Form Modal Render ────────────────────────────────────────────────────

  const renderFormModal = () => {
    if (!formModal.open) return null;

    const inputStyle: React.CSSProperties = {
      backgroundColor: t.bg,
      color: t.text,
      border: `1px solid ${t.border}`,
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeForm}
        />

        {/* Bottom Sheet */}
        <div
          className="relative w-full max-w-lg rounded-t-2xl transition-transform duration-300 ease-out"
          style={{
            backgroundColor: t.bgCard,
            maxHeight: '85vh',
            paddingBottom: t.safeBottom + 16,
            transform: formModal.open ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: t.border }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <h2 className="text-base font-bold" style={{ color: t.text }}>{formModal.title}</h2>
            <button
              onClick={closeForm}
              className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
              style={{ backgroundColor: t.bg }}
            >
              <X className="w-4 h-4" style={{ color: t.textSecondary }} />
            </button>
          </div>

          {/* Error */}
          {formError && (
            <div className="mx-5 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{formError}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 'calc(85vh - 160px)', scrollbarWidth: 'thin' }}>
            <div className="flex flex-col gap-3">
              {formModal.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: t.textSecondary }}>
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={formValues[field.name] || ''}
                      onChange={(e) => { haptic('light'); updateFormValue(field.name, e.target.value); }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none transition-colors"
                      style={inputStyle}
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} style={{ backgroundColor: t.bgCard, color: t.text }}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formValues[field.name] || ''}
                      onChange={(e) => updateFormValue(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors"
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formValues[field.name] || ''}
                      onChange={(e) => updateFormValue(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-5 pt-2 border-t" style={{ borderColor: t.border }}>
            <button
              onClick={submitForm}
              disabled={formLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Tab Bar ─────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'categories', label: 'Categories', icon: LayoutGrid },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'ai', label: 'AI', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: t.bg }}>
      {/* Pull-to-refresh indicator */}
      {pullRefreshing && (
        <div className="flex items-center justify-center py-3" style={{ paddingTop: t.safeTop + 12 }}>
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 mr-2" />
          <span className="text-xs text-emerald-400">Refreshing...</span>
        </div>
      )}

      {/* Content Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4"
        style={{
          paddingTop: t.safeTop + (pullRefreshing ? 0 : 16),
          paddingBottom: 80 + t.safeBottom,
          scrollbarWidth: 'thin',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Error banner (non-blocking) */}
        {error && botData && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button onClick={() => fetchData()} className="text-[10px] font-medium text-red-400 underline shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="transition-opacity duration-200">
          {selectedCategory ? (
            renderCategoryDetail()
          ) : activeTab === 'home' ? (
            renderHome()
          ) : activeTab === 'categories' ? (
            renderCategories()
          ) : activeTab === 'finance' ? (
            renderFinance()
          ) : activeTab === 'calendar' ? (
            renderCalendar()
          ) : activeTab === 'ai' ? (
            renderAI()
          ) : activeTab === 'search' ? (
            renderSearch()
          ) : activeTab === 'profile' ? (
            renderProfile()
          ) : null}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t flex items-center justify-around"
        style={{
          backgroundColor: t.bg,
          borderColor: t.border,
          paddingBottom: t.safeBottom,
          paddingTop: 6,
          paddingLeft: t.safeTop > 0 ? 8 : 0,
          paddingRight: t.safeTop > 0 ? 8 : 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id && !selectedCategory;
          return (
            <button
              key={tab.id}
              onClick={() => { haptic('light'); setActiveTab(tab.id); setSelectedCategory(null); }}
              className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-95"
              style={{ color: isActive ? '#10b981' : t.textMuted }}
            >
              <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Form Modal */}
      {renderFormModal()}

      {/* Success Toast */}
      {formSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl bg-emerald-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-4 h-4" />
          <span>Saved successfully!</span>
        </div>
      )}
    </div>
  );
}