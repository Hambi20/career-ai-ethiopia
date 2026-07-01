'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

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
const STORAGE_TS_KEY = 'career-ai-data-timestamp';

// ── Context ──
interface BotDataContextType {
  botData: BotData;
  tabData: TabData;
  loading: boolean;
  lastFetched: string;
  refresh: () => void;
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
  loading: false,
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
      return parsed as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

function saveToStorage(key: string, data: any) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(STORAGE_TS_KEY, Date.now().toString());
  } catch { /* ignore */ }
}

/** Check if stored data is stale (> 2 hours old) */
function isStale(key: string): boolean {
  if (!isBrowser) return true;
  try {
    const ts = localStorage.getItem(STORAGE_TS_KEY);
    if (!ts) return true;
    const age = Date.now() - parseInt(ts, 10);
    return age > 2 * 60 * 60 * 1000; // 2 hours
  } catch { return true; }
}

/** Count "data weight" of a BotData object — how much real data it contains */
function dataWeight(d: BotData): number {
  if (!d) return 0;
  let w = 0;
  if (d.syncCount > 0) w += d.syncCount * 10;
  w += (d.tasks?.list?.length || 0);
  w += (d.notes?.length || 0);
  w += (d.contacts?.list?.length || 0);
  w += (d.knowledgeBase?.length || 0);
  w += (d.sales?.reports?.length || 0);
  w += (d.recentActivities?.length || 0);
  w += (d.vdReports?.length || 0);
  return w;
}

// ── Provider ──
export function BotDataProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage FIRST (instant, no loading)
  const [botData, setBotData] = useState<BotData>(() => loadFromStorage(STORAGE_KEY, EMPTY_BOT_DATA));
  const [tabData, setTabData] = useState<TabData>(() => loadFromStorage(TAB_STORAGE_KEY, EMPTY_TAB_DATA));
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState('');

  // Use ref to track current botData for weight comparison without creating callback loop
  const botDataRef = useRef(botData);
  botDataRef.current = botData;

  const fetchBotData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bot/data');
      const json = await res.json();
      if (json.success) {
        const apiData: BotData = { ...EMPTY_BOT_DATA, ...json, source: json.source || 'api' };
        const apiWeight = dataWeight(apiData);
        const currentWeight = dataWeight(botDataRef.current);

        // KEY FIX: Only update state if API has MORE data than current cache
        // This prevents cold-start empty responses from wiping localStorage data
        if (apiWeight >= currentWeight) {
          setBotData(apiData);
          // Save to localStorage if we got meaningful data
          if (apiData.hasData || apiData.syncCount > 0 || apiWeight > 0) {
            saveToStorage(STORAGE_KEY, apiData);
          }
        }
        // If API returned empty but we have cached data, KEEP cached data (do nothing)
      }
    } catch {
      // Network error — keep whatever we have (localStorage or empty)
    } finally {
      setLoading(false);
      setLastFetched(new Date().toISOString());
    }
  }, []);

  const fetchTabData = useCallback(async () => {
    const newTabData: TabData = { ...EMPTY_TAB_DATA };

    // Telegram stats
    try {
      const r = await fetch('/api/telegram/stats');
      const d = await r.json();
      if (d.success && d.stats) newTabData.telegramStats = d.stats;
    } catch { /* silent */ }

    // Telegram users
    try {
      const r = await fetch('/api/telegram/users');
      const d = await r.json();
      if (d.success && d.users?.length > 0) newTabData.telegramUsers = d.users;
    } catch { /* silent */ }

    // Telegram activity
    try {
      const r = await fetch('/api/telegram/activity?limit=30');
      const d = await r.json();
      if (d.success && d.activities?.length > 0) newTabData.telegramActivities = d.activities;
    } catch { /* silent */ }

    // Jobs summary
    try {
      const r = await fetch('/api/jobs/summary?hours=24');
      const d = await r.json();
      if (d.success && (d.summary || d.data)) newTabData.jobsSummary = d.summary || d.data;
    } catch { /* silent */ }

    // CRM stats
    try {
      const r = await fetch('/api/crm/stats');
      const d = await r.json();
      if (d.success && d.stats) newTabData.crmStats = d.stats;
    } catch { /* silent */ }

    // Applications
    try {
      const r = await fetch('/api/applications');
      const d = await r.json();
      if (d.success && d.applications?.length > 0) newTabData.applications = d.applications;
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
      if (d.success && d.rules?.length > 0) newTabData.automationRules = d.rules;
    } catch { /* silent */ }

    // Merge: only update fields that have data (don't wipe existing cache with empty arrays)
    setTabData(prev => {
      const merged: TabData = { ...EMPTY_TAB_DATA };
      // For each field, use new data if it has content, otherwise keep prev
      (Object.keys(newTabData) as (keyof TabData)[]).forEach(key => {
        const newVal = newTabData[key];
        const prevVal = prev[key];
        if (key === 'profile') {
          // Profile: use new if exists
          merged[key] = newVal || prevVal;
        } else if (Array.isArray(newVal)) {
          // Arrays: use new if non-empty, keep prev if new is empty
          merged[key] = newVal.length > 0 ? newVal : prevVal;
        } else {
          // Objects: use new if truthy, keep prev otherwise
          merged[key] = newVal || prevVal;
        }
      });
      saveToStorage(TAB_STORAGE_KEY, merged);
      return merged;
    });
  }, []);

  const refresh = useCallback(() => {
    fetchBotData();
    fetchTabData();
  }, [fetchBotData, fetchTabData]);

  // Stable refresh ref for external use without re-subscribing
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const stableRefresh = useCallback(() => refreshRef.current(), []);

  // Initial load & polling
  useEffect(() => {
    fetchBotData();
    fetchTabData();

    // Poll every 30 seconds
    const i = setInterval(() => {
      fetchBotData();
      fetchTabData();
    }, 30000);
    return () => clearInterval(i);
  }, [fetchBotData, fetchTabData]);

  const hasData = botData.hasData || botData.syncCount > 0 ||
    (isBrowser ? !!localStorage.getItem(STORAGE_KEY) : false) ||
    dataWeight(botData) > 0;

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
