import { create } from 'zustand';

export type Tab = 'search' | 'bookmarks' | 'applications' | 'ai-assistant' | 'profile';

export interface JobResult {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  description: string;
  url: string;
  source: string | null;
  postedDate: string | null;
  deadline: string | null;
  category: string | null;
}

export interface SavedJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  description: string | null;
  url: string;
  source: string | null;
  postedDate: string | null;
  deadline: string | null;
  category: string | null;
  isBookmarked: boolean;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string | null;
  jobTitle: string;
  company: string | null;
  location: string | null;
  status: string;
  url: string | null;
  coverLetter: string | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  title: string | null;
  summary: string | null;
  skills: string;
  education: string | null;
  experience: string | null;
  resumeUrl: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface JobDetailData {
  title: string;
  company: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  description: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  deadline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface AppState {
  // Navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Job Search
  searchQuery: string;
  searchLocation: string;
  searchCategory: string;
  searchType: string;
  searchResults: JobResult[];
  isSearching: boolean;
  setSearchQuery: (q: string) => void;
  setSearchLocation: (q: string) => void;
  setSearchCategory: (q: string) => void;
  setSearchType: (q: string) => void;
  setSearchResults: (results: JobResult[]) => void;
  setIsSearching: (v: boolean) => void;

  // Job Detail
  selectedJob: JobResult | null;
  jobDetail: JobDetailData | null;
  isLoadingDetail: boolean;
  setSelectedJob: (job: JobResult | null) => void;
  setJobDetail: (detail: JobDetailData | null) => void;
  setIsLoadingDetail: (v: boolean) => void;

  // Saved Jobs
  savedJobs: SavedJob[];
  setSavedJobs: (jobs: SavedJob[]) => void;

  // Applications
  applications: Application[];
  setApplications: (apps: Application[]) => void;

  // Profile
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;

  // Chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  chatContext: string;
  setChatMessages: (msgs: ChatMessage[]) => void;
  setIsChatLoading: (v: boolean) => void;
  setChatContext: (ctx: string) => void;

  // Cover Letter
  generatedCoverLetter: string | null;
  isGeneratingCoverLetter: boolean;
  setGeneratedCoverLetter: (cl: string | null) => void;
  setIsGeneratingCoverLetter: (v: boolean) => void;

  // Bookmarked job IDs (for quick UI check)
  bookmarkedIds: Set<string>;
  addBookmarkedId: (id: string) => void;
  removeBookmarkedId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeTab: 'search',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Job Search
  searchQuery: '',
  searchLocation: '',
  searchCategory: '',
  searchType: '',
  searchResults: [],
  isSearching: false,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchLocation: (q) => set({ searchLocation: q }),
  setSearchCategory: (q) => set({ searchCategory: q }),
  setSearchType: (q) => set({ searchType: q }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (v) => set({ isSearching: v }),

  // Job Detail
  selectedJob: null,
  jobDetail: null,
  isLoadingDetail: false,
  setSelectedJob: (job) => set({ selectedJob: job }),
  setJobDetail: (detail) => set({ jobDetail: detail }),
  setIsLoadingDetail: (v) => set({ isLoadingDetail: v }),

  // Saved Jobs
  savedJobs: [],
  setSavedJobs: (jobs) => set({ savedJobs: jobs, bookmarkedIds: new Set(jobs.map(j => j.id)) }),

  // Applications
  applications: [],
  setApplications: (apps) => set({ applications: apps }),

  // Profile
  profile: null,
  setProfile: (p) => set({ profile: p }),

  // Chat
  chatMessages: [],
  isChatLoading: false,
  chatContext: 'job-search',
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  setIsChatLoading: (v) => set({ isChatLoading: v }),
  setChatContext: (ctx) => set({ chatContext: ctx }),

  // Cover Letter
  generatedCoverLetter: null,
  isGeneratingCoverLetter: false,
  setGeneratedCoverLetter: (cl) => set({ generatedCoverLetter: cl }),
  setIsGeneratingCoverLetter: (v) => set({ isGeneratingCoverLetter: v }),

  // Bookmarked IDs
  bookmarkedIds: new Set<string>(),
  addBookmarkedId: (id) => set((state) => {
    const newSet = new Set(state.bookmarkedIds);
    newSet.add(id);
    return { bookmarkedIds: newSet };
  }),
  removeBookmarkedId: (id) => set((state) => {
    const newSet = new Set(state.bookmarkedIds);
    newSet.delete(id);
    return { bookmarkedIds: newSet };
  }),
}));
