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
  Shield, Info, Activity, PieChart, ListChecks, Award
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

type CategoryId = 'daily' | 'romel' | 'college' | 'tech' | 'jobs' | 'communication' | 'strategy' | 'learning' | 'reports' | 'data' | 'ai' | 'crm' | 'core';

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

type TabId = 'home' | 'categories' | 'search' | 'profile';

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

  // Search logic
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
                onClick={() => showCommandPopup(cmd.cmd)}
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
                  onClick={() => showCommandPopup(catData.emptyCmd)}
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
                onClick={() => showCommandPopup(action.cmd)}
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
          13 categories · 50+ commands
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

        {/* Version */}
        <div className="text-center py-2">
          <p className="text-[10px]" style={{ color: t.textMuted }}>Mini App v2 · Career AI Ethiopia</p>
        </div>
      </div>
    );
  };

  // ─── Tab Bar ─────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'categories', label: 'Categories', icon: LayoutGrid },
    { id: 'search', label: 'Search', icon: Search },
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
              className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all active:scale-95"
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
    </div>
  );
}