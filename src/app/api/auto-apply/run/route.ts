import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// Hambisa's full profile for matching and cover letters
const HAMBISA_CV = `
Name: Hambisa Bekuma Tefera
Phone: +251 952 341 525
Email: hambisa1992@gmail.com
Location: Addis Ababa, Ethiopia
Title: Sales Manager (8+ years experience)

ABOUT:
Over eight years in sales across Eastern Ethiopia and Addis Ababa. Managed 150+ B2B accounts at Romel General Trading. Built marketing/sales dept from zero at Deran PLC with 20% revenue growth. Led marketing at OL-BRIGHT College with 30%+ enrollment increase. Managed territory across 8+ cities at SMADL Communication.

SKILLS: Territory Management, Route-to-Market, Market Expansion, New Account Opening, Field Team Leadership, Negotiation & Deal Closing, B2B Account Management, Distributor & Channel Development, Sales Planning & Forecasting, Market Intelligence, Excel & Reporting, Marketing Strategy, Customer Retention

EXPERIENCE:
1. Route Sales Representative - Romel General Trading (Jan 2026-Present): 150+ B2B accounts, weekly route, new accounts monthly
2. Marketing Manager - OL-BRIGHT International College (Dec 2022-Nov 2025): 30%+ enrollment growth, 2 branches opened
3. Marketing & Sales Manager - Deran PLC (Dec 2020-Nov 2022): Built dept from zero, 20% revenue growth in 2 years
4. Territory Sales Manager - SMADL Communication Terminal Factory PLC (Jul 2016-Nov 2020): 8+ cities, hired & trained reps

EDUCATION: MBA (2018), BSc Agribusiness (2014)
LANGUAGES: Amharic (Native), English (Professional), Afaan Oromo (Fluent), Somali (Conversational)
`;

// Top Ethiopian job sites for 1-2 targeted queries only
const ETHIO_SITES = ['ethiojobs.net', 'mekanisa.com', 'jobs.et', 'addisjobs.com', 'jobwebethiopia.com', 'ethiopianjobs.com', 'ethiocareers.com', 'geezjob.com'];
const ALL_KNOWN_SITES = [...ETHIO_SITES, 'harmejobs.com', 'ethiovacancy.com', 'reporterethiopia.com', 'cvbankethiopia.com', 'vacancyeth.com', 'habeshalinks.com', 'zamejobs.com', 'hiredet.com'];
const LINKEDIN_REMOTE_SITES = ['linkedin.com', 'remoteok.com', 'weworkremotely.com', 'upwork.com', 'indeed.com'];

function buildSiteFilter(sites: string[]): string {
  return ' site:' + sites.slice(0, 3).join(' OR site:');
}

// ====== SEARCH QUERIES (optimized: fewer queries, better results) ======
const SEARCH_QUERIES = [
  // Ethiopian job sites — batch 1 (top sites filter)
  'sales manager Ethiopia 2025 2026 job vacancy',
  'marketing manager Addis Ababa job opening',
  'area sales manager Ethiopia vacancy',
  'sales representative Addis Ababa Ethiopia',
  'business development manager Ethiopia job',
  'commercial manager Ethiopia job vacancy',
  'sales executive Addis Ababa vacancy',
  'brand manager Ethiopia marketing vacancy',
  // Ethiopian job sites — batch 2 (more sites filter)
  'sales supervisor Ethiopia job opening',
  'marketing officer Addis Ababa vacancy',
  'territory sales manager Ethiopia career',
  'account manager Ethiopia sales vacancy',
  // Broad / Telegram (no filter)
  'telegram job vacancy Ethiopia sales marketing',
  'Ethiopia sales marketing manager job hiring 2025 2026',
  'latest job vacancy sales Ethiopia this week',
  // LinkedIn
  'linkedin sales manager Ethiopia jobs hiring',
  'linkedin marketing manager Addis Ababa jobs',
  // Remote data entry
  'remote data entry job Ethiopia hiring now',
  'data entry remote work Africa available',
  'work from home data entry Ethiopia Addis Ababa',
  'virtual assistant data entry remote Africa hiring',
];

