import { NextRequest, NextResponse } from 'next/server';
import { createApplication, findApplicationByUrl } from '@/lib/unified-store';

// ====== IN-MEMORY SEARCH STATE ======
interface SearchState {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  category: string;
  stepsTotal: number;
  stepsDone: number;
  logs: string[];
  totalFound: number;
  totalExpired: number;
  totalMatched: number;
  totalSaved: number;
  autoApproved: number;
  autoSubmitted: number;
  error?: string;
}

const activeSearches = new Map<string, SearchState>();

// ====== MOCK SEARCH CATEGORIES ======
const MOCK_RESULTS: Record<string, Array<{ name: string; url: string; snippet: string; host_name: string }>> = {
  ethiopia: [
    { name: 'Sales Manager', url: 'https://ethiojobs.net/sales-manager-001', snippet: 'Looking for experienced Sales Manager. B2B sales, territory management.', host_name: 'ethiojobs.net' },
    { name: 'Marketing Manager', url: 'https://ethiojobs.net/marketing-manager-002', snippet: 'Marketing Manager needed for leading company. Digital marketing experience required.', host_name: 'ethiojobs.net' },
    { name: 'Business Development Officer', url: 'https://mekanisa.com/bdo-003', snippet: 'Business Development Officer - market expansion, new account acquisition.', host_name: 'mekanisa.com' },
  ],
  linkedin: [
    { name: 'Area Sales Manager - Ethiopia', url: 'https://linkedin.com/jobs/asm-001', snippet: 'Area Sales Manager position in Addis Ababa. FMCG experience preferred.', host_name: 'linkedin.com' },
    { name: 'Commercial Manager', url: 'https://linkedin.com/jobs/cm-002', snippet: 'Commercial Manager role. Strategy, planning, and team leadership.', host_name: 'linkedin.com' },
  ],
  remote: [
    { name: 'Remote Data Entry Specialist', url: 'https://remoteok.com/data-entry-001', snippet: 'Work from home data entry position. Africa-based candidates welcome.', host_name: 'remoteok.com' },
    { name: 'Virtual Assistant - Africa', url: 'https://weworkremotely.com/va-001', snippet: 'Virtual assistant needed. Administrative support, data management.', host_name: 'weworkremotely.com' },
  ],
  all: [],
};

// Fill 'all' with combined results
MOCK_RESULTS.all = [...MOCK_RESULTS.ethiopia, ...MOCK_RESULTS.linkedin, ...MOCK_RESULTS.remote];

function extractCompany(snippet: string, title: string): string {
  const combined = `${title} ${snippet}`;
  const patterns = [
    /(?:at|@|by|from)\s+([A-Z][A-Za-z&\s]{2,30}?)(?:\s*[-–|,.\n:;]|\s+(?:is|hiring|needs|looking|seeks)|$)/,
    /([A-Z][A-Za-z&\s]{2,30}?)\s+(?:is hiring|needs|looking for|seeks|wants|invites)/i,
  ];
  for (const pat of patterns) {
    const m = combined.match(pat);
    if (m && m[1]) {
      const name = m[1].trim();
      if (name.length > 2 && name.length < 40) return name;
    }
  }
  return '';
}

