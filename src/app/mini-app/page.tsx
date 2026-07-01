'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, FileText, CheckSquare, User, RefreshCw, Search,
  TrendingUp, Briefcase, Users, BookOpen, ChevronDown, ChevronUp,
  Clock, AlertCircle, CheckCircle2, Circle, Loader2,
  BarChart3, Bot, Shield
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

interface Summary {
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
  company?: string;
  type?: string;
  phone?: string;
  email?: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt?: string;
}

interface ReportItem {
  id: string;
  type: string;
  company: string;
  category: string;
  title: string;
  content: string;
  date: string;
  timestamp: string;
  firstName?: string;
}

interface BotDataResponse {
  success: boolean;
  hasData: boolean;
  updatedAt: string | null;
  syncCount: number;
  summary: Summary;
  tasks: {
    list: TaskItem[];
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  };
  notes: NoteItem[];
  contacts: { list: ContactItem[]; breakdown: Record<string, number> };
  knowledgeBase: KnowledgeItem[];
  vdReports: any[];
  recentActivities: any[];
  rawSyncData: {
    profile?: {
      name?: string;
      title?: string;
      company?: string;
      location?: string;
      email?: string;
      phone?: string;
      website?: string;
      bio?: string;
    };
    businesses?: any[];
  };
}

interface ReportsResponse {
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

type TabId = 'home' | 'reports' | 'tasks' | 'profile';

// ─── Theme Helpers ───────────────────────────────────────────────────────────

function getTelegramTheme() {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    return {
      isDark: false,
      bg: '#ffffff',
      text: '#1a1a2e',
      hint: '#8e8e93',
      buttonBg: '#059669',
      buttonText: '#ffffff',
      cardBg: '#f9fafb',
      borderColor: '#e5e7eb',
      safeTop: 0,
      safeBottom: 0,
    };
  }

  const isDark = tg.colorScheme === 'dark';
  const tp = tg.themeParams;

  return {
    isDark,
    bg: tp.bg_color || (isDark ? '#1a1a2e' : '#ffffff'),
    text: tp.text_color || (isDark ? '#ffffff' : '#1a1a2e'),
    hint: tp.hint_color || (isDark ? '#8e8e93' : '#8e8e93'),
    buttonBg: tp.button_color || '#059669',
    buttonText: tp.button_text_color || '#ffffff',
    cardBg: tp.secondary_bg_color || (isDark ? '#24243e' : '#f9fafb'),
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
    safeTop: tg.safeAreaInset?.top || 0,
    safeBottom: tg.safeAreaInset?.bottom || 0,
  };
}

// ─── Type Badge Config ───────────────────────────────────────────────────────

const TYPE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  romel: { label: 'Romel', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  vd: { label: 'VD', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  note: { label: 'Note', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  log: { label: 'Log', bg: 'bg-slate-100 dark:bg-slate-700/40', text: 'text-slate-700 dark:text-slate-300' },
  sales: { label: 'Sales', bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' },
  general: { label: 'General', bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-700 dark:text-gray-300' },
  college: { label: 'College', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
};

function getTypeBadge(type: string) {
  return TYPE_BADGES[type.toLowerCase()] || TYPE_BADGES.general;
}

// ─── Priority Colors ─────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: 'bg-red-500', label: 'High' },
  medium: { dot: 'bg-amber-500', label: 'Medium' },
  low: { dot: 'bg-emerald-500', label: 'Low' },
};

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  todo: {
    label: 'To Do',
    icon: <Circle className="w-3.5 h-3.5 text-slate-400" />,
    color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  done: {
    label: 'Done',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
    color: 'text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ─── Skeleton Component ──────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: 'var(--tw-colors-slate-200, #e2e8f0)' }}
    />
  );
}

// ─── Loading Skeletons ───────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-6 w-40 mt-6" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-10 rounded-xl" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}

// ─── Format Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((today.getTime() - target.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  } catch {
    return '';
  }
}

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '...';
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MiniAppPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [botData, setBotData] = useState<BotDataResponse | null>(null);
  const [reportsData, setReportsData] = useState<ReportsResponse | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [theme, setTheme] = useState(() => getTelegramTheme());

  // Pull-to-refresh refs
  const contentRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);
  const isPulling = useRef(false);
  const canPull = useRef(true);

  // ─── Initialize Telegram ──────────────────────────────────────────────

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.HapticFeedback?.impactOccurred?.('light');
      tg.MainButton.hide();
      tg.BackButton.hide();

      // Listen for theme changes
      tg.onEvent?.('themeChanged', () => {
        setTheme(getTelegramTheme());
      });
      setTheme(getTelegramTheme());
    }
  }, []);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [dataRes, reportsRes] = await Promise.all([
        fetch('/api/bot/data'),
        fetch('/api/bot/reports'),
      ]);

      if (dataRes.ok) {
        const data = await dataRes.json();
        setBotData(data);
      }
      if (reportsRes.ok) {
        const reports = await reportsRes.json();
        setReportsData(reports);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      canPull.current = true;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Tab Switch Haptic ────────────────────────────────────────────────

  const handleTabSwitch = (tab: TabId) => {
    if (tab === activeTab) return;
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.selectionChanged?.();
    setActiveTab(tab);
    setExpandedReport(null);
    setSearchQuery('');
    setFilterType('all');
  };

  // ─── Pull-to-Refresh Handlers ─────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canPull.current) return;
    const scrollTop = contentRef.current?.scrollTop || 0;
    if (scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || !canPull.current) return;
    const diff = e.touches[0].clientY - pullStartY.current;
    if (diff > 0) {
      pullDistance.current = Math.min(diff * 0.4, 80);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance.current > 50) {
      canPull.current = false;
      const tg = window.Telegram?.WebApp;
      tg?.HapticFeedback?.impactOccurred?.('medium');
      fetchData(true);
    }
    pullDistance.current = 0;
  }, [fetchData]);

  // ─── Filtered Reports ─────────────────────────────────────────────────

  const getFilteredReports = useCallback((): ReportItem[] => {
    if (!reportsData?.filtered) return [];
    let reports = reportsData.filtered;

    if (filterType !== 'all') {
      reports = reports.filter((r) => r.type.toLowerCase() === filterType.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      reports = reports.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.content || '').toLowerCase().includes(q) ||
          (r.company || '').toLowerCase().includes(q)
      );
    }

    return reports;
  }, [reportsData, filterType, searchQuery]);

  // ─── Render Helpers ───────────────────────────────────────────────────

  const summary = botData?.summary;

  const statCards = [
    {
      label: 'Reports',
      value: (summary?.totalRomelReports || 0) + (summary?.totalVdReports || 0),
      icon: <FileText className="w-5 h-5 text-emerald-600" />,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Tasks',
      value: summary?.totalTasks || 0,
      icon: <CheckSquare className="w-5 h-5 text-teal-600" />,
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    },
    {
      label: 'Contacts',
      value: summary?.totalContacts || 0,
      icon: <Users className="w-5 h-5 text-amber-600" />,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Knowledge',
      value: summary?.totalKnowledge || 0,
      icon: <BookOpen className="w-5 h-5 text-purple-600" />,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  // ─── Home Tab ─────────────────────────────────────────────────────────

  function renderHome() {
    const recentReports = reportsData?.filtered?.slice(0, 5) || [];
    const lastSync = botData?.updatedAt;

    return (
      <div className="space-y-5 p-4 pb-4">
        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${botData?.hasData ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span style={{ color: theme.hint }} className="text-xs">
              {botData?.hasData ? 'Data synced' : 'Waiting for sync'}
            </span>
          </div>
          {lastSync && (
            <span style={{ color: theme.hint }} className="text-xs">
              {timeAgo(lastSync)}
            </span>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-4 border transition-all duration-200 active:scale-[0.97]"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.borderColor,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                {card.icon}
                <span
                  className="text-2xl font-bold"
                  style={{ color: theme.text }}
                >
                  {card.value}
                </span>
              </div>
              <span style={{ color: theme.hint }} className="text-xs font-medium">
                {card.label}
              </span>
              {card.label === 'Tasks' && summary && summary.totalTasks > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${summary.taskCompletionRate}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Task Completion */}
        {summary && summary.totalTasks > 0 && (
          <div
            className="rounded-xl p-4 border"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: theme.text }}>
                Task Completion
              </span>
              <span className="text-sm font-bold text-emerald-600">
                {summary.taskCompletionRate}%
              </span>
            </div>
            <div className="flex gap-3 text-xs mt-2" style={{ color: theme.hint }}>
              <span className="flex items-center gap-1">
                <Circle className="w-2.5 h-2.5 text-slate-400" />
                {summary.tasksTodo} todo
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-500" />
                {summary.tasksInProgress} active
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                {summary.tasksDone} done
              </span>
            </div>
          </div>
        )}

        {/* Today's Activity */}
        <div>
          <h3
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: theme.text }}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Recent Activity
          </h3>
          {recentReports.length > 0 ? (
            <div className="space-y-2">
              {recentReports.map((report) => {
                const badge = getTypeBadge(report.type);
                return (
                  <div
                    key={report.id}
                    className="rounded-xl p-3.5 border transition-colors duration-150"
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          {report.company && (
                            <span style={{ color: theme.hint }} className="text-[11px] truncate">
                              {report.company}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: theme.text }}
                        >
                          {report.title}
                        </p>
                        {report.content && (
                          <p
                            className="text-xs mt-1 line-clamp-1"
                            style={{ color: theme.hint }}
                          >
                            {truncate(report.content, 80)}
                          </p>
                        )}
                      </div>
                      <span style={{ color: theme.hint }} className="text-[11px] whitespace-nowrap mt-0.5">
                        {formatDate(report.date || report.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-xl p-6 border text-center"
              style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
            >
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: theme.hint }} />
              <p className="text-sm" style={{ color: theme.hint }}>
                No reports yet. Start by sending a report via the bot.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Reports Tab ───────────────────────────────────────────────────────

  function renderReports() {
    const filteredReports = getFilteredReports();
    const types = reportsData?.filters?.types || [];
    const typeFilterOptions = ['all', ...types];

    return (
      <div className="space-y-3 p-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.hint }} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-colors"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderColor,
              color: theme.text,
            }}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {typeFilterOptions.map((type) => {
            const isActive = filterType === type;
            const badge = type === 'all'
              ? { label: 'All', bg: '', text: '' }
              : getTypeBadge(type);

            return (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : ''
                }`}
                style={
                  !isActive
                    ? {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.borderColor,
                        color: theme.text,
                      }
                    : undefined
                }
              >
                {type === 'all' ? 'All' : badge.label}
                {type !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {reportsData?.stats?.byType?.[type] || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Report Count */}
        <div className="flex items-center justify-between px-1">
          <span style={{ color: theme.hint }} className="text-xs">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>
          {reportsData?.stats && (
            <span style={{ color: theme.hint }} className="text-xs">
              {reportsData.stats.today} today · {reportsData.stats.thisWeek} this week
            </span>
          )}
        </div>

        {/* Report Cards */}
        {filteredReports.length > 0 ? (
          <div className="space-y-2">
            {filteredReports.map((report) => {
              const badge = getTypeBadge(report.type);
              const isExpanded = expandedReport === report.id;

              return (
                <div
                  key={report.id}
                  className="rounded-xl border overflow-hidden transition-all duration-200"
                  style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
                >
                  <button
                    onClick={() => {
                      setExpandedReport(isExpanded ? null : report.id);
                      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
                    }}
                    className="w-full text-left p-3.5 active:bg-black/5 dark:active:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          {report.company && (
                            <span
                              className="text-[11px] font-medium"
                              style={{ color: theme.hint }}
                            >
                              {report.company}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium" style={{ color: theme.text }}>
                          {report.title}
                        </p>
                        {!isExpanded && report.content && (
                          <p className="text-xs mt-1 line-clamp-2" style={{ color: theme.hint }}>
                            {truncate(report.content, 120)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span style={{ color: theme.hint }} className="text-[11px]">
                          {formatDate(report.date || report.timestamp)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" style={{ color: theme.hint }} />
                        ) : (
                          <ChevronDown className="w-4 h-4" style={{ color: theme.hint }} />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && report.content && (
                    <div
                      className="px-3.5 pb-3.5 border-t animate-in slide-in-from-top-1 duration-200"
                      style={{ borderColor: theme.borderColor }}
                    >
                      <pre
                        className="text-xs mt-2.5 whitespace-pre-wrap break-words leading-relaxed font-sans"
                        style={{ color: theme.text }}
                      >
                        {report.content}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-xl p-8 border text-center"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
          >
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: theme.hint, opacity: 0.5 }} />
            <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>
              {searchQuery || filterType !== 'all' ? 'No matching reports' : 'No reports yet'}
            </p>
            <p className="text-xs" style={{ color: theme.hint }}>
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Send reports via the bot to see them here'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── Tasks Tab ────────────────────────────────────────────────────────

  function renderTasks() {
    const tasks = botData?.tasks?.list || [];
    const byStatus = botData?.tasks?.byStatus || {};

    return (
      <div className="space-y-4 p-4">
        {/* Status Summary */}
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: theme.text }}>
              Tasks Overview
            </span>
            <span className="text-xs font-medium" style={{ color: theme.hint }}>
              {tasks.length} total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'todo', label: 'To Do', count: byStatus.todo || 0, color: 'text-slate-500' },
              { key: 'in_progress', label: 'Active', count: byStatus.in_progress || 0, color: 'text-amber-500' },
              { key: 'done', label: 'Done', count: byStatus.done || 0, color: 'text-emerald-500' },
            ].map((item) => (
              <div
                key={item.key}
                className="text-center p-2 rounded-lg"
                style={{ backgroundColor: theme.bg }}
              >
                <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color: theme.hint }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task List */}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const priority = PRIORITY_STYLES[task.priority?.toLowerCase()] || PRIORITY_STYLES.low;
              const statusKey = (task.status || 'todo').toLowerCase().replace(/-/g, '_');
              const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
              const isDone = statusKey === 'done';

              return (
                <div
                  key={task.id}
                  className={`rounded-xl p-3.5 border transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}
                  style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
                >
                  <div className="flex items-start gap-3">
                    {/* Priority Dot */}
                    <div className="mt-1.5 shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${priority.dot}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${isDone ? 'line-through' : ''}`}
                        style={{ color: theme.text }}
                      >
                        {task.title || 'Untitled Task'}
                      </p>
                      {task.description && (
                        <p
                          className="text-xs mt-0.5 line-clamp-1"
                          style={{ color: theme.hint }}
                        >
                          {truncate(task.description, 80)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {priority.label}
                        </span>
                        {task.dueDate && (
                          <span style={{ color: theme.hint }} className="text-[11px] flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-xl p-8 border text-center"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
          >
            <CheckSquare className="w-10 h-10 mx-auto mb-3" style={{ color: theme.hint, opacity: 0.5 }} />
            <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>
              No tasks yet
            </p>
            <p className="text-xs" style={{ color: theme.hint }}>
              Create tasks via the bot to track your work here
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── Profile Tab ───────────────────────────────────────────────────────

  function renderProfile() {
    const tg = window.Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    const profile = botData?.rawSyncData?.profile;

    return (
      <div className="space-y-4 p-4">
        {/* User Card */}
        <div
          className="rounded-xl p-5 border text-center"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold">
            {tgUser?.first_name?.[0] || profile?.name?.[0] || 'C'}
          </div>
          <h3 className="text-base font-bold" style={{ color: theme.text }}>
            {tgUser
              ? `${tgUser.first_name}${tgUser.last_name ? ` ${tgUser.last_name}` : ''}`
              : profile?.name || 'Career AI User'}
          </h3>
          {tgUser?.username && (
            <p className="text-sm mt-0.5" style={{ color: theme.hint }}>
              @{tgUser.username}
            </p>
          )}
          {profile?.title && (
            <p className="text-sm mt-1 font-medium text-emerald-600 dark:text-emerald-400">
              {profile.title}
            </p>
          )}
          {(profile?.company || profile?.location) && (
            <p className="text-xs mt-1" style={{ color: theme.hint }}>
              {[profile.company, profile.location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: theme.hint }}>
            Quick Stats
          </h4>
          <div className="space-y-3">
            {[
              { icon: <FileText className="w-4 h-4" />, label: 'Reports', value: (summary?.totalRomelReports || 0) + (summary?.totalVdReports || 0) },
              { icon: <CheckSquare className="w-4 h-4" />, label: 'Tasks Done', value: summary?.tasksDone || 0 },
              { icon: <Users className="w-4 h-4" />, label: 'Contacts', value: summary?.totalContacts || 0 },
              { icon: <BookOpen className="w-4 h-4" />, label: 'Knowledge Base', value: summary?.totalKnowledge || 0 },
              { icon: <Briefcase className="w-4 h-4" />, label: 'Notes', value: summary?.totalNotes || 0 },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-500">{stat.icon}</span>
                  <span className="text-sm" style={{ color: theme.text }}>
                    {stat.label}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: theme.text }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bot Info Card */}
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold" style={{ color: theme.text }}>
                @hambi_career_ai_bot
              </h4>
              <p className="text-xs mt-0.5" style={{ color: theme.hint }}>
                Hambisa Executive — Career AI Assistant
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Shield className="w-3 h-3 text-emerald-500" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {botData?.syncCount || 0} syncs completed
                </span>
              </div>
              {botData?.updatedAt && (
                <p className="text-[11px] mt-1" style={{ color: theme.hint }}>
                  Last sync: {timeAgo(botData.updatedAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: theme.hint }}>
            About
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: theme.hint }}>
            Career AI Ethiopia helps you manage reports, track tasks, organize contacts, and build knowledge — all from Telegram. Send commands to the bot to add data, and view everything here.
          </p>
        </div>
      </div>
    );
  }

  // ─── Tab Content Switcher ──────────────────────────────────────────────

  function renderTabContent() {
    if (loading) {
      switch (activeTab) {
        case 'home': return <HomeSkeleton />;
        case 'reports': return <ReportsSkeleton />;
        case 'tasks': return <TasksSkeleton />;
        case 'profile': return <ProfileSkeleton />;
      }
    }

    switch (activeTab) {
      case 'home': return renderHome();
      case 'reports': return renderReports();
      case 'tasks': return renderTasks();
      case 'profile': return renderProfile();
    }
  }

  // ─── Tab Bar Config ────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        paddingTop: theme.safeTop,
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 border-b backdrop-blur-md transition-colors duration-300"
        style={{
          backgroundColor: theme.isDark ? 'rgba(26,26,46,0.85)' : 'rgba(255,255,255,0.85)',
          borderColor: theme.borderColor,
        }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold" style={{ color: theme.text }}>
              Career AI
            </h1>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              const tg = window.Telegram?.WebApp;
              tg?.HapticFeedback?.impactOccurred?.('light');
              fetchData(true);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
              refreshing ? 'animate-spin' : ''
            }`}
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: theme.hint,
            }}
            aria-label="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pull-to-Refresh Indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance.current }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        ) : (
          <RefreshCw
            className="w-5 h-5 text-emerald-500 transition-transform duration-200"
            style={{
              transform: pullDistance.current > 0
                ? `rotate(${pullDistance.current * 2.25}deg)`
                : 'rotate(0deg)',
              opacity: Math.min(pullDistance.current / 50, 1),
            }}
          />
        )}
      </div>

      {/* Scrollable Content */}
      <main
        ref={contentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          paddingBottom: theme.safeBottom + 68,
        }}
      >
        <div className="max-w-lg mx-auto">
          {/* Tab Content with Transition */}
          <div
            key={activeTab}
            className="animate-in fade-in duration-200"
          >
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md transition-colors duration-300"
        style={{
          backgroundColor: theme.isDark ? 'rgba(26,26,46,0.92)' : 'rgba(255,255,255,0.92)',
          borderColor: theme.borderColor,
          paddingBottom: theme.safeBottom,
        }}
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto h-14">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => handleTabSwitch(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-90 min-w-[60px]"
                style={{
                  color: isActive ? '#059669' : theme.hint,
                }}
              >
                <div
                  className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-[10px] font-semibold transition-all duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-0 w-6 h-0.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Hide scrollbar utility styles */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-in {
          animation: fade-in 0.2s ease-out;
        }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Slide-in for expanded content */
        @keyframes slide-in-from-top-1 {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-in-from-top-1 {
          animation: slide-in-from-top-1 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}