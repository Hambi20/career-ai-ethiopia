'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, type JobResult, type Application, type ChatMessage } from '@/lib/store';
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
import { toast } from 'sonner';
import {
  Search, Bookmark, FileText, Bot, User, MapPin, Building2, Clock, DollarSign,
  ExternalLink, BookmarkCheck, Send, Plus, Trash2, Copy, Check, ChevronRight,
  Sparkles, Briefcase, GraduationCap, Award, X, Loader2, Globe, Mail, Phone,
  Calendar, Tag, MessageSquare, Target, TrendingUp, Zap
} from 'lucide-react';
import Image from 'next/image';

// ============== HEADER ==============
function Header() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">EthioJob Finder</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Job Assistant</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'search' as const, label: 'Search Jobs', icon: Search },
              { id: 'bookmarks' as const, label: 'Saved', icon: Bookmark },
              { id: 'applications' as const, label: 'Applications', icon: FileText },
              { id: 'ai-assistant' as const, label: 'AI Assistant', icon: Bot },
              { id: 'profile' as const, label: 'Profile', icon: User },
            ].map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(item.id)}
                className="gap-1.5"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="md:hidden">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['search', 'bookmarks', 'applications', 'ai-assistant', 'profile'].map((tab) => (
                  <SelectItem key={tab} value={tab}>
                    {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============== HERO ==============
function Hero() {
  const { setActiveTab } = useAppStore();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/hero-bg.png"
          alt="Ethiopian Job Market"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-emerald-900/30" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Job Search
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Find Your Dream Job <br />
            <span className="text-emerald-400">in Ethiopia</span>
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-lg">
            Search across Ethiopian job sites, get AI-powered cover letters, and track your applications — all in one smart platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => setActiveTab('search')}>
              <Search className="w-5 h-5" />
              Search Jobs Now
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2" onClick={() => setActiveTab('ai-assistant')}>
              <Bot className="w-5 h-5" />
              AI Career Coach
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-md">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">10+</div>
              <div className="text-xs text-gray-400">Job Sites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">AI</div>
              <div className="text-xs text-gray-400">Cover Letters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">Free</div>
              <div className="text-xs text-gray-400">To Use</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============== JOB SEARCH TAB ==============
function JobSearchTab() {
  const {
    searchQuery, searchLocation, searchCategory, searchType,
    searchResults, isSearching,
    setSearchQuery, setSearchLocation, setSearchCategory, setSearchType,
    setSearchResults, setIsSearching,
    selectedJob, setSelectedJob, jobDetail, isLoadingDetail, setJobDetail, setIsLoadingDetail,
    bookmarkedIds, addBookmarkedId, removeBookmarkedId,
  } = useAppStore();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a job title or keyword');
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: searchLocation || undefined,
          category: searchCategory || undefined,
          type: searchType || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results);
        toast.success(`Found ${data.results.length} job listings!`);
      } else {
        toast.error(data.error || 'Search failed');
      }
    } catch {
      toast.error('Failed to search jobs. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchLocation, searchCategory, searchType, setIsSearching, setSearchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleViewDetail = useCallback(async (job: JobResult) => {
    setSelectedJob(job);
    setIsLoadingDetail(true);
    setJobDetail(null);
    try {
      const res = await fetch('/api/jobs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: job.url }),
      });
      const data = await res.json();
      if (data.success) {
        setJobDetail(data.extractedData);
      } else {
        setJobDetail({
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          salary: job.salary,
          description: job.description,
          requirements: [],
          responsibilities: [],
          qualifications: [],
          deadline: job.deadline,
          contactEmail: null,
          contactPhone: null,
        });
      }
    } catch {
      toast.error('Failed to load job details');
    } finally {
      setIsLoadingDetail(false);
    }
  }, [setSelectedJob, setIsLoadingDetail, setJobDetail]);

  const handleBookmark = useCallback(async (job: JobResult) => {
    if (bookmarkedIds.has(job.id)) {
      try {
        await fetch(`/api/jobs/bookmark?id=${encodeURIComponent(job.id)}`, { method: 'DELETE' });
        removeBookmarkedId(job.id);
        toast.success('Job removed from saved');
      } catch {
        toast.error('Failed to remove job');
      }
    } else {
      try {
        const res = await fetch('/api/jobs/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job),
        });
        if (res.ok) {
          addBookmarkedId(job.id);
          toast.success('Job saved!');
        }
      } catch {
        toast.error('Failed to save job');
      }
    }
  }, [bookmarkedIds, addBookmarkedId, removeBookmarkedId]);

  const quickSearches = ['Software Developer', 'Accountant', 'Marketing Manager', 'Nurse', 'Civil Engineer', 'Data Analyst', 'HR Manager', 'Bank Officer'];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Job title, keyword, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <div className="relative sm:w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Location (e.g., Addis Ababa)"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[120px]"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={searchCategory} onValueChange={setSearchCategory}>
                <SelectTrigger className="w-40">
                  <Tag className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="IT">IT & Software</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Administration">Administration</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                </SelectContent>
              </Select>

              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-40">
                  <Clock className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Full-Time">Full-Time</SelectItem>
                  <SelectItem value="Part-Time">Part-Time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Searches */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground py-1">Popular:</span>
              {quickSearches.map((term) => (
                <Badge
                  key={term}
                  variant="outline"
                  className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300 transition-colors"
                  onClick={() => { setSearchQuery(term); }}
                >
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isSearching ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : hasSearched && searchResults.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Jobs Found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
        </Card>
      ) : hasSearched ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{searchResults.length}</span> results
            </p>
          </div>
          {searchResults.map((job, index) => (
            <Card key={job.id} className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-emerald-400">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="hidden sm:flex w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base leading-tight group-hover:text-emerald-600 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {job.company && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5" /> {job.company}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" /> {job.location}
                            </span>
                          )}
                          {job.type && (
                            <Badge variant="secondary" className="text-xs">
                              {job.type}
                            </Badge>
                          )}
                          {job.source && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe className="w-3 h-3" /> {job.source}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleBookmark(job)}
                          title={bookmarkedIds.has(job.id) ? 'Remove bookmark' : 'Save job'}
                        >
                          <BookmarkCheck className={`w-4 h-4 ${bookmarkedIds.has(job.id) ? 'text-emerald-600 fill-emerald-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetail(job)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {job.description}
                    </p>
                    {job.deadline && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                        <Calendar className="w-3 h-3" /> Deadline: {job.deadline}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Search Ethiopian Job Sites</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter a job title, keyword, or company name to search across EthioJobs, Mekanisa, Jobs.et, and more Ethiopian job sites.
          </p>
        </Card>
      )}

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            {isLoadingDetail ? (
              <div className="space-y-3">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">{jobDetail?.title || selectedJob?.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-3">
                  {jobDetail?.company && (
                    <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{jobDetail.company}</span>
                  )}
                  {jobDetail?.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{jobDetail.location}</span>
                  )}
                  {jobDetail?.type && <Badge variant="secondary">{jobDetail.type}</Badge>}
                  {jobDetail?.salary && (
                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{jobDetail.salary}</span>
                  )}
                  {jobDetail?.deadline && (
                    <span className="flex items-center gap-1 text-orange-500"><Calendar className="w-4 h-4" />{jobDetail.deadline}</span>
                  )}
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : jobDetail && (
            <div className="space-y-6 py-4">
              {/* Description */}
              {jobDetail.description && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> Job Description
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{jobDetail.description}</p>
                </div>
              )}

              {/* Requirements */}
              {jobDetail.requirements && jobDetail.requirements.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" /> Requirements
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {jobDetail.requirements.map((req, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Responsibilities */}
              {jobDetail.responsibilities && jobDetail.responsibilities.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" /> Responsibilities
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {jobDetail.responsibilities.map((resp, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Qualifications */}
              {jobDetail.qualifications && jobDetail.qualifications.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" /> Qualifications
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {jobDetail.qualifications.map((qual, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact */}
              {(jobDetail.contactEmail || jobDetail.contactPhone) && (
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <div className="flex flex-wrap gap-3">
                    {jobDetail.contactEmail && (
                      <a href={`mailto:${jobDetail.contactEmail}`} className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
                        <Mail className="w-4 h-4" /> {jobDetail.contactEmail}
                      </a>
                    )}
                    {jobDetail.contactPhone && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" /> {jobDetail.contactPhone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-3">
            {selectedJob && (
              <>
                <Button variant="outline" onClick={() => handleBookmark(selectedJob)}>
                  <BookmarkCheck className="w-4 h-4 mr-1" />
                  {bookmarkedIds.has(selectedJob.id) ? 'Saved' : 'Save Job'}
                </Button>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <a href={selectedJob.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Apply on Website
                  </a>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== BOOKMARKS TAB ==============
function BookmarksTab() {
  const { savedJobs, setSavedJobs, removeBookmarkedId, setActiveTab } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/jobs/bookmark');
        const data = await res.json();
        if (data.success) setSavedJobs(data.jobs);
      } catch {
        toast.error('Failed to load saved jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, [setSavedJobs]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/jobs/bookmark?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      removeBookmarkedId(id);
      const res = await fetch('/api/jobs/bookmark');
      const data = await res.json();
      if (data.success) setSavedJobs(data.jobs);
      toast.success('Job removed');
    } catch {
      toast.error('Failed to remove job');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4"><Skeleton className="h-20" /></Card>
        ))}
      </div>
    );
  }

  if (savedJobs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">No Saved Jobs</h3>
        <p className="text-muted-foreground mb-4">Save jobs you're interested in to track them here.</p>
        <Button onClick={() => setActiveTab('search')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Search className="w-4 h-4" /> Search for Jobs
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Saved Jobs ({savedJobs.length})</h3>
      </div>
      {savedJobs.map((job) => (
        <Card key={job.id} className="group hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm sm:text-base">{job.title}</h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  {job.company && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" /> {job.company}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> {job.location}
                    </span>
                  )}
                  {job.type && <Badge variant="secondary" className="text-xs">{job.type}</Badge>}
                  {job.deadline && (
                    <span className="text-xs text-orange-600">Deadline: {job.deadline}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="outline" size="sm">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(job.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============== APPLICATIONS TAB ==============
function ApplicationsTab() {
  const { applications, setApplications, setActiveTab } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newApp, setNewApp] = useState({ jobTitle: '', company: '', location: '', status: 'preparing', url: '', notes: '' });

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await fetch('/api/applications');
        const data = await res.json();
        if (data.success) setApplications(data.applications);
      } catch {
        toast.error('Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [setApplications]);

  const handleAdd = async () => {
    if (!newApp.jobTitle) {
      toast.error('Please enter a job title');
      return;
    }
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApp),
      });
      const data = await res.json();
      if (data.success) {
        setApplications([data.application, ...applications]);
        setShowAddDialog(false);
        setNewApp({ jobTitle: '', company: '', location: '', status: 'preparing', url: '', notes: '' });
        toast.success('Application added!');
      }
    } catch {
      toast.error('Failed to add application');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const app = applications.find(a => a.id === id);
      if (!app) return;
      const res = await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...app, status }),
      });
      const data = await res.json();
      if (data.success) {
        setApplications(applications.map(a => a.id === id ? data.application : a));
        toast.success('Status updated!');
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/applications?id=${id}`, { method: 'DELETE' });
      setApplications(applications.filter(a => a.id !== id));
      toast.success('Application deleted');
    } catch {
      toast.error('Failed to delete application');
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    preparing: { label: 'Preparing', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    interview: { label: 'Interview', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    offered: { label: 'Offered', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4"><Skeleton className="h-20" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">My Applications ({applications.length})</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" /> Add Application
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Application</DialogTitle>
              <DialogDescription>Track a new job application</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Job Title *</Label>
                <Input value={newApp.jobTitle} onChange={(e) => setNewApp({ ...newApp, jobTitle: e.target.value })} placeholder="e.g., Software Developer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company</Label>
                  <Input value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} placeholder="Company name" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={newApp.location} onChange={(e) => setNewApp({ ...newApp, location: e.target.value })} placeholder="e.g., Addis Ababa" />
                </div>
              </div>
              <div>
                <Label>Initial Status</Label>
                <Select value={newApp.status} onValueChange={(v) => setNewApp({ ...newApp, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Job URL</Label>
                <Input value={newApp.url} onChange={(e) => setNewApp({ ...newApp, url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={newApp.notes} onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })} placeholder="Any notes..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Application</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {applications.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Applications Yet</h3>
          <p className="text-muted-foreground mb-4">Track your job applications and their status here.</p>
          <Button onClick={() => setActiveTab('search')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Search className="w-4 h-4" /> Find Jobs to Apply
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const config = statusConfig[app.status] || statusConfig.preparing;
            return (
              <Card key={app.id} className="group hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base">{app.jobTitle}</h4>
                        <Badge className={`${config.color} text-xs border-0`}>{config.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        {app.company && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" /> {app.company}
                          </span>
                        )}
                        {app.location && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" /> {app.location}
                          </span>
                        )}
                        {app.appliedAt && (
                          <span className="text-xs text-muted-foreground">
                            Applied: {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {app.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{app.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Select value={app.status} onValueChange={(v) => handleUpdateStatus(app.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {app.url && (
                        <Button asChild variant="outline" size="icon" className="h-8 w-8">
                          <a href={app.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(app.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============== AI ASSISTANT TAB ==============
function AIAssistantTab() {
  const {
    chatMessages, isChatLoading, chatContext,
    setChatMessages, setIsChatLoading, setChatContext,
    generatedCoverLetter, isGeneratingCoverLetter,
    setGeneratedCoverLetter, setIsGeneratingCoverLetter,
    profile,
  } = useAppStore();
  const [message, setMessage] = useState('');
  const [coverLetterForm, setCoverLetterForm] = useState({ jobTitle: '', company: '', jobDescription: '' });
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [aiTab, setAiTab] = useState<'chat' | 'cover-letter'>('chat');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isChatLoading) return;
    const userMessage = message.trim();
    setMessage('');
    setIsChatLoading(true);

    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: userMessage, createdAt: new Date().toISOString() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: chatContext }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages([...updated, { id: `msg-${Date.now() + 1}`, role: 'assistant' as const, content: data.response, createdAt: new Date().toISOString() }]);
      }
    } catch {
      toast.error('Failed to get AI response');
    } finally {
      setIsChatLoading(false);
    }
  }, [message, isChatLoading, chatMessages, chatContext, setChatMessages, setIsChatLoading]);

  const handleGenerateCoverLetter = useCallback(async () => {
    if (!coverLetterForm.jobTitle || !coverLetterForm.company) {
      toast.error('Please enter job title and company name');
      return;
    }
    setIsGeneratingCoverLetter(true);
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coverLetterForm),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCoverLetter(data.coverLetter);
        toast.success('Cover letter generated!');
      }
    } catch {
      toast.error('Failed to generate cover letter');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }, [coverLetterForm, setIsGeneratingCoverLetter, setGeneratedCoverLetter]);

  const handleCopyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const quickQuestions = [
    'What are the best job search strategies in Ethiopia?',
    'How should I write my CV for Ethiopian employers?',
    'What salary should I expect for my role?',
    'How to prepare for Ethiopian job interviews?',
    'What skills are most in demand in Ethiopia?',
    'How to write a follow-up email after applying?',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI Career Assistant</h3>
          <p className="text-sm text-muted-foreground">Get personalized job search advice and generate cover letters</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={aiTab === 'chat' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAiTab('chat')}
          className="gap-1.5"
        >
          <MessageSquare className="w-4 h-4" /> Chat Advisor
        </Button>
        <Button
          variant={aiTab === 'cover-letter' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAiTab('cover-letter')}
          className="gap-1.5"
        >
          <FileText className="w-4 h-4" /> Cover Letter Generator
        </Button>
        <div className="ml-auto">
          <Select value={chatContext} onValueChange={setChatContext}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="job-search">Job Search</SelectItem>
              <SelectItem value="interview">Interview Prep</SelectItem>
              <SelectItem value="career">Career Advice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {aiTab === 'chat' ? (
        <Card className="overflow-hidden">
          <div className="h-[450px] flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h4 className="font-semibold mb-1">Ask Your AI Career Coach</h4>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    Get personalized advice for the Ethiopian job market. Ask about CV writing, interview tips, salary negotiation, and more.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickQuestions.map((q) => (
                      <Badge
                        key={q}
                        variant="outline"
                        className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300 transition-colors text-xs py-1.5 px-3 max-w-[250px]"
                        onClick={() => setMessage(q)}
                      >
                        {q}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="whitespace-pre-line">{msg.content}</p>
                        {msg.role === 'assistant' && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs opacity-60 hover:opacity-100" onClick={() => handleCopyText(msg.content)}>
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about jobs, CVs, interviews..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!message.trim() || isChatLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Cover Letter Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                AI Cover Letter Generator
              </CardTitle>
              <CardDescription>Fill in the details and let AI create a professional cover letter for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Job Title *</Label>
                <Input value={coverLetterForm.jobTitle} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, jobTitle: e.target.value })} placeholder="e.g., Software Developer" />
              </div>
              <div>
                <Label>Company Name *</Label>
                <Input value={coverLetterForm.company} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, company: e.target.value })} placeholder="e.g., Ethio Telecom" />
              </div>
              <div>
                <Label>Job Description (optional)</Label>
                <Textarea value={coverLetterForm.jobDescription} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, jobDescription: e.target.value })} placeholder="Paste the job description here for a more tailored cover letter..." rows={4} />
              </div>
              {profile && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  Using profile info: {profile.fullName || 'Not set'}
                </p>
              )}
              <Button
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCoverLetter}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {isGeneratingCoverLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
              </Button>
            </CardContent>
          </Card>

          {/* Cover Letter Result */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Generated Cover Letter</CardTitle>
                {generatedCoverLetter && (
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleCopyText(generatedCoverLetter)}>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedCoverLetter ? (
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-line text-sm leading-relaxed font-serif">{generatedCoverLetter}</div>
                </ScrollArea>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Your AI-generated cover letter will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============== PROFILE TAB ==============
function ProfileTab() {
  const { profile, setProfile } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    summary: '',
    skills: [] as string[],
    education: [] as { degree: string; school: string; year: string }[],
    experience: [] as { title: string; company: string; duration: string }[],
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
          setForm({
            fullName: data.profile.fullName || '',
            email: data.profile.email || '',
            phone: data.profile.phone || '',
            location: data.profile.location || '',
            title: data.profile.title || '',
            summary: data.profile.summary || '',
            skills: data.profile.skills ? JSON.parse(data.profile.skills) : [],
            education: data.profile.education ? JSON.parse(data.profile.education) : [],
            experience: data.profile.experience ? JSON.parse(data.profile.experience) : [],
          });
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [setProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success('Profile saved!');
      }
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
      setForm({ ...form, skills: [...form.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setForm({ ...form, skills: form.skills.filter(s => s !== skill) });
  };

  const addEducation = () => {
    setForm({ ...form, education: [...form.education, { degree: '', school: '', year: '' }] });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...form.education];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, education: updated });
  };

  const removeEducation = (index: number) => {
    setForm({ ...form, education: form.education.filter((_, i) => i !== index) });
  };

  const addExperience = () => {
    setForm({ ...form, experience: [...form.experience, { title: '', company: '', duration: '' }] });
  };

  const updateExperience = (index: number, field: string, value: string) => {
    const updated = [...form.experience];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, experience: updated });
  };

  const removeExperience = (index: number) => {
    setForm({ ...form, experience: form.experience.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
            {form.fullName ? form.fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{form.fullName || 'Your Name'}</h3>
            <p className="text-sm text-muted-foreground">{form.title || 'Set your job title'}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      <Separator />

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your full name" />
            </div>
            <div>
              <Label>Professional Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Software Engineer" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251 9XX XXX XXX" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Addis Ababa, Ethiopia" />
          </div>
          <div>
            <Label>Professional Summary</Label>
            <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Brief description of your professional background and career goals..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" /> Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill (e.g., JavaScript, Accounting)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            />
            <Button variant="outline" onClick={addSkill} disabled={!newSkill.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                {skill}
                <button onClick={() => removeSkill(skill)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {form.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">Add your skills to improve AI-generated cover letters</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" /> Education
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addEducation} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.education.map((edu, i) => (
            <div key={i} className="grid sm:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs">Degree</Label>
                <Input value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} placeholder="e.g., B.Sc. Computer Science" />
              </div>
              <div>
                <Label className="text-xs">School</Label>
                <Input value={edu.school} onChange={(e) => updateEducation(i, 'school', e.target.value)} placeholder="e.g., AAU" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Year</Label>
                  <Input value={edu.year} onChange={(e) => updateEducation(i, 'year', e.target.value)} placeholder="e.g., 2020" />
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive flex-shrink-0" onClick={() => removeEducation(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {form.education.length === 0 && (
            <p className="text-sm text-muted-foreground">No education entries yet</p>
          )}
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" /> Work Experience
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addExperience} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.experience.map((exp, i) => (
            <div key={i} className="grid sm:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs">Job Title</Label>
                <Input value={exp.title} onChange={(e) => updateExperience(i, 'title', e.target.value)} placeholder="e.g., Junior Developer" />
              </div>
              <div>
                <Label className="text-xs">Company</Label>
                <Input value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} placeholder="e.g., TechCorp" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Duration</Label>
                  <Input value={exp.duration} onChange={(e) => updateExperience(i, 'duration', e.target.value)} placeholder="e.g., 2022-2024" />
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive flex-shrink-0" onClick={() => removeExperience(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {form.experience.length === 0 && (
            <p className="text-sm text-muted-foreground">No experience entries yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== FEATURES SECTION ==============
function FeaturesSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">How EthioJob Finder Works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Three simple steps to land your dream job in Ethiopia</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Search className="w-8 h-8" />,
              title: 'Search Jobs',
              desc: 'Search across EthioJobs, Mekanisa, Jobs.et and more Ethiopian job sites simultaneously.',
              color: 'from-emerald-500 to-teal-600',
            },
            {
              icon: <Sparkles className="w-8 h-8" />,
              title: 'AI Assistance',
              desc: 'Get AI-powered cover letters, interview tips, and career advice tailored for Ethiopian market.',
              color: 'from-violet-500 to-purple-600',
            },
            {
              icon: <TrendingUp className="w-8 h-8" />,
              title: 'Track Applications',
              desc: 'Track all your applications, set statuses, and stay organized throughout your job search.',
              color: 'from-orange-500 to-amber-600',
            },
          ].map((feature, i) => (
            <Card key={i} className="text-center hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-4 text-white`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============== FOOTER ==============
function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">EthioJob Finder</span>
            <span className="text-xs text-muted-foreground">— AI-Powered Ethiopian Job Search</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Searches Ethiopian job sites: EthioJobs, Mekanisa, Jobs.et & more</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============== MAIN PAGE ==============
export default function Home() {
  const { activeTab } = useAppStore();
  const isAppView = activeTab !== 'search';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {!isAppView && <Hero />}

      <main className={`flex-1 ${!isAppView ? '' : 'max-w-4xl mx-auto w-full'}`}>
        <div className={`${!isAppView ? 'max-w-4xl mx-auto px-4 sm:px-6 py-8' : 'px-4 sm:px-6 py-6'}`}>
          {activeTab === 'search' && !isAppView ? (
            <div className="space-y-8">
              <JobSearchTab />
              <FeaturesSection />
            </div>
          ) : activeTab === 'search' && isAppView ? (
            <JobSearchTab />
          ) : activeTab === 'bookmarks' ? (
            <BookmarksTab />
          ) : activeTab === 'applications' ? (
            <ApplicationsTab />
          ) : activeTab === 'ai-assistant' ? (
            <AIAssistantTab />
          ) : activeTab === 'profile' ? (
            <ProfileTab />
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
