'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ── Types ──
export interface BotDataSummary {
  totalRomelReports: number; totalVdReports: number;
  totalTasks: number; tasksDone: number; tasksTodo: number; tasksInProgress: number;
  taskCompletionRate: number; totalNotes: number; totalContacts: number;
  totalKnowledge: number; dailyAchievementRate: number;
  lastSync: string | null; totalSyncs: number;
}

export interface BotData {
  success: boolean; hasData: boolean; source: string;
  updatedAt: string; syncCount: number;
  summary: BotDataSummary;
  sales: { summary: any; latestReport: any; reports: any[] };
  tasks: { list: any[]; byPriority: Record<string, number>; byStatus: Record<string, number> };
  notes: any[];
  contacts: { list: any[]; breakdown: Record<string, number> };
  knowledgeBase: any[];
  vdReports: any[];
  syncLogs: any[];
  recentActivities: any[];
}

export interface TabData {
  // Per-tab data fetched individually
  telegramStats: any;
  telegramUsers: any[];
  telegramActivities: any[];
  jobsSummary: any;
  crmStats: any;
  automationRules: any[];
  applications: any[];
  profile: any;
}

const EMPTY_BOT_DATA: BotData = {
  success: true, hasData: false, source: 'empty', updatedAt: '', syncCount: 0,
  summary: {
    totalRomelReports: 0, totalVdReports: 0, totalTasks: 0, tasksDone: 0,
    tasksTodo: 0, tasksInProgress: 0, taskCompletionRate: 0, totalNotes: 0,
    totalContacts: 0, totalKnowledge: 0, dailyAchievementRate: 0,
    lastSync: null, totalSyncs: 0,
  },
  sales: { summary: {}, latestReport: null, reports: [] },
  tasks: { list: [], byPriority: { high: 0, medium: 0, low: 0 }, byStatus: { todo: 0, in_progress: 0, done: 0, cancelled: 0 } },
  notes: [], contacts: { list: [], breakdown: {} }, knowledgeBase: [],
  vdReports: [], syncLogs: [], recentActivities: [],
};

const EMPTY_TAB_DATA: TabData = {
  telegramStats: null, telegramUsers: [], telegramActivities: [],
  jobsSummary: null, crmStats: null, automationRules: [],
  applications: [], profile: null,
};

const STORAGE_KEY = 'career-ai-bot-data';
const TAB_STORAGE_KEY = 'career-ai-tab-data';

// ── Context ──
interface BotDataContextType {
  botData: BotData;
  tabData: TabData;
  loading: boolean;
  lastFetched: string;
  refresh: (silent?: boolean) => void;
  // Direct data helpers
  hasData: boolean;
  tasks: any[];
  notes: any[];
  contacts: any[];
  knowledge: any[];
  reports: any[];
  vdReports: any[];
  sales: any[];
  activities: any[];
}

const BotDataContext = createContext<BotDataContextType>({
  botData: EMPTY_BOT_DATA,
  tabData: EMPTY_TAB_DATA,
  loading: true,
  lastFetched: '',
  refresh: () => {},
  hasData: false,
  tasks: [], notes: [], contacts: [], knowledge: [],
  reports: [], vdReports: [], sales: [], activities: [],
});

export function useBotData() {
  return useContext(BotDataContext);
}

// ── localStorage helpers (safe for SSR) ──
const isBrowser = typeof window !== 'undefined';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.updatedAt) return parsed as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

function saveToStorage(key: string, data: any) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ── Provider ──
export function BotDataProvider({ children }: { children: ReactNode }) {
  const [botData, setBotData] = useState<BotData>(() => loadFromStorage(STORAGE_KEY, EMPTY_BOT_DATA));
  const [tabData, setTabData] = useState<TabData>(() => loadFromStorage(TAB_STORAGE_KEY, EMPTY_TAB_DATA));
  const [loading] = useState(false);
  const [lastFetched, setLastFetched] = useState('');

  const fetchBotData = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/data');
      const json = await res.json();
      if (json.success) {
        const data: BotData = { ...EMPTY_BOT_DATA, ...json, source: json.source || 'api' };
        setBotData(data);
        if (data.hasData || data.syncCount > 0) {
          saveToStorage(STORAGE_KEY, data);
        }
      }
    } catch { /* silent */ }
    setLastFetched(new Date().toISOString());
  }, []);

  const fetchTabData = useCallback(async () => {
    const newTabData: TabData = { ...EMPTY_TAB_DATA };

    // Telegram stats
    try {
      const r = await fetch('/api/telegram/stats');
      const d = await r.json();
      if (d.success) newTabData.telegramStats = d.stats;
    } catch { /* silent */ }

    // Telegram users
    try {
      const r = await fetch('/api/telegram/users');
      const d = await r.json();
      if (d.success) newTabData.telegramUsers = d.users || [];
    } catch { /* silent */ }

    // Telegram activity
    try {
      const r = await fetch('/api/telegram/activity?limit=30');
      const d = await r.json();
      if (d.success) newTabData.telegramActivities = d.activities || [];
    } catch { /* silent */ }

    // Jobs summary
    try {
      const r = await fetch('/api/jobs/summary?hours=24');
      const d = await r.json();
      if (d.success) newTabData.jobsSummary = d.summary || d.data;
    } catch { /* silent */ }

    // CRM stats
    try {
      const r = await fetch('/api/crm/stats');
      const d = await r.json();
      if (d.success) newTabData.crmStats = d.stats;
    } catch { /* silent */ }

    // Applications
    try {
      const r = await fetch('/api/applications');
      const d = await r.json();
      if (d.success) newTabData.applications = d.applications || [];
    } catch { /* silent */ }

    // Profile
    try {
      const r = await fetch('/api/profile');
      const d = await r.json();
      if (d.success && d.profile) newTabData.profile = d.profile;
    } catch { /* silent */ }

    // Automation rules
    try {
      const r = await fetch('/api/automation/rules');
      const d = await r.json();
      if (d.success) newTabData.automationRules = d.rules || [];
    } catch { /* silent */ }

    setTabData(prev => {
      const merged = { ...prev, ...newTabData };
      saveToStorage(TAB_STORAGE_KEY, merged);
      return merged;
    });
  }, []);

  const refresh = useCallback(() => {
    fetchBotData();
    fetchTabData();
  }, [fetchBotData, fetchTabData]);

  // Initial load & polling every 10 seconds
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching
    fetchBotData();
    fetchTabData();
    const i = setInterval(() => { fetchBotData(); fetchTabData(); }, 30000);
    return () => clearInterval(i);
  }, [fetchBotData, fetchTabData]);

  const hasData = botData.hasData || botData.syncCount > 0 || (isBrowser ? !!localStorage.getItem(STORAGE_KEY) : false);

  return (
    <BotDataContext.Provider value={{
      botData, tabData, loading, lastFetched, refresh, hasData,
      tasks: botData.tasks?.list || [],
      notes: botData.notes || [],
      contacts: botData.contacts?.list || [],
      knowledge: botData.knowledgeBase || [],
      reports: botData.sales?.reports || [],
      vdReports: botData.vdReports || [],
      sales: botData.sales?.summary || {},
      activities: botData.recentActivities || tabData.telegramActivities || [],
    }}>
      {children}
    </BotDataContext.Provider>
  );
}