const BATCH1_QUERIES = SEARCH_QUERIES.slice(0, 8);   // Top Ethiopian sites filter
const BATCH2_QUERIES = SEARCH_QUERIES.slice(8, 11);   // More Ethiopian sites filter
const BROAD_QUERIES = SEARCH_QUERIES.slice(11, 14);   // No filter
const LINKEDIN_QUERIES = SEARCH_QUERIES.slice(14, 16);  // LinkedIn filter
const REMOTE_QUERIES = SEARCH_QUERIES.slice(16);       // No filter

interface SearchResult {
  url: string; name: string; snippet: string; host_name: string; date?: string;
}

function extractCompany(text: string, title: string): string {
  const combined = `${title} ${text}`;
  const patterns = [
    /(?:at|@|by|from)\s+([A-Z][A-Za-z&\s]{2,30}?)(?:\s*[-–|,.\n:;]|\s+(?:is|hiring|needs|looking|seeks)|$)/,
    /([A-Z][A-Za-z&\s]{2,30}?)\s+(?:is hiring|needs|looking for|seeks|wants|invites)/i,
    /(?:company|organization|firm)[:\s]*([A-Z][A-Za-z&\s]{2,30}?)(?:\s*[-–|,.\n:;]|$)/i,
  ];
  for (const pat of patterns) {
    const m = combined.match(pat);
    if (m && m[1]) {
      const name = m[1].trim();
      const bad = ['Ethiopia', 'Addis Ababa', 'Job', 'Vacancy', 'Career', 'Hiring', 'View', 'Apply', 'Click', 'Read', 'More', 'Details', 'Full', 'Description', 'Telegram', 'Channel', 'Group'];
      if (!bad.includes(name) && name.length > 2) return name;
    }
  }
  return null;
}

function getQueriesForCategory(category: string | null): string[] {
  if (category === 'linkedin') return LINKEDIN_QUERIES;
  if (category === 'remote') return REMOTE_QUERIES;
  if (category === 'ethiopia') return [...BATCH1_QUERIES, ...BATCH2_QUERIES];
  return SEARCH_QUERIES; // all
}

function getSiteFilter(qi: number): string {
  // No site filter — let web search find results naturally across all sites
  // The web search API returns better results without complex site: operators
  return '';
}

// ====== IN-MEMORY SEARCH STATE (async) ======
interface SearchState {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  category: string;
  queriesTotal: number;
  queriesDone: number;
  logs: string[];
  totalFound: number;
  totalExpired: number;
  totalMatched: number;
  totalSaved: number;
  error?: string;
}

const activeSearches = new Map<string, SearchState>();

// Global rate limit tracking
let lastRateLimitTime = 0;
let rateLimitCooldownUntil = 0;

// ====== WEB SEARCH WITH RATE LIMIT RETRY ======
async function webSearchWithRetry(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  query: string,
  num: number,
  recencyDays: number,
  maxRetries = 3
): Promise<SearchResult[]> {
  // Global cooldown check
  const now = Date.now();
  if (now < rateLimitCooldownUntil) {
    const waitSecs = Math.ceil((rateLimitCooldownUntil - now) / 1000);
    console.log(`[Rate Limit] Global cooldown: waiting ${waitSecs}s...`);
    await new Promise(r => setTimeout(r, rateLimitCooldownUntil - now));
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const results = await zai.functions.invoke('web_search', {
        query,
        num,
        recency_days: recencyDays,
      }) as SearchResult[];
      return results || [];
    } catch (err: unknown) {
      const errMsg = String(err);
      const isRateLimit = errMsg.includes('429') || errMsg.includes('Too many requests');
      if (isRateLimit && attempt < maxRetries) {
        const wait = 20000 * attempt; // 20s, 40s, 60s
        rateLimitCooldownUntil = Date.now() + wait + 5000;
        console.log(`[Rate Limit] Global cooldown set, waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      console.error(`[Search Error] ${errMsg}`);
      if (isRateLimit) {
        // All retries exhausted due to rate limit — set long cooldown
        rateLimitCooldownUntil = Date.now() + 120000; // 2 minute cooldown
        console.log('[Rate Limit] All retries exhausted, 2-minute global cooldown set');
      }
      return [];
    }
  }
  return [];
}

// ====== LLM EVALUATION ======
async function evaluateJob(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  job: SearchResult
): Promise<{
  score: number; isExpired: boolean; deadline: string | null;
  reasoning: string; positionMatch: string; isRelated: boolean;
}> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const result = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert Ethiopian recruitment analyst. Evaluate whether a job matches a candidate.

Today: ${today}

Respond with JSON only:
- "score": number 0-100
- "isExpired": boolean
- "deadline": string or null
- "reasoning": string (2 sentences)
- "positionMatch": "exact_match"|"strong_match"|"related_role"|"weak_match"
- "isRelated": boolean

Jobs related to sales, marketing, business dev, data entry, remote work, virtual assistant, clerical, admin are "related". Remote data entry and work-from-home should be "related". Be generous. Return ONLY JSON.`
        },
        {
          role: 'user',
          content: `CANDIDATE:\n${HAMBISA_CV}\n\nJOB:\n- Title: ${job.name}\n- Source: ${job.host_name}\n- URL: ${job.url}\n- Snippet: ${job.snippet}\n- Date: ${job.date || 'N/A'}`
        }
      ],
      thinking: { type: 'disabled' },
    });
    const text = (result.choices[0]?.message?.content || '').trim()
      .replace(/```json?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    const parsed = JSON.parse(text);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      isExpired: Boolean(parsed.isExpired),
      deadline: parsed.deadline || null,
      reasoning: String(parsed.reasoning || ''),
      positionMatch: String(parsed.positionMatch || 'weak_match'),
      isRelated: Boolean(parsed.isRelated),
    };
  } catch {
    return { score: 0, isExpired: false, deadline: null, reasoning: 'Eval failed', positionMatch: 'weak_match', isRelated: false };
  }
}

// ====== BACKGROUND SEARCH RUNNER ======
async function runSearchInBackground(searchId: string, state: SearchState) {
  try {
    const zai = await ZAI.create();
    const seen = new Set<string>();
    const queries = getQueriesForCategory(
      state.category === 'all' ? null : state.category
    );

    state.logs.push(`🔍 Starting search: ${queries.length} queries [${state.category}]`);

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi];
      const siteFilter = getSiteFilter(qi);
      const isBroad = qi > 0; // First query has filter, rest are broad

      state.logs.push(`\n[${qi + 1}/${queries.length}] "${query.substring(0, 50)}..."`);

      // Web search with retry
      const results = await webSearchWithRetry(zai, `${query}${siteFilter}`, isBroad ? 5 : 6, 45);
      state.queriesDone = qi + 1;

      let found = 0;
      for (const item of results) {
        if (!item || seen.has(item.url)) continue;
        seen.add(item.url);
        if (!item.snippet || item.snippet.length < 30) continue;
        if (item.host_name?.includes('facebook.com') || item.host_name?.includes('twitter.com') || item.host_name?.includes('instagram.com')) continue;

        state.totalFound++;
        found++;

        try {
          // LLM evaluation
          const eval_ = await evaluateJob(zai, item);
          state.logs.push(`  "${item.name.substring(0, 45)}" → ${eval_.score}% ${eval_.isExpired ? '⛔EXPIRED' : eval_.isRelated ? '✓related' : '✗skip'}`);

          if (eval_.isExpired) { state.totalExpired++; continue; }
          if (eval_.score < 40 || !eval_.isRelated) continue;

          state.totalMatched++;

          // Check duplicate
          const existing = await db.application.findFirst({ where: { url: item.url } });
          if (existing) { state.logs.push(`  ↳ Already tracked`); continue; }

          // Generate cover letter
          let coverLetter = 'Cover letter pending';
          try {
            const clResult = await zai.chat.completions.create({
              messages: [
                { role: 'assistant', content: 'Write a professional 250-350 word cover letter for Ethiopian job application. Reference the candidate\'s specific experience. Include contact info at top. Follow Ethiopian business norms. Return ONLY the letter text, no preamble.' },
                { role: 'user', content: `Candidate:\n${HAMBISA_CV}\nPosition: ${item.name}\nCompany: ${extractCompany(item.snippet, item.name) || item.host_name}\nMatch: ${eval_.reasoning}\n\nWrite the cover letter:` },
              ],
              thinking: { type: 'disabled' },
            });
            coverLetter = clResult.choices[0]?.message?.content || coverLetter;
          } catch { /* keep default */ }

          // Save to DB
          await db.application.create({
            data: {
              jobTitle: item.name,
              company: extractCompany(item.snippet, item.name),
              url: item.url,
              source: item.host_name,
              location: 'Addis Ababa',
              status: 'pending_review',
              matchScore: eval_.score,
              matchReasoning: eval_.reasoning,
              jobDeadline: eval_.deadline,
              jobDescription: item.snippet,
              coverLetter,
              notes: `Pending review | Match: ${eval_.score}/100 | Position: ${eval_.positionMatch} | Query: "${query.substring(0, 40)}"`,
            },
          });
          state.totalSaved++;
          state.logs.push(`  ✅ Saved: "${item.name.substring(0, 40)}"`);
        } catch (e) {
          state.logs.push(`  Error: ${String(e).substring(0, 60)}`);
        }

        // Throttle between LLM calls (5 seconds)
        await new Promise(r => setTimeout(r, 5000));
      }

      state.logs.push(`  → ${found} results`);

      // Delay between search queries (15 seconds to avoid rate limits)
      await new Promise(r => setTimeout(r, 15000));
    }

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.logs.push(`\n✅ Done! Found: ${state.totalFound} | Expired: ${state.totalExpired} | Matched: ${state.totalMatched} | Saved: ${state.totalSaved}`);
  } catch (err) {
    state.status = 'failed';
    state.error = String(err);
    state.logs.push(`❌ Failed: ${String(err).substring(0, 100)}`);
  }
}

// ====== API ROUTES ======

// POST: Start a new async search
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';

  // Check if already running
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

  // Create new search
  const searchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const state: SearchState = {
    id: searchId,
    status: 'running',
    startedAt: new Date().toISOString(),
    category,
    queriesTotal: getQueriesForCategory(category, 'full').length,
    queriesDone: 0,
    logs: [`[${new Date().toISOString()}] Search started [${category}]`],
    totalFound: 0,
    totalExpired: 0,
    totalMatched: 0,
    totalSaved: 0,
  };

  activeSearches.set(searchId, state);

  // Run in background (fire and forget)
  runSearchInBackground(searchId, state).catch(err => {
    console.error('[Background Search] Fatal error:', err);
    state.status = 'failed';
    state.error = String(err);
  });

  return NextResponse.json({
    success: true,
    searchId,
    message: `Search started with ID ${searchId}`,
    category,
  });
}

// GET: Poll search status
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
      progress: { queriesTotal: state.queriesTotal, queriesDone: state.queriesDone },
      results: { totalFound: state.totalFound, totalExpired: state.totalExpired, totalMatched: state.totalMatched, totalSaved: state.totalSaved },
      logs: state.logs,
      error: state.error,
    });
  }

  // No searchId — return list of recent searches
  const searches = Array.from(activeSearches.values())
    .slice(-5)
    .map(s => ({
      id: s.id,
      status: s.status,
      category: s.category,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      totalSaved: s.totalSaved,
    }));

  return NextResponse.json({ success: true, recentSearches: searches });
}
