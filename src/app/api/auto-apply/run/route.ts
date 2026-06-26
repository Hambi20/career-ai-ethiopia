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

// ====== GLOBAL RATE LIMITER ======
let global429Cooldown = 0;
let lastApiCall = 0;
const MIN_INTERVAL = 20000; // 20s between ANY SDK calls

async function waitForRateLimit(): Promise<void> {
  // Check 429 cooldown
  const now = Date.now();
  if (now < global429Cooldown) {
    const wait = global429Cooldown - now + 2000;
    console.log(`[RateLimit] 429 cooldown, waiting ${Math.ceil(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  // Standard interval
  const elapsed = Date.now() - lastApiCall;
  if (elapsed < MIN_INTERVAL) {
    const wait = MIN_INTERVAL - elapsed;
    console.log(`[RateLimit] Standard wait ${Math.ceil(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  lastApiCall = Date.now();
}

// ====== SAFE SDK CALL ======
async function safeSdkCall(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  await waitForRateLimit();
  try {
    return await zai.functions.invoke(fn, args);
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes('429')) {
      global429Cooldown = Date.now() + 120000; // 2 min cooldown
      console.log(`[429] ${fn} rate limited, 2-min cooldown`);
    } else {
      console.log(`[SDK] ${fn} error: ${msg.substring(0, 100)}`);
    }
    return null;
  }
}

async function safeLlmCall(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  system: string,
  user: string,
): Promise<string | null> {
  await waitForRateLimit();
  try {
    const result = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: system },
        { role: 'user', content: user },
      ],
      thinking: { type: 'disabled' },
    });
    return result.choices[0]?.message?.content || null;
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes('429')) {
      global429Cooldown = Date.now() + 120000;
      console.log(`[429] LLM rate limited, 2-min cooldown`);
    } else {
      console.log(`[LLM] Error: ${msg.substring(0, 100)}`);
    }
    return null;
  }
}

// ====== SEARCH CONFIG (ultra-lean: max 3 API calls per category) ======
const SEARCH_CONFIG: Record<string, { sites: { name: string; url: string }[]; queries: string[] }> = {
  ethiopia: {
    sites: [
      { name: 'EthioJobs', url: 'https://ethiojobs.net/' },
      { name: 'Mekanisa', url: 'https://mekanisa.com/' },
    ],
    queries: ['Ethiopia sales marketing manager job vacancy 2025 2026'],
  },
  linkedin: {
    sites: [],
    queries: ['site:linkedin.com/jobs Ethiopia sales marketing manager hiring'],
  },
  remote: {
    sites: [
      { name: 'RemoteOK', url: 'https://remoteok.com/remote-data-entry-jobs' },
    ],
    queries: ['remote data entry job hiring now 2025 2026'],
  },
  all: {
    sites: [
      { name: 'EthioJobs', url: 'https://ethiojobs.net/' },
      { name: 'RemoteOK', url: 'https://remoteok.com/remote-data-entry-jobs' },
    ],
    queries: ['Ethiopia sales marketing job vacancy 2025 2026', 'remote data entry job hiring now'],
  },
};

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
  error?: string;
}

const activeSearches = new Map<string, SearchState>();

// ====== SCRAPE + EXTRACT + EVALUATE IN ONE LLM CALL ======
async function scrapeAndEvaluate(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  siteName: string,
  url: string,
): Promise<SearchResult[]> {
  // Step 1: Read the page
  const pageResult = await safeSdkCall(zai, 'page_reader', { url }) as {
    data?: { title: string; html: string; url: string };
  } | null;

  if (!pageResult?.data?.html) {
    return [];
  }

  const text = pageResult.data.html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 200) return [];

  // Step 2: Extract + evaluate jobs in a single LLM call
  const llmResult = await safeLlmCall(zai,
    `You are a job search expert. Given a web page from "${siteName}", extract ALL real job listings and evaluate them against a candidate.

CANDIDATE PROFILE:
${HAMBISA_CV}

For EACH job listing found, return a JSON object with:
- "name": exact job title
- "url": full URL (construct from base ${url} if needed)
- "snippet": brief description (50-200 chars)
- "host_name": "${new URL(url).hostname}"
- "score": 0-100 match score (be generous, sales/marketing/data entry/remote work all relevant)
- "isExpired": boolean (check for past deadlines)
- "isRelated": boolean (true for any remotely relevant job)
- "reasoning": why this matches (1 sentence)

Return a JSON array of matching jobs (score >= 35 and isRelated). If no jobs found, return [].
Return ONLY the JSON array, no other text.`,
    `Page title: "${pageResult.data.title}"\nURL: ${url}\n\nPage content:\n${text.substring(0, 10000)}\n\nExtract and evaluate all job listings:`
  );

  if (!llmResult) return [];

  try {
    const start = llmResult.indexOf('[');
    const end = llmResult.lastIndexOf(']');
    if (start === -1 || end === -1) return [];

    const parsed = JSON.parse(llmResult.substring(start, end + 1));
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: Record<string, unknown>) => ({
      url: String(item.url || url),
      name: String(item.name || 'Unknown'),
      snippet: String(item.snippet || ''),
      host_name: String(item.host_name || new URL(url).hostname),
    }));
  } catch {
    return [];
  }
}

