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

SKILLS: Territory Management, Route-to-Market, Market Expansion, New Account Opening, Field Team Leadership, Negotiation & Deal Closing, B2B Account Management, Distributor & Channel Development, Sales Planning & Forecasting, Market Intelligence, Excel & Reporting, Marketing Strategy, Customer Retention, Data Entry, Virtual Assistant, Administrative Support

EXPERIENCE:
1. Route Sales Representative - Romel General Trading (Jan 2026-Present): 150+ B2B accounts, weekly route, new accounts monthly
2. Marketing Manager - OL-BRIGHT International College (Dec 2022-Nov 2025): 30%+ enrollment growth, 2 branches opened
3. Marketing & Sales Manager - Deran PLC (Dec 2020-Nov 2022): Built dept from zero, 20% revenue growth in 2 years
4. Territory Sales Manager - SMADL Communication Terminal Factory PLC (Jul 2016-Nov 2020): 8+ cities, hired & trained reps

EDUCATION: MBA (2018), BSc Agribusiness (2014)
LANGUAGES: Amharic (Native), English (Professional), Afaan Oromo (Fluent), Somali (Conversational)
`;

// ====== RATE LIMITER (conservative to avoid 429) ======
let global429Cooldown = 0;
let lastApiCall = 0;
const MIN_INTERVAL = 45000; // 45s between SDK calls
const COOLDOWN_429 = 300000; // 5 min cooldown on 429

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  if (now < global429Cooldown) {
    const wait = global429Cooldown - now + 5000;
    console.log(`[RateLimit] 429 cooldown, waiting ${Math.ceil(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  const elapsed = Date.now() - lastApiCall;
  if (elapsed < MIN_INTERVAL) {
    const wait = MIN_INTERVAL - elapsed;
    console.log(`[RateLimit] Standard wait ${Math.ceil(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  lastApiCall = Date.now();
}

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
      global429Cooldown = Date.now() + COOLDOWN_429;
      console.log(`[429] ${fn} rate limited, 5-min cooldown`);
    } else {
      console.log(`[SDK] ${fn} error: ${msg.substring(0, 120)}`);
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
      global429Cooldown = Date.now() + COOLDOWN_429;
      console.log(`[429] LLM rate limited, 5-min cooldown`);
    } else {
      console.log(`[LLM] Error: ${msg.substring(0, 120)}`);
    }
    return null;
  }
}

// ====== SEARCH QUERIES PER CATEGORY ======
const SEARCH_QUERIES: Record<string, string[]> = {
  ethiopia: [
    // Ethiopian job board site-specific queries
    'EthioJobs.net sales manager vacancy 2025 2026',
    'EthioJobs.net marketing manager job Addis Ababa',
    'Mekanisa.com Ethiopia jobs vacancy',
    'jobs.et Ethiopia sales marketing vacancy',
    'GeezJob.com Ethiopia job listing',
    'HarmeJobs.com vacancy Ethiopia',
    'EthioVacancy.com latest jobs Ethiopia',
    'AddisJobs.com vacancy Ethiopia 2026',
    'newjobsethiopia.com job vacancy',
    'zamejobs.com Ethiopia jobs',
    'Reporter Ethiopia newspaper jobs vacancy',
    'Ethiopia sales manager job vacancy 2026 hiring now',
    'Addis Ababa business development job vacancy',
    'Ethiopia data entry clerk job vacancy 2026',
    'Ethiopia customer service representative job hiring',
    'Ethiopia account manager job vacancy',
  ],
  linkedin: [
    'site:linkedin.com/jobs sales manager Ethiopia',
    'site:linkedin.com/jobs marketing manager Addis Ababa',
    'site:linkedin.com/jobs business development Ethiopia',
    'site:linkedin.com/jobs data entry Ethiopia',
    'site:linkedin.com/jobs remote work Ethiopia',
    'site:linkedin.com/jobs account manager Ethiopia',
    'site:linkedin.com/jobs customer service Addis Ababa',
    'site:linkedin.com/jobs sales executive Ethiopia',
  ],
  remote: [
    'remote data entry jobs Africa hiring now 2025 2026',
    'remote data entry work from home job available',
    'WeWorkRemotely data entry jobs',
    'RemoteOK remote data entry jobs',
    'remote virtual assistant jobs Africa hiring',
    'remote administrative assistant jobs Africa',
    'remote work from home jobs Africa available',
    'flexjobs remote data entry administrative jobs',
    'remote online data entry clerk jobs hiring now',
    'remotive.com remote data entry jobs',
    'remote part time data entry jobs worldwide',
    'Upwork data entry jobs Ethiopia Africa',
  ],
  all: [
    // Best mix from all categories
    'EthioJobs.net sales marketing manager vacancy 2026',
    'Ethiopia sales manager job vacancy 2026 hiring now',
    'Addis Ababa marketing business development job vacancy',
    'site:linkedin.com/jobs sales manager Ethiopia',
    'Mekanisa.com Ethiopia jobs vacancy',
    'Ethiopia data entry clerk job vacancy 2026',
    'remote data entry jobs Africa hiring now 2026',
    'GeezJob.com Ethiopia job listing',
    'HarmeJobs.com vacancy Ethiopia',
    'EthioVacancy.com latest jobs Ethiopia',
    'remote virtual assistant jobs Africa hiring',
    'site:linkedin.com/jobs marketing manager Addis Ababa',
    'newjobsethiopia.com job vacancy',
    'Ethiopia customer service representative job hiring',
    'Reporter Ethiopia newspaper jobs vacancy',
    'RemoteOK remote data entry jobs',
  ],
};

interface RawSearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  date?: string;
}

interface EvaluatedJob {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  score: number;
  isExpired: boolean;
  isRelated: boolean;
  reasoning: string;
  applyEmail?: string;
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
  autoSubmitted: number;
  error?: string;
}

const activeSearches = new Map<string, SearchState>();

// ====== EXTRACT COMPANY NAME ======
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
      const bad = ['Ethiopia', 'Addis Ababa', 'Job', 'Vacancy', 'Career', 'Hiring', 'View', 'Apply', 'Click', 'Read', 'More', 'Details', 'Full', 'Description', 'Telegram', 'Channel', 'Group', 'LinkedIn'];
      if (!bad.includes(name) && name.length > 2) return name;
    }
  }
  return null;
}

// ====== BATCH EVALUATE ALL SEARCH RESULTS IN ONE LLM CALL ======
async function batchEvaluateJobs(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  rawResults: RawSearchResult[],
): Promise<EvaluatedJob[]> {
  if (rawResults.length === 0) return [];

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = rawResults.filter(r => {
    if (!r.url || seen.has(r.url) || r.snippet?.length < 15) return false;
    if (r.host_name?.includes('facebook.com') || r.host_name?.includes('twitter.com') || r.host_name?.includes('youtube.com')) return false;
    seen.add(r.url);
    return true;
  });

  if (unique.length === 0) return [];

  const itemsText = unique.slice(0, 20).map((r, i) =>
    `${i + 1}. "${r.name}"\n   URL: ${r.url}\n   Source: ${r.host_name}\n   Snippet: ${r.snippet}\n   Date: ${r.date || 'N/A'}`
  ).join('\n\n');

  const llmResult = await safeLlmCall(zai,
    `You are a job search expert for an Ethiopian candidate. Given ${unique.length} search results, identify which are REAL, CURRENT job listings.

CANDIDATE PROFILE:
${HAMBISA_CV}

Today: ${new Date().toISOString().split('T')[0]}

IMPORTANT: Be generous with scoring. Sales, Marketing, Business Development, Data Entry, Virtual Assistant, Remote Work, Customer Service, Account Management, and Administrative roles are ALL relevant.

For EACH real, non-expired job listing (score >= 30), return a JSON object:
- "name": exact job title
- "url": the job's URL
- "snippet": brief description (50-150 chars)
- "host_name": source domain
- "score": 0-100 match score (be generous — 50+ for any related role)
- "isExpired": true if clearly expired (past deadlines, old dates)
- "isRelated": true for any remotely relevant role
- "reasoning": why it matches (short)
- "applyEmail": email address if found in snippet (e.g. hr@company.com), otherwise null

Skip ads, navigation pages, listicle pages (like "top 10 jobs"), and expired jobs.
Return ONLY a JSON array. If no real jobs, return [].`,
    `Search results:\n\n${itemsText}\n\nEvaluate and return matching jobs as JSON array:`
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
      score: Number(item.score) || 50,
      isExpired: Boolean(item.isExpired),
      isRelated: Boolean(item.isRelated),
      reasoning: String(item.reasoning || ''),
      applyEmail: item.applyEmail ? String(item.applyEmail) : undefined,
    }));
  } catch (e) {
    console.log(`[LLM] Parse error: ${(e as Error).message?.substring(0, 100)}`);
    return [];
  }
}

// ====== GENERATE COVER LETTER (only for auto-approved jobs) ======
async function generateCoverLetter(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  jobTitle: string,
  company: string | null,
): Promise<string> {
  try {
    const cl = await safeLlmCall(zai,
      'Write a professional 200-250 word cover letter for an Ethiopian job application. Reference the candidate\'s specific experience. Include contact info at top. Follow Ethiopian business norms. Return ONLY the letter text, no headers.',
      `Candidate:\n${HAMBISA_CV}\nPosition: ${jobTitle}\nCompany: ${company || 'the company'}\n\nWrite the cover letter:`
    );
    if (cl) return cl;
  } catch { /* keep default */ }
  return 'Cover letter will be generated on PDF preview. Click "Preview PDF" to auto-generate.';
}

// ====== SAVE + AUTO-APPROVE + AUTO-SUBMIT ======
async function saveAndAutoProcess(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  job: EvaluatedJob,
  state: SearchState,
  seen: Set<string>,
  category: string,
) {
  if (!job.url || seen.has(job.url)) return;
  seen.add(job.url);

  // Skip expired
  if (job.isExpired) {
    state.totalExpired++;
    state.logs.push(`  ⏰ Expired: "${job.name.substring(0, 40)}"`);
    return;
  }

  // Check if already in DB
  const existing = await db.application.findFirst({ where: { url: job.url } });
  if (existing) {
    state.logs.push(`  ↳ Already tracked: "${job.name.substring(0, 40)}"`);
    return;
  }

  state.totalFound++;

  const company = extractCompany(job.snippet, job.name);
  const score = Math.min(100, Math.max(30, job.score));
  state.totalMatched++;

  // Determine status based on score
  let status: string = 'pending_review';
  let autoAction = '';

  if (score >= 80) {
    status = 'submitted';
    autoAction = 'auto-submitted';
    state.autoSubmitted++;
  } else if (score >= 60) {
    status = 'approved';
    autoAction = 'auto-approved';
    state.autoApproved++;
  }

  // Generate cover letter for auto-approved/submitted jobs
  let coverLetter = 'Click "Preview PDF" to generate cover letter';
  if (status === 'approved' || status === 'submitted') {
    try {
      const cl = await safeLlmCall(zai,
        'Write a professional 200-250 word cover letter for an Ethiopian job application. Reference the candidate\'s specific experience. Include contact info at top. Return ONLY the letter text.',
        `Candidate:\n${HAMBISA_CV}\nPosition: ${job.name}\nCompany: ${company || job.host_name}\n\nWrite the cover letter:`
      );
      if (cl) coverLetter = cl;
    } catch { /* keep default */ }
  }

  // Build notes
  const notes = [
    `Found via: ${category} search`,
    `Source: ${job.host_name}`,
    `Match: ${score}% — ${job.reasoning}`,
    autoAction ? `🤖 ${autoAction} automatically` : 'Awaiting manual review',
    job.applyEmail ? `📧 Apply to: ${job.applyEmail}` : '',
    status === 'submitted' ? `📋 Marked submitted on ${new Date().toISOString().split('T')[0]}` : '',
  ].filter(Boolean).join(' | ');

  await db.application.create({
    data: {
      jobTitle: job.name,
      company,
      url: job.url,
      source: job.host_name,
      location: 'Addis Ababa',
      status,
      matchScore: score,
      matchReasoning: job.reasoning,
      jobDescription: job.snippet,
      coverLetter,
      notes,
      appliedAt: status === 'submitted' ? new Date() : null,
    },
  });

  state.totalSaved++;
  const icon = autoAction === 'auto-submitted' ? '🚀' : autoAction === 'auto-approved' ? '✅' : '📋';
  state.logs.push(`  ${icon} Saved (${score}%): "${job.name.substring(0, 40)}" — ${autoAction || 'pending review'}`);
}

// ====== BACKGROUND SEARCH RUNNER ======
async function runSearchInBackground(searchId: string, state: SearchState) {
  try {
    const zai = await ZAI.create();
    const queries = SEARCH_QUERIES[state.category] || SEARCH_QUERIES.all;
    state.stepsTotal = queries.length + 2; // queries + batch eval + save

    state.logs.push(`\n🚀 Plan: ${queries.length} web queries, then batch LLM evaluate [${state.category}]`);
    state.logs.push(`⏱ Rate limit: 45s between API calls, 5-min cooldown on 429`);
    state.logs.push(`🤖 Auto-approve: score ≥ 60 | Auto-submit: score ≥ 80`);

    // ===== PHASE 1: COLLECT ALL SEARCH RESULTS =====
    const allRawResults: RawSearchResult[] = [];
    let successfulQueries = 0;

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi];
      state.stepsDone = qi + 1;
      state.logs.push(`\n🔍 [${qi + 1}/${queries.length}] "${query.substring(0, 50)}..."`);

      const results = await safeSdkCall(zai, 'web_search', {
        query,
        num: 10,
        recency_days: 14, // last 2 weeks for freshness
      }) as RawSearchResult[] | null;

      if (!Array.isArray(results) || results.length === 0) {
        state.logs.push(`  → 0 results`);
        // Check if we hit rate limit
        if (Date.now() >= global429Cooldown - 1000) {
          state.logs.push(`  ⚠️ Rate limited — pausing queries...`);
          await new Promise(r => setTimeout(r, 5000));
        }
        continue;
      }

      const valid = results.filter(r => r.url && r.snippet?.length > 15);
      allRawResults.push(...valid);
      successfulQueries++;
      state.logs.push(`  → ${valid.length} results (total raw: ${allRawResults.length})`);
    }

    if (allRawResults.length === 0) {
      state.logs.push(`\n⚠️ No search results found across all queries`);
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      state.logs.push(`\n🎉 DONE! Queries: ${successfulQueries}/${queries.length} | Results: 0 | Rate limits may have blocked searches`);
      return;
    }

    // Deduplicate
    const seenUrls = new Set<string>();
    const deduped = allRawResults.filter(r => {
      if (seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return true;
    });

    state.logs.push(`\n📊 Phase 1 complete: ${successfulQueries}/${queries.length} queries returned ${deduped.length} unique results`);

    // ===== PHASE 2: BATCH LLM EVALUATION =====
    state.stepsDone = queries.length + 1;
    state.logs.push(`\n🤖 Batch evaluating ${deduped.length} results with AI...`);

    const evaluated = await batchEvaluateJobs(zai, deduped);

    if (evaluated.length === 0) {
      state.logs.push(`  ⚠️ No matching jobs found after AI evaluation`);
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      state.logs.push(`\n🎉 DONE! Raw results: ${deduped.length} | Matched: 0`);
      return;
    }

    state.logs.push(`  ✅ AI found ${evaluated.length} matching jobs`);

    // ===== PHASE 3: SAVE + AUTO-PROCESS =====
    state.stepsDone = queries.length + 2;
    state.logs.push(`\n💾 Saving ${evaluated.length} jobs + auto-processing...`);

    const seen = new Set<string>();
    for (const job of evaluated) {
      await saveAndAutoProcess(zai, job, state, seen, state.category);
    }

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.logs.push(`\n\n🎉 COMPLETE!`);
    state.logs.push(`  Queries: ${successfulQueries}/${queries.length}`);
    state.logs.push(`  Raw results: ${deduped.length}`);
    state.logs.push(`  Matched: ${state.totalMatched}`);
    state.logs.push(`  Expired: ${state.totalExpired}`);
    state.logs.push(`  Saved to DB: ${state.totalSaved}`);
    state.logs.push(`  🤖 Auto-approved: ${state.autoApproved}`);
    state.logs.push(`  🚀 Auto-submitted: ${state.autoSubmitted}`);
  } catch (err) {
    state.status = 'failed';
    state.error = String(err);
    state.logs.push(`\n❌ Failed: ${String(err).substring(0, 300)}`);
    console.error('[Background Search] Fatal:', err);
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
    const queries = SEARCH_QUERIES[category] || SEARCH_QUERIES.all;

    const state: SearchState = {
      id: searchId,
      status: 'running',
      startedAt: new Date().toISOString(),
      category,
      stepsTotal: queries.length + 2,
      stepsDone: 0,
      logs: [`[${new Date().toISOString()}] Search started [${category}]`, `🔍 ${queries.length} queries queued`],
      totalFound: 0,
      totalExpired: 0,
      totalMatched: 0,
      totalSaved: 0,
      autoApproved: 0,
      autoSubmitted: 0,
    };

    activeSearches.set(searchId, state);

    // Run in background (fire-and-forget)
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

  // List recent searches
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