// ====== BACKGROUND MOCK SEARCH RUNNER ======
async function runSearchInBackground(searchId: string, state: SearchState) {
  try {
    const results = MOCK_RESULTS[state.category] || MOCK_RESULTS.all;
    state.stepsTotal = results.length + 1;
    state.logs.push(`🚀 Mock search started for [${state.category}] with ${results.length} sample results`);

    const seen = new Set<string>();

    for (let i = 0; i < results.length; i++) {
      const job = results[i];
      state.stepsDone = i + 1;

      if (!job.url || seen.has(job.url)) continue;
      seen.add(job.url);

      const existing = findApplicationByUrl(job.url);
      if (existing) {
        state.logs.push(`  ↳ Already tracked: "${job.name.substring(0, 40)}"`);
        state.totalFound++;
        continue;
      }

      const score = Math.floor(Math.random() * 35) + 55;
      const company = extractCompany(job.snippet, job.name) || job.host_name;

      let status: string = 'pending_review';
      let autoAction = '';
      if (score >= 80) { status = 'submitted'; autoAction = 'auto-submitted'; state.autoSubmitted++; }
      else if (score >= 60) { status = 'approved'; autoAction = 'auto-approved'; state.autoApproved++; }

      createApplication({
        jobTitle: job.name,
        company,
        url: job.url,
        source: job.host_name,
        location: 'Addis Ababa',
        status,
        matchScore: score,
        matchReasoning: 'Keyword match from search results',
        jobDescription: job.snippet,
        coverLetter: status === 'approved' || status === 'submitted' ? 'Cover letter generated for this application.' : 'Click "Preview PDF" to generate cover letter',
        notes: `Found via: ${state.category} search | Source: ${job.host_name} | Match: ${score}% | ${autoAction || 'Awaiting manual review'}`,
        appliedAt: status === 'submitted' ? new Date().toISOString() : null,
      });
      state.totalFound++;
      state.totalMatched++;
      state.totalSaved++;
      const icon = autoAction === 'auto-submitted' ? '🚀' : autoAction === 'auto-approved' ? '✅' : '📋';
      state.logs.push(`  ${icon} Saved (${score}%): "${job.name.substring(0, 40)}" — ${autoAction || 'pending review'}`);
    }

    state.stepsDone = results.length + 1;
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.logs.push(`\n🎉 COMPLETE! Found: ${state.totalFound} | Matched: ${state.totalMatched} | Saved: ${state.totalSaved}`);
  } catch (err) {
    state.status = 'failed';
    state.error = String(err);
    state.logs.push(`\n❌ Failed: ${String(err).substring(0, 300)}`);
  }
}

// ====== API ROUTES ======

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';

    // Prevent concurrent searches
    for (const [, state] of activeSearches) {
      if (state.status === 'running') {
        return NextResponse.json({
          success: true,
          alreadyRunning: true,
          searchId: state.id,
          message: 'A search is already running',
        });
      }
    }

    const searchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const results = MOCK_RESULTS[category] || MOCK_RESULTS.all;

    const state: SearchState = {
      id: searchId,
      status: 'running',
      startedAt: new Date().toISOString(),
      category,
      stepsTotal: results.length + 1,
      stepsDone: 0,
      logs: [`[${new Date().toISOString()}] Search started [${category}]`, `🔍 ${results.length} mock results queued`],
      totalFound: 0,
      totalExpired: 0,
      totalMatched: 0,
      totalSaved: 0,
      autoApproved: 0,
      autoSubmitted: 0,
    };

    activeSearches.set(searchId, state);

    // Run in background
    runSearchInBackground(searchId, state).catch(err => {
      state.status = 'failed';
      state.error = String(err);
    });

    return NextResponse.json({
      success: true,
      searchId,
      message: `Search started with ID ${searchId}`,
      category,
      stepsTotal: state.stepsTotal,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err).substring(0, 200) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchId = searchParams.get('searchId');

  if (searchId) {
    const state = activeSearches.get(searchId);
    if (!state) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      searchId: state.id,
      status: state.status,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      category: state.category,
      progress: { stepsTotal: state.stepsTotal, stepsDone: state.stepsDone },
      results: {
        totalFound: state.totalFound,
        totalExpired: state.totalExpired,
        totalMatched: state.totalMatched,
        totalSaved: state.totalSaved,
        autoApproved: state.autoApproved,
        autoSubmitted: state.autoSubmitted,
      },
      logs: state.logs,
      error: state.error,
    });
  }

  const searches = Array.from(activeSearches.values())
    .slice(-5)
    .map(s => ({
      id: s.id,
      status: s.status,
      category: s.category,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      totalSaved: s.totalSaved,
      autoApproved: s.autoApproved,
      autoSubmitted: s.autoSubmitted,
    }));

  return NextResponse.json({ success: true, recentSearches: searches });
}