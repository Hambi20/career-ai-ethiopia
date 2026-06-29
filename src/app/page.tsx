'use client';

import { useState, useEffect } from 'react';
import { BotDataProvider, useBotData } from '@/lib/bot-data-context';
import { Toaster } from '@/components/ui/sonner';

// Tab components
import { DashboardTab } from '@/components/dashboard-tab';
import BotReportTab from '@/components/bot-report-tab';
import { BotHubTab } from '@/components/bot-hub-tab';
import AiChatTab from '@/components/ai-chat-tab';
import ExecutiveTab from '@/components/executive-tab';
import ApplicationsTab from '@/components/applications-tab';
import AutoApplyTab from '@/components/auto-apply-tab';
import { CoverLettersTab } from '@/components/cover-letters-tab';
import CvAnalyzerTab from '@/components/cv-analyzer-tab';
import InterviewPrepTab from '@/components/interview-prep-tab';
import { JobBoardTab } from '@/components/job-board-tab';
import { ProfileTab } from '@/components/profile-tab';
import { CrmTab } from '@/components/crm-tab';
import { KnowledgeTab } from '@/components/knowledge-tab';
import { BusinessTab } from '@/components/business-tab';
import { AutomationTab } from '@/components/automation-tab';
import { CvIntelligenceTab } from '@/components/cv-intelligence-tab';
import { MessagesTab } from '@/components/messages-tab';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase, Bot, Brain, FileText, Search, Mail, User, Users,
  Building2, Zap, BookOpen, BarChart3, MessageSquare, LayoutDashboard,
  ChevronDown, Crown, RefreshCw,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bot-report', label: 'Bot Report', icon: Bot },
  { id: 'bot-hub', label: 'Bot Hub', icon: BarChart3 },
  { id: 'ai-chat', label: 'Assistant', icon: Brain },
  { id: 'executive', label: 'AI Coach', icon: Zap },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'auto-apply', label: 'Search & Apply', icon: Search },
  { id: 'cover-letters', label: 'Cover Letters', icon: Mail },
  { id: 'cv-analyzer', label: 'CV Analyzer', icon: FileText },
  { id: 'interview-prep', label: 'Interview Prep', icon: Users },
  { id: 'job-board', label: 'Job Board', icon: Search },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'knowledge', label: 'Library', icon: BookOpen },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'cv-intelligence', label: 'CV Intel', icon: Brain },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
] as const;

type TabId = typeof TABS[number]['id'];

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { botData, loading, refresh, lastFetched } = useBotData();

  const currentTab = TABS.find(t => t.id === activeTab);
  const [mobileTabLabel, setMobileTabLabel] = useState('Dashboard');

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setMenuOpen(false);
    const tab = TABS.find(t => t.id === id);
    if (tab) setMobileTabLabel(tab.label);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Career AI Ethiopia</h1>
              <p className="text-[10px] text-muted-foreground">Executive Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync indicator */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${botData.hasData ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {botData.hasData ? `Synced ${botData.updatedAt ? new Date(botData.updatedAt).toLocaleTimeString() : ''}` : 'Not synced'}
              </span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] hidden sm:flex"><Crown className="w-3 h-3 mr-1" />Premium</Badge>

            {/* Mobile tab selector */}
            <div className="relative sm:hidden">
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setMenuOpen(!menuOpen)}>
                {mobileTabLabel} <ChevronDown className="w-3 h-3" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-48 bg-background border rounded-lg shadow-lg py-1 max-h-80 overflow-y-auto">
                  {TABS.map(tab => (
                    <button key={tab.id} className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 text-left ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700 font-medium' : ''}`}
                      onClick={() => handleTabChange(tab.id)}>
                      <tab.icon className="w-3.5 h-3.5" />{tab.label}
                      {activeTab === tab.id && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop tab bar */}
        <div className="hidden sm:flex overflow-x-auto px-4 pb-0 scrollbar-none">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm"
                className={`gap-1.5 text-xs flex-shrink-0 rounded-b-none border-b-2 ${activeTab === tab.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => handleTabChange(tab.id)}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-3 sm:p-4 max-w-7xl mx-auto w-full">
        {loading && !botData.hasData ? (
          <div className="space-y-4">
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'bot-report' && <BotReportTab />}
            {activeTab === 'bot-hub' && <BotHubTab />}
            {activeTab === 'ai-chat' && <AiChatTab />}
            {activeTab === 'executive' && <ExecutiveTab />}
            {activeTab === 'applications' && <ApplicationsTab />}
            {activeTab === 'auto-apply' && <AutoApplyTab />}
            {activeTab === 'cover-letters' && <CoverLettersTab />}
            {activeTab === 'cv-analyzer' && <CvAnalyzerTab />}
            {activeTab === 'interview-prep' && <InterviewPrepTab />}
            {activeTab === 'job-board' && <JobBoardTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'crm' && <CrmTab />}
            {activeTab === 'knowledge' && <KnowledgeTab />}
            {activeTab === 'business' && <BusinessTab />}
            {activeTab === 'automation' && <AutomationTab />}
            {activeTab === 'cv-intelligence' && <CvIntelligenceTab />}
            {activeTab === 'messages' && <MessagesTab />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">Hambisa Bekuma Tefera — Addis Ababa, Ethiopia • +251 952 341 525</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Career AI Ethiopia • Premium Dashboard</p>
      </footer>

      <Toaster position="top-right" />
    </div>
  );
}

export default function Home() {
  return (
    <BotDataProvider>
      <AppContent />
    </BotDataProvider>
  );
}
