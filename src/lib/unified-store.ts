/**
 * Unified in-memory store for bot-synced data.
 * Survives warm Vercel instances; lost on cold start (bot re-syncs via /syncweb).
 */

export interface StoreData {
  tasks: any[];
  notes: any[];
  contacts: any[];
  knowledge: any[];
  romelReports: any[];
  vdReports: any[];
  salesSummary: any;
  jobSearchResults: any[];
  bots: any[];
  botUsers: any[];
  botActivities: any[];
  applications: any[];
  automationRules: any[];
  businesses: any[];
  messages: any[];
  dailyPlans: any[];
  chatMessages: any[];
  cvAnalyses: any[];
  interviewPreps: any[];
  lastSync: string | null;
  syncCount: number;
  rawSyncData: any;
}

const initialStore: StoreData = {
  tasks: [],
  notes: [],
  contacts: [],
  knowledge: [],
  romelReports: [],
  vdReports: [],
  salesSummary: null,
  jobSearchResults: [],
  bots: [],
  botUsers: [],
  botActivities: [],
  applications: [],
  automationRules: [],
  businesses: [],
  messages: [],
  dailyPlans: [],
  chatMessages: [],
  cvAnalyses: [],
  interviewPreps: [],
  lastSync: null,
  syncCount: 0,
  rawSyncData: null,
};

let store: StoreData = { ...initialStore };

export function getStore(): StoreData {
  return store;
}

export function resetStore() {
  store = { ...initialStore };
}

// ── Bot Sync ──
export function syncBotData(data: any, botId?: string) {
  const s = store;

  // Tasks
  if (data.tasks) {
    s.tasks = Array.isArray(data.tasks) ? data.tasks : [];
  }

  // Notes
  if (data.notes) {
    s.notes = Array.isArray(data.notes) ? data.notes : [];
  }

  // Contacts
  if (data.contacts) {
    s.contacts = Array.isArray(data.contacts) ? data.contacts : [];
  }

  // Knowledge
  if (data.knowledge || data.knowledgeBase) {
    s.knowledge = Array.isArray(data.knowledge || data.knowledgeBase)
      ? (data.knowledge || data.knowledgeBase)
      : [];
  }

  // Romel reports / sales
  if (data.romelReports || data.salesReports) {
    s.romelReports = Array.isArray(data.romelReports || data.salesReports)
      ? (data.romelReports || data.salesReports)
      : [];
  }

  // VD reports
  if (data.vdReports) {
    s.vdReports = Array.isArray(data.vdReports) ? data.vdReports : [];
  }

  // Sales summary
  if (data.salesSummary || data.sales) {
    s.salesSummary = data.salesSummary || data.sales || null;
  }

  // Job search results
  if (data.jobSearchResults || data.jobs) {
    s.jobSearchResults = Array.isArray(data.jobSearchResults || data.jobs)
      ? (data.jobSearchResults || data.jobs)
      : [];
  }

  // Bots
  if (data.bots) {
    s.bots = Array.isArray(data.bots) ? data.bots : [];
  }

  // Bot users
  if (data.botUsers || data.users) {
    s.botUsers = Array.isArray(data.botUsers || data.users)
      ? (data.botUsers || data.users)
      : [];
  }

  // Bot activities
  if (data.botActivities || data.activities) {
    s.botActivities = Array.isArray(data.botActivities || data.activities)
      ? (data.botActivities || data.activities)
      : [];
  }

  // Applications
  if (data.applications) {
    s.applications = Array.isArray(data.applications) ? data.applications : [];
  }

  // Automation rules
  if (data.automationRules || data.rules) {
    s.automationRules = Array.isArray(data.automationRules || data.rules)
      ? (data.automationRules || data.rules)
      : [];
  }

  // Businesses
  if (data.businesses) {
    s.businesses = Array.isArray(data.businesses) ? data.businesses : [];
  }

  // Messages
  if (data.messages) {
    s.messages = Array.isArray(data.messages) ? data.messages : [];
  }

  // Daily plans
  if (data.dailyPlans || data.plans) {
    s.dailyPlans = Array.isArray(data.dailyPlans || data.plans)
      ? (data.dailyPlans || data.plans)
      : [];
  }

  // Keep raw data for deep access
  s.rawSyncData = data;
  s.lastSync = new Date().toISOString();
  s.syncCount += 1;

  return s;
}

// ── CRUD: Tasks ──
export function getTasks() { return store.tasks; }
export function createTask(task: any) {
  const t = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...task };
  store.tasks.unshift(t);
  return t;
}
export function updateTask(id: string, updates: any) {
  const idx = store.tasks.findIndex((t: any) => t.id === id || t._id === id);
  if (idx >= 0) { store.tasks[idx] = { ...store.tasks[idx], ...updates }; return store.tasks[idx]; }
  return null;
}
export function deleteTask(id: string) {
  store.tasks = store.tasks.filter((t: any) => t.id !== id && t._id !== id);
}

// ── CRUD: Notes ──
export function getNotes() { return store.notes; }
export function createNote(note: any) {
  const n = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...note };
  store.notes.unshift(n);
  return n;
}
export function deleteNote(id: string) {
  store.notes = store.notes.filter((n: any) => n.id !== id && n._id !== id);
}

// ── CRUD: Contacts ──
export function getContacts() { return store.contacts; }
export function createContact(contact: any) {
  const c = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...contact };
  store.contacts.unshift(c);
  return c;
}
export function updateContact(id: string, updates: any) {
  const idx = store.contacts.findIndex((c: any) => c.id === id || c._id === id);
  if (idx >= 0) { store.contacts[idx] = { ...store.contacts[idx], ...updates }; return store.contacts[idx]; }
  return null;
}
export function deleteContact(id: string) {
  store.contacts = store.contacts.filter((c: any) => c.id !== id && c._id !== id);
}

// ── CRUD: Knowledge ──
export function getKnowledge() { return store.knowledge; }
export function createKnowledge(item: any) {
  const k = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...item };
  store.knowledge.unshift(k);
  return k;
}
export function deleteKnowledge(id: string) {
  store.knowledge = store.knowledge.filter((k: any) => k.id !== id && k._id !== id);
}

// ── CRUD: Automation Rules ──
export function getAutomationRules() { return store.automationRules; }
export function createAutomationRule(rule: any) {
  const r = { id: Date.now().toString(), active: true, runCount: 0, createdAt: new Date().toISOString(), ...rule };
  store.automationRules.unshift(r);
  return r;
}
export function updateAutomationRule(id: string, updates: any) {
  const idx = store.automationRules.findIndex((r: any) => r.id === id || r._id === id);
  if (idx >= 0) { store.automationRules[idx] = { ...store.automationRules[idx], ...updates }; return store.automationRules[idx]; }
  return null;
}
export function deleteAutomationRule(id: string) {
  store.automationRules = store.automationRules.filter((r: any) => r.id !== id && r._id !== id);
}

// ── CRUD: Businesses ──
export function getBusinesses() { return store.businesses; }
export function createBusiness(business: any) {
  const b = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...business };
  store.businesses.unshift(b);
  return b;
}

// ── CRUD: Applications ──
export function getApplications() { return store.applications; }
export function createApplication(app: any) {
  const a = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...app };
  store.applications.unshift(a);
  return a;
}
export function findApplicationByUrl(url: string) {
  return store.applications.find((a: any) => a.url === url) || null;
}

// ── CRUD: Chat Messages ──
export function getChatMessages() { return store.chatMessages; }
export function createChatMessage(msg: any) {
  const m = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...msg };
  store.chatMessages.push(m);
  return m;
}
export function clearChatMessages() { store.chatMessages = []; }

// ── CRUD: CV Analyses ──
export function getCvAnalyses() { return store.cvAnalyses; }
export function createCvAnalysis(analysis: any) {
  const a = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...analysis };
  store.cvAnalyses.unshift(a);
  return a;
}
export function getLatestCvAnalysis() { return store.cvAnalyses.length > 0 ? store.cvAnalyses[0] : null; }
export function clearCvAnalyses() { store.cvAnalyses = []; }

// ── CRUD: Interview Preps ──
export function getInterviewPreps() { return store.interviewPreps; }
export function createInterviewPrep(prep: any) {
  const p = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...prep };
  store.interviewPreps.unshift(p);
  return p;
}
export function findInterviewPrep(jobTitle: string, company?: string | null) {
  return store.interviewPreps.find((p: any) =>
    p.jobTitle === jobTitle && (!company || p.company === company)
  ) || null;
}
export function clearInterviewPreps() { store.interviewPreps = []; }

// ── Default Profile (fallback) ──
const DEFAULT_PROFILE = {
  fullName: 'Hambisa Bekuma Tefera',
  email: 'hambisa1992@gmail.com',
  phone: '+251 952 341 525',
  location: 'Addis Ababa, Ethiopia',
  title: 'Sales Manager',
  summary: 'Experienced Sales Manager with 8+ years across Eastern Ethiopia and Addis Ababa. MBA and BSc in Agribusiness.',
  skills: JSON.stringify(['Territory Management', 'Route-to-Market', 'Market Expansion', 'New Account Opening', 'Field Team Leadership', 'Negotiation', 'B2B Account Management', 'Distributor Development', 'Sales Planning', 'Market Intelligence']),
  education: JSON.stringify([
    { degree: 'MBA', institution: 'Addis Ababa Medical & Business College', year: '2018' },
    { degree: 'BSc Agribusiness', institution: 'Jimma University', year: '2014' },
  ]),
  experience: JSON.stringify([
    { title: 'Route Sales Representative', company: 'Romel General Trading', period: 'Jan 2026 – Present' },
    { title: 'Marketing Manager', company: 'OL-BRIGHT International College', period: 'Dec 2022 – Nov 2025' },
    { title: 'Marketing & Sales Manager', company: 'Deran PLC', period: 'Dec 2020 – Nov 2022' },
    { title: 'Territory Sales Manager', company: 'SMADL Communication', period: 'Jul 2016 – Nov 2020' },
  ]),
  cvScore: 72,
  targetRole: 'Sales Manager',
};

// ── Profile helper ──
export function getProfile() {
  const s = getStore();
  return s.rawSyncData?.profile || DEFAULT_PROFILE;
}

// ── CRUD: Messages ──
export function getMessages() { return store.messages; }
export function createMessage(msg: any) {
  const m = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...msg };
  store.messages.unshift(m);
  return m;
}

// ── Stats helpers ──
export function getTelegramStats() {
  const bots = store.bots;
  const users = store.botUsers;
  const activities = store.botActivities;
  const today = new Date().toISOString().slice(0, 10);
  const todayActivities = activities.filter((a: any) => {
    const d = a.createdAt || a.date || a.timestamp;
    return d && d.startsWith(today);
  }).length;

  return {
    totalUsers: users.length,
    premiumUsers: users.filter((u: any) => u.isPremium || u.premium).length,
    todayActivities,
    errorCount: activities.filter((a: any) => a.status === 'error' || a.type === 'error').length,
    bots: bots.map((b: any) => ({
      id: b.id || b._id,
      name: b.name || b.botName,
      username: b.username || '',
      botType: b.botType || b.type || 'telegram',
      isOnline: b.isOnline ?? true,
      totalUsers: b.totalUsers || b.userCount || 0,
    })),
  };
}

export function getTelegramUsers() {
  return store.botUsers.map((u: any) => ({
    id: u.id || u._id,
    firstName: u.firstName || u.first_name || '',
    lastName: u.lastName || u.last_name || '',
    name: u.name || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim(),
    username: u.username || '',
    isPremium: u.isPremium || u.premium || false,
  }));
}

export function getTelegramActivities(limit = 30) {
  return store.botActivities.slice(0, limit).map((a: any) => ({
    id: a.id || a._id,
    command: a.command || a.action || '',
    action: a.action || '',
    botName: a.botName || a.bot || '',
    createdAt: a.createdAt || a.timestamp || a.date || '',
    status: a.status || 'success',
  }));
}

export function getJobSummary(hours = 24) {
  const jobs = store.jobSearchResults;
  return {
    totalJobs: jobs.length,
    topSource: 'EthioJobs',
    recentJobs: jobs.slice(0, 10),
  };
}

export function getCrmStats() {
  const contacts = store.contacts;
  const customers = contacts.filter((c: any) => c.type === 'customer' || c.type === 'Customer').length;
  const dealers = contacts.filter((c: any) => c.type === 'dealer' || c.type === 'Dealer').length;
  const revenue = contacts.reduce((sum: number, c: any) => sum + (c.value || c.revenue || 0), 0);
  return {
    totalContacts: contacts.length,
    customers,
    dealers,
    totalRevenue: revenue,
    upcomingVisits: contacts.filter((c: any) => c.visits && c.visits.length > 0).length,
  };
}

export function getDashboardStats() {
  const tasks = store.tasks;
  const done = tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length;
  const todo = tasks.filter((t: any) => t.status === 'todo' || t.status === 'pending').length;
  const inProgress = tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'in-progress').length;

  return {
    totalTasks: tasks.length,
    tasksDone: done,
    tasksTodo: todo,
    tasksInProgress: inProgress,
    totalContacts: store.contacts.length,
    totalKnowledge: store.knowledge.length,
    totalApplications: store.applications.length,
    totalBots: store.bots.length,
    totalUsers: store.botUsers.length,
    taskCompletionRate: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
  };
}