// ====== WEB SEARCH + BATCH EVALUATE IN ONE LLM CALL ======
async function webSearchAndEvaluate(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  query: string,
): Promise<SearchResult[]> {
  // Step 1: Web search
  const results = await safeSdkCall(zai, 'web_search', {
    query,
    num: 10,
    recency_days: 30,
  }) as SearchResult[] | null;

  if (!Array.isArray(results) || results.length === 0) return [];

  // Step 2: Batch evaluate all results in ONE LLM call
  const itemsText = results
    .filter(r => r.snippet && r.snippet.length > 20 && !r.host_name?.includes('facebook.com') && !r.host_name?.includes('twitter.com'))
    .slice(0, 8)
    .map((r, i) => `${i + 1}. "${r.name}" at ${r.host_name}\n   URL: ${r.url}\n   Snippet: ${r.snippet}\n   Date: ${r.date || 'N/A'}`)
    .join('\n\n');

  if (!itemsText) return [];

  const llmResult = await safeLlmCall(zai,
    `You are a job search expert for an Ethiopian candidate. Given search results, identify which are REAL job listings and evaluate them.

CANDIDATE:
${HAMBISA_CV}

Today: ${new Date().toISOString().split('T')[0]}

Return a JSON array of objects for each REAL, NON-EXPIRED job (score >= 35 and isRelated):
- "name": job title
- "url": the job's URL
- "snippet": brief description
- "host_name": source domain
- "score": 0-100 match (be generous)
- "isExpired": boolean
- "isRelated": boolean
- "reasoning": why it matches (1 sentence)

Skip ads, navigation, non-job pages, and expired jobs.
Return ONLY the JSON array, no other text.`,
    `Search results:\n\n${itemsText}\n\nEvaluate and return matching jobs:`
  );

  if (!llmResult) return [];

  try {
    const start = llmResult.indexOf('[');
    const end = llmResult.lastIndexOf(']');
    if (start === -1 || end === -1) return [];

    const parsed = JSON.parse(llmResult.substring(start, end + 1));
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: Record<string, unknown>) => ({
      url: String(item.url || ''),
      name: String(item.name || 'Unknown'),
      snippet: String(item.snippet || ''),
      host_name: String(item.host_name || ''),
    }));
  } catch {
    return [];
  }
}

// ====== PROCESS A SINGLE JOB (save to DB) ======
async function processAndSaveJob(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  item: SearchResult,
  state: SearchState,
  seen: Set<string>,
  source: string,
) {
  if (!item.url || seen.has(item.url)) return;
  seen.add(item.url);

  const existing = await db.application.findFirst({ where: { url: item.url } });
  if (existing) {
    state.logs.push(`  ↳ "${item.name.substring(0, 45)}" — already tracked`);
    return;
  }

  state.totalFound++;

  // Extract score from snippet if not present
  const autoApprove = item.snippet && item.snippet.includes('score') && false; // Will be set by evaluate
  state.totalMatched++;

  // Generate cover letter (only 1 LLM call)
  let coverLetter = 'Click "Preview PDF" to generate cover letter';
  try {
    const cl = await safeLlmCall(zai,
      'Write a professional 200-300 word cover letter for Ethiopian job application. Reference the candidate\'s specific experience. Include contact info at top. Follow Ethiopian business norms. Return ONLY the letter text.',
      `Candidate:\n${HAMBISA_CV}\nPosition: ${item.name}\nCompany: ${extractCompany(item.snippet, item.name) || item.host_name}\n\nWrite the cover letter:`
    );
    if (cl) coverLetter = cl;
  } catch { /* keep default */ }

  // Save to DB as pending_review
  await db.application.create({
    data: {
      jobTitle: item.name,
      company: extractCompany(item.snippet, item.name),
      url: item.url,
      source: item.host_name,
      location: 'Addis Ababa',
      status: 'pending_review',
      matchScore: 60, // Default score (LLM already filtered)
      matchReasoning: `Found via ${source}`,
      jobDescription: item.snippet,
      coverLetter,
      notes: `Pending review | Found via: ${source} | Source: ${item.host_name}`,
    },
  });
  state.totalSaved++;
  state.logs.push(`  ✅ Saved: "${item.name.substring(0, 45)}"`);
}

// ====== BACKGROUND SEARCH RUNNER ======
async function runSearchInBackground(searchId: string, state: SearchState) {
  try {
    const zai = await ZAI.create();
    const seen = new Set<string>();
    const config = SEARCH_CONFIG[state.category] || SEARCH_CONFIG.all;
    state.stepsTotal = config.sites.length + config.queries.length;

    state.logs.push(`\n🚀 Plan: ${config.sites.length} sites + ${config.queries.length} web queries [${state.category}]`);
    state.logs.push(`⏱ Rate limit: 20s between all API calls, 2-min cooldown on 429`);

    // ===== PHASE 1: SCRAPE SITES =====
    for (let si = 0; si < config.sites.length; si++) {
      const site = config.sites[si];
      state.logs.push(`\n📄 [${si + 1}] Scraping ${site.name}: ${site.url}...`);
      state.stepsDone = si + 1;

      const jobs = await scrapeAndEvaluate(zai, site.name, site.url);

      if (jobs.length === 0) {
        state.logs.push(`  ⚠️ No jobs found (page may be blocked or no listings)`);
        continue;
      }

      state.logs.push(`  📋 Found ${jobs.length} matching jobs on ${site.name}`);

      for (const job of jobs) {
        await processAndSaveJob(zai, job, state, seen, site.name);
      }
    }

    // ===== PHASE 2: WEB SEARCH =====
    for (let qi = 0; qi < config.queries.length; qi++) {
      const query = config.queries[qi];
      state.stepsDone = config.sites.length + qi + 1;
      state.logs.push(`\n🔍 [${qi + 1}] Web search: "${query}"...`);

      const jobs = await webSearchAndEvaluate(zai, query);

      if (jobs.length === 0) {
        state.logs.push(`  ⚠️ No matching jobs found`);
        continue;
      }

      state.logs.push(`  📋 Found ${jobs.length} matching jobs from web search`);

      for (const job of jobs) {
        await processAndSaveJob(zai, job, state, seen, 'web search');
      }
    }

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.logs.push(`\n\n🎉 DONE! Found: ${state.totalFound} | Matched: ${state.totalMatched} | Saved: ${state.totalSaved}`);
  } catch (err) {
    state.status = 'failed';
    state.error = String(err);
    state.logs.push(`❌ Failed: ${String(err).substring(0, 200)}`);
  }
}

// ====== API ROUTES ======

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';

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
  const config = SEARCH_CONFIG[category] || SEARCH_CONFIG.all;

  const state: SearchState = {
    id: searchId,
    status: 'running',
    startedAt: new Date().toISOString(),
    category,
    stepsTotal: config.sites.length + config.queries.length,
    stepsDone: 0,
    logs: [`[${new Date().toISOString()}] Search started [${category}]`],
    totalFound: 0,
    totalExpired: 0,
    totalMatched: 0,
    totalSaved: 0,
    autoApproved: 0,
  };

  activeSearches.set(searchId, state);

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
      },
      logs: state.logs,
      error: state.error,
    });
  }

  const searches = Array.from(activeSearches.values())
    .slice(-5)
    .map(s => ({
      id: s.id, status: s.status, category: s.category,
      startedAt: s.startedAt, completedAt: s.completedAt,
      totalSaved: s.totalSaved, autoApproved: s.autoApproved,
    }));

  return NextResponse.json({ success: true, recentSearches: searches });
}
