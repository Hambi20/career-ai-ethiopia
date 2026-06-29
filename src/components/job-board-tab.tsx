'use client';

import { useState, useMemo } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, MapPin, Bookmark, BookmarkCheck, ExternalLink,
  Building2, Briefcase, DollarSign, Loader2, Globe, Star
} from 'lucide-react';
import { toast } from 'sonner';

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  source: string;
  url: string | null;
  bookmarked?: boolean;
}

const SAMPLE_JOBS: JobItem[] = [
  { id: '1', title: 'Senior Software Engineer', company: 'Ethio Telecom', location: 'Addis Ababa', salary: 'ETB 80,000 - 120,000', source: 'EthioJobs', url: '#' },
  { id: '2', title: 'Product Manager', company: 'Dashen Bank', location: 'Addis Ababa', salary: 'ETB 60,000 - 90,000', source: 'Mekanisa', url: '#' },
  { id: '3', title: 'Data Analyst', company: 'Safaricom Ethiopia', location: 'Addis Ababa', salary: 'ETB 50,000 - 70,000', source: 'LinkedIn', url: '#' },
  { id: '4', title: 'Frontend Developer', company: 'Gebeya Incubator', location: 'Addis Ababa', salary: null, source: 'RemoteOK', url: '#' },
  { id: '5', title: 'DevOps Engineer', company: 'CTA Ethiopia', location: 'Hawassa', salary: 'ETB 55,000 - 80,000', source: 'EthioJobs', url: '#' },
];

const sourceColor = (source: string) => {
  if (source.includes('LinkedIn')) return 'bg-sky-100 text-sky-800';
  if (source.includes('EthioJobs')) return 'bg-emerald-100 text-emerald-800';
  if (source.includes('RemoteOK')) return 'bg-violet-100 text-violet-800';
  return 'bg-gray-100 text-gray-800';
};

export function JobBoardTab() {
  const { tabData } = useBotData();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const jobsSummary = tabData.jobsSummary;
  const totalJobs = jobsSummary?.totalJobs ?? 0;

  const filteredJobs = useMemo(() => {
    return SAMPLE_JOBS.filter(job => {
      const q = search.toLowerCase();
      const matchesSearch = !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q);
      const matchesLocation = !locationFilter || job.location.toLowerCase().includes(locationFilter.toLowerCase());
      return matchesSearch && matchesLocation;
    });
  }, [search, locationFilter]);

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info('Bookmark removed'); }
      else { next.add(id); toast.success('Job bookmarked'); }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {totalJobs > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> {totalJobs} jobs indexed
          </Badge>
          {jobsSummary?.topSource && (
            <Badge variant="outline" className="gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" /> Top: {jobsSummary.topSource}
            </Badge>
          )}
        </div>
      )}

      {/* Search & Filter */}
      <Card className="border-emerald-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title or company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 border-emerald-200"
              />
            </div>
            <div className="relative sm:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter location..."
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="pl-9 border-emerald-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Listings */}
      {filteredJobs.length > 0 ? (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <Card key={job.id} className="border-emerald-100 hover:border-emerald-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-semibold">{job.title}</h4>
                        <Badge className={`text-[10px] border-0 ${sourceColor(job.source)}`}>{job.source}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.company}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                        {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{job.salary}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => toggleBookmark(job.id)} className="h-8 w-8 p-0">
                        {bookmarks.has(job.id) ? <BookmarkCheck className="w-4 h-4 text-emerald-600" /> : <Bookmark className="w-4 h-4" />}
                      </Button>
                      {job.url && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                          <a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Search for jobs above</p>
            <p className="text-xs text-muted-foreground mt-1">Try different keywords or adjust the location filter</p>
          </CardContent>
        </Card>
      )}

      {bookmarks.size > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          <BookmarkCheck className="w-3.5 h-3.5 inline text-emerald-600" /> {bookmarks.size} job{bookmarks.size > 1 ? 's' : ''} bookmarked
        </div>
      )}
    </div>
  );
}