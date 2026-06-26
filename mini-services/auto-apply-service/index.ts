/**
 * Auto-Apply Service for Hambisa Bekuma Tefera
 *
 * Runs on port 3020. Periodically searches Ethiopian job sites,
 * scores matches against Hambisa's CV, generates cover letters,
 * and saves applications to the main Next.js app.
 */

import ZAI from "z-ai-web-dev-sdk";

// ---------------------------------------------------------------------------
// Process-level error handlers (prevent silent crashes)
// ---------------------------------------------------------------------------

process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled Rejection:", reason);
  isRunning = false;
  currentCycle = null;
});

process.on("uncaughtException", (err) => {
  console.error("[Process] Uncaught Exception:", err);
  isRunning = false;
  currentCycle = null;
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = 3020;
const NEXTJS_API = `http://${process.env.NEXTJS_HOST || "127.0.0.1"}:3000/api/applications`;
const AUTO_SEARCH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MATCH_THRESHOLD = 50;

// Ethiopian job sites to target in search queries
const ETHIOPIAN_JOB_SITES = [
  "ethiojobs.net",
  "mekanisa.com",
  "jobs.et",
  "addisjobs.com",
  "ethiopianjobs.com",
  "jobwebethiopia.com",
  "ethiocareers.com",
];

// ---------------------------------------------------------------------------
// Hambisa's Profile
// ---------------------------------------------------------------------------

const PROFILE = {
  name: "Hambisa Bekuma Tefera",
  phone: "+251 952 341 525",
  email: "hambisa1992@gmail.com",
  location: "Addis Ababa, Ethiopia",
  title: "Sales Manager",
  targetJobs: [
    "Marketing & Sales Manager",
    "Sales Representative",
    "Area Sales Manager",
    "Route Sales Representative",
    "Business Development",
  ],
  languages: [
    "Amharic (Native)",
    "English (Professional)",
    "Afaan Oromo (Fluent)",
    "Somali (Conversational)",
  ],
  yearsExperience: "8+ years in sales",
  education: [
    "MBA — Addis Ababa Medical & Business College, 2018",
    "BSc Agribusiness — Jimma University, 2014",
  ],
  skills: [
    "Territory Management",
    "Route-to-Market",
    "Market Expansion",
    "Field Team Leadership",
    "Negotiation",
    "B2B Account Management",
    "Distributor Development",
    "Sales Planning",
    "Market Intelligence",
  ],
  experience: [
    {
      role: "Route Sales Representative",
      company: "Romel General Trading",
      period: "Jan 2026 – Present",
      highlights:
        "Managing 150+ B2B accounts across assigned territory",
    },
    {
      role: "Marketing Manager",
      company: "OL-BRIGHT International College",
      period: "Dec 2022 – Nov 2025",
      highlights:
        "Led marketing strategy and brand positioning for the institution",
    },
    {
      role: "Marketing & Sales Manager",
      company: "Deran PLC",
      period: "Dec 2020 – Nov 2022",
      highlights:
        "Built the department from zero; achieved 20% revenue growth through strategic market expansion and team development",
    },
    {
      role: "Territory Sales Manager",
      company: "SMADL Communication Terminal Factory PLC",
      period: "Jul 2016 – Nov 2020",
      highlights:
        "Managed territory spanning Adama, Asella, Chiro, Awash, Dire Dawa, Harar, Jigjiga, and the Somali Region; led field teams and distributor networks",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// SDK client (lazy-initialized singleton)
// ---------------------------------------------------------------------------

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!_zai) {
    _zai = await ZAI.create();
  }
  return _zai;
}

// ---------------------------------------------------------------------------
// Profile summary string for LLM prompts
// ---------------------------------------------------------------------------

function buildProfileSummary(): string {
  const expBlock = PROFILE.experience
    .map(
      (e) =>
        `- ${e.role} at ${e.company} (${e.period}): ${e.highlights}`
    )
    .join("\n");

  return `
## Candidate Profile

**Name:** ${PROFILE.name}
**Title:** ${PROFILE.title}
**Location:** ${PROFILE.location}
**Phone:** ${PROFILE.phone}
**Email:** ${PROFILE.email}
**Experience:** ${PROFILE.yearsExperience}
**Education:**
${PROFILE.education.map((e) => `- ${e}`).join("\n")}

**Languages:** ${PROFILE.languages.join(", ")}

**Core Skills:** ${PROFILE.skills.join(", ")}

**Professional Experience:**
${expBlock}

**Target Roles:** ${PROFILE.targetJobs.join(", ")}
`.trim();
}

// ---------------------------------------------------------------------------
// Search Queries — at least 5 diverse queries
// ---------------------------------------------------------------------------

const SEARCH_QUERIES = [
  "sales manager Ethiopia 2025 2026 job vacancy",
  "marketing manager Addis Ababa job opening",
  "area sales manager Ethiopia vacancy",
  "sales representative Addis Ababa job",
  "business development manager Ethiopia job hiring",
  "route sales representative Ethiopia vacancy",
  "B2B sales manager Addis Ababa job",
  "territory sales manager Ethiopia career",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  hostName: string;
  date?: string;
}

interface ApplicationLog {
  id: string;
  timestamp: string;
  query: string;
  jobTitle: string;
  company: string;
  source: string;
  matchScore: number;
  coverLetter: string;
  status: "saved" | "failed" | "skipped";
  error?: string;
  url?: string;
}

interface CycleLog {
  cycleId: string;
  startedAt: string;
  completedAt?: string;
  totalJobsFound: number;
  matched: number;
  saved: number;
  failed: number;
  skipped: number;
  logs: ApplicationLog[];
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const cycleLogs: CycleLog[] = [];
let currentCycle: CycleLog | null = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Step 1 — Web Search via z-ai-web-dev-sdk
// ---------------------------------------------------------------------------

/**
 * Wraps a promise with an AbortController-based timeout.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

async function searchJobs(query: string): Promise<SearchResult[]> {
  try {
    const zai = await getZAI();

    // Primary search targeting Ethiopian job sites
    const siteFilter = ETHIOPIAN_JOB_SITES
      .slice(0, 4)
      .map((s) => `site:${s}`)
      .join(" OR ");
    const targetedQuery = `${query} ${siteFilter}`;

    console.log(`  [web_search] Targeted: "${targetedQuery.substring(0, 80)}..."`);
    const targetedResults = await withTimeout(
      zai.functions.invoke("web_search", {
        query: targetedQuery,
        num: 8,
        recency_days: 30,
      }),
      60_000,
      `web_search(targeted) for "${query.substring(0, 40)}"`
    );

    // Broader fallback search
    const broadQuery = `latest ${query} 2025`;
    console.log(`  [web_search] Broad: "${broadQuery.substring(0, 80)}..."`);
    const broadResults = await withTimeout(
      zai.functions.invoke("web_search", {
        query: broadQuery,
        num: 5,
        recency_days: 14,
      }),
      60_000,
      `web_search(broad) for "${query.substring(0, 40)}"`
    );

    // Combine and deduplicate
    const allResults = [
      ...(Array.isArray(targetedResults) ? targetedResults : []),
      ...(Array.isArray(broadResults) ? broadResults : []),
    ];

    const seenUrls = new Set<string>();
    const filtered: SearchResult[] = [];

    for (const r of allResults) {
      if (!r || typeof r !== "object") continue;

      const url = String(r.url || "");
      if (!url) continue;
      if (seenUrls.has(url)) continue;

      // Skip social media feeds
      if (
        url.includes("facebook.com") ||
        url.includes("twitter.com") ||
        url.includes("linkedin.com/feed") ||
        url.includes("instagram.com")
      ) {
        continue;
      }

      seenUrls.add(url);

      const hostName = String(r.host_name || new URL(url).hostname.replace("www.", ""));
      const title = String(r.name || r.title || "");
      const snippet = String(r.snippet || r.description || "");

      if (!title) continue;

      filtered.push({
        title,
        snippet,
        url,
        source: ETHIOPIAN_JOB_SITES.find((s) => hostName.includes(s)) || hostName,
        hostName,
        date: r.date ? String(r.date) : undefined,
      });
    }

    return filtered;
  } catch (err) {
    console.error(`[WebSearch] Error searching "${query}":`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Step 2 — LLM Score Match (0-100)
// ---------------------------------------------------------------------------

async function scoreMatch(
  job: SearchResult
): Promise<{ score: number; reasoning: string }> {
  const userMessage = `You are a professional recruitment assistant. Rate how well the following job posting matches the candidate's profile.

Provide ONLY a JSON object with two fields:
- "score": a number from 0 to 100 (higher = better match)
- "reasoning": a brief 1-2 sentence explanation

${buildProfileSummary()}

---

**Job Posting:**
- Title: ${job.title}
- Description: ${job.snippet}
- Source: ${job.source}
- URL: ${job.url}

Respond with ONLY the JSON object, no markdown fences.`;

  try {
    const zai = await getZAI();
    console.log(`  [LLM] Scoring ${job.title.substring(0, 60)}...`);
    const completion = await withTimeout(
      zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are a JSON-only response assistant. Always respond with valid JSON and nothing else.",
          },
          { role: "user", content: userMessage },
        ],
        thinking: { type: "disabled" },
      }),
      60_000,
      `LLM score for "${job.title.substring(0, 40)}"`
    );

    const text =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    // Strip markdown fences if the LLM wraps the JSON
    const cleaned = text
      .replace(/```json?\s*\n?/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning || "No reasoning provided"),
    };
  } catch (err) {
    console.error("[LLM] Score error for", job.title, ":", err);
    return { score: 0, reasoning: "Failed to score — parsing error" };
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Generate Cover Letter via LLM
// ---------------------------------------------------------------------------

async function generateCoverLetter(
  job: SearchResult,
  company: string
): Promise<string> {
  const userMessage = `Write a professional, tailored cover letter for the following job application. The letter should:
- Be addressed to the hiring manager
- Reference specific relevant experience from the candidate's career history
- Be concise but compelling (3-4 paragraphs, ~300-400 words)
- Mention key skills that directly match the job requirements
- Include the applicant's contact information at the top
- End with a clear call to action
- Follow Ethiopian professional norms

${buildProfileSummary()}

---

**Job Details:**
- Title: ${job.title}
- Company: ${company}
- Description: ${job.snippet}
- Source: ${job.source}

Write the cover letter now. Output ONLY the cover letter text — no preamble, no explanation, no JSON.`;

  try {
    const zai = await getZAI();
    console.log(`  [LLM] Generating cover letter for ${job.title.substring(0, 60)}...`);
    const completion = await withTimeout(
      zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are a professional cover letter writer specializing in Ethiopian job applications. Write compelling, specific cover letters that reference the candidate's actual experience.",
          },
          { role: "user", content: userMessage },
        ],
        thinking: { type: "disabled" },
      }),
      90_000,
      `LLM cover letter for "${job.title.substring(0, 40)}"`
    );

    const text =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    return text || "Cover letter generation returned empty content.";
  } catch (err) {
    console.error("[LLM] Cover letter error for", job.title, ":", err);
    return "Cover letter generation failed. Please contact the candidate directly at hambisa1992@gmail.com or +251 952 341 525.";
  }
}

// ---------------------------------------------------------------------------
// Step 4 — Save Application to Next.js API
// ---------------------------------------------------------------------------

async function saveApplication(log: ApplicationLog): Promise<boolean> {
  try {
    const payload = {
      jobTitle: log.jobTitle,
      company: log.company || null,
      location: PROFILE.location,
      status: "pending_review",
      url: log.url || null,
      coverLetter: log.coverLetter || null,
      notes: `Pending review via auto-apply-service | Match Score: ${log.matchScore}/100 | Source: ${log.source} | Query: "${log.query}"`,
    };

    console.log(`  [Save] POST ${log.jobTitle.substring(0, 50)}...`);
    const res = await withTimeout(
      fetch(NEXTJS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      15_000,
      `Save application for "${log.jobTitle.substring(0, 40)}"`
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Save] Next.js returned ${res.status}: ${body}`);
      return false;
    }

    const data = await res.json();
    console.log(
      `[Save] Application saved — DB id: ${data.application?.id || "n/a"} | ${log.jobTitle}`
    );
    return true;
  } catch (err) {
    console.error("[Save] Error saving application:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Company extraction heuristics
// ---------------------------------------------------------------------------

function extractCompany(job: SearchResult): string {
  const text = `${job.title} ${job.snippet}`;
  const patterns = [
    /(?:at|@|by|from)\s+([A-Z][A-Za-z&\s]{2,35}?)(?:\s*[-–|,.\n:;]|\s+(?:is|hiring|needs|looking|seeks|wants)|$)/,
    /([A-Z][A-Za-z&\s]{2,35}?)\s+(?:is hiring|needs|looking for|seeks|wants|invites)/i,
    /(?:company|organization|firm)[:\s]*([A-Z][A-Za-z&\s]{2,35}?)(?:\s*[-–|,.\n:;]|$)/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common false positives
      const blacklist = new Set([
        "Ethiopia",
        "Addis Ababa",
        "Job",
        "Vacancy",
        "Career",
        "Hiring",
        "View",
        "Apply",
        "Click",
        "Read",
        "More",
        "Details",
        "Full",
        "Description",
      ]);
      if (!blacklist.has(name) && name.length > 2) {
        return name;
      }
    }
  }

  return job.source;
}

// ---------------------------------------------------------------------------
// Core: Run Full Search Cycle
// ---------------------------------------------------------------------------

async function runSearchCycle(): Promise<CycleLog> {
  const cycle: CycleLog = {
    cycleId: uid(),
    startedAt: nowISO(),
    totalJobsFound: 0,
    matched: 0,
    saved: 0,
    failed: 0,
    skipped: 0,
    logs: [],
  };

  currentCycle = cycle;
  isRunning = true;
  console.log(`\n${"=".repeat(64)}`);
  console.log(
    `[Cycle ${cycle.cycleId}] Starting auto-search cycle at ${cycle.startedAt}`
  );
  console.log(`${"=".repeat(64)}\n`);

  // Track seen URLs across all queries to avoid duplicates
  const seenUrls = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    console.log(`[Search] Querying: "${query}"`);
    const results = await searchJobs(query);
    console.log(`[Search] Found ${results.length} unique results`);

    for (const job of results) {
      // Deduplicate globally
      if (seenUrls.has(job.url)) continue;
      seenUrls.add(job.url);
      cycle.totalJobsFound++;

      console.log(`\n[Evaluate] ${job.title} @ ${job.source}`);

      // Step 2: Score match with LLM
      const { score, reasoning } = await scoreMatch(job);
      console.log(`[Evaluate] Match score: ${score}/100 — ${reasoning}`);

      // Extract company name
      const company = extractCompany(job);

      const logEntry: ApplicationLog = {
        id: uid(),
        timestamp: nowISO(),
        query,
        jobTitle: job.title,
        company,
        source: job.source,
        matchScore: score,
        coverLetter: "",
        status: "skipped",
        url: job.url,
      };

      // Step 2b: Skip if below threshold
      if (score < MATCH_THRESHOLD) {
        console.log(
          `[Skip] Score ${score} is below threshold ${MATCH_THRESHOLD}`
        );
        cycle.skipped++;
        cycle.logs.push(logEntry);
        continue;
      }

      // Step 3: Generate cover letter
      cycle.matched++;
      console.log(`[Match] Score ${score} ≥ ${MATCH_THRESHOLD} — generating cover letter...`);

      const coverLetter = await generateCoverLetter(job, company);
      logEntry.coverLetter = coverLetter;

      // Step 4: Save to Next.js
      const success = await saveApplication(logEntry);
      logEntry.status = success ? "saved" : "failed";
      if (!success) {
        logEntry.error = "Failed to save to Next.js API";
      }

      if (success) {
        cycle.saved++;
        console.log(`[Saved] ✓ ${job.title} @ ${company}`);
      } else {
        cycle.failed++;
        console.error(`[Failed] ✗ ${job.title} @ ${company}`);
      }

      cycle.logs.push(logEntry);

      // Throttle to avoid API rate limits
      await sleep(2000);
    }

    // Brief pause between queries
    await sleep(1000);
  }

  cycle.completedAt = nowISO();
  isRunning = false;
  currentCycle = null;

  console.log(`\n${"=".repeat(64)}`);
  console.log(
    `[Cycle ${cycle.cycleId}] Complete at ${cycle.completedAt}`
  );
  console.log(
    `  Jobs found : ${cycle.totalJobsFound}\n` +
    `  Matched (≥${MATCH_THRESHOLD}) : ${cycle.matched}\n` +
    `  Saved      : ${cycle.saved}\n` +
    `  Failed     : ${cycle.failed}\n` +
    `  Skipped    : ${cycle.skipped}`
  );
  console.log(`${"=".repeat(64)}\n`);

  // Store cycle log (keep last 20 in memory)
  cycleLogs.unshift(cycle);
  if (cycleLogs.length > 20) cycleLogs.pop();

  return cycle;
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // ---------------------------------------------------------------
      // POST /api/auto-search — trigger a search cycle
      // ---------------------------------------------------------------
      if (path === "/api/auto-search" && req.method === "POST") {
        if (isRunning) {
          return jsonResponse(
            {
              status: "already_running",
              message:
                "A search cycle is already in progress. Please wait for it to complete.",
              currentCycle: currentCycle
                ? {
                    cycleId: currentCycle.cycleId,
                    startedAt: currentCycle.startedAt,
                    totalJobsFound: currentCycle.totalJobsFound,
                    matched: currentCycle.matched,
                    saved: currentCycle.saved,
                  }
                : null,
            },
            202,
            corsHeaders
          );
        }

        // Fire-and-forget: start cycle, return immediately
        runSearchCycle().catch((err) => {
          console.error("[Server] Search cycle crashed:", err);
          isRunning = false;
          currentCycle = null;
        });

        return jsonResponse(
          {
            status: "started",
            message:
              "Auto-search cycle has been triggered. Check GET /api/status for progress.",
          },
          202,
          corsHeaders
        );
      }

      // ---------------------------------------------------------------
      // GET /api/status — current status + recent application logs
      // ---------------------------------------------------------------
      if (path === "/api/status" && req.method === "GET") {
        const lastCycle = cycleLogs[0] || null;
        const totalSaved = cycleLogs.reduce((s, c) => s + c.saved, 0);
        const totalMatched = cycleLogs.reduce((s, c) => s + c.matched, 0);
        const totalFailed = cycleLogs.reduce((s, c) => s + c.failed, 0);
        const totalSkipped = cycleLogs.reduce((s, c) => s + c.skipped, 0);
        const totalJobs = cycleLogs.reduce((s, c) => s + c.totalJobsFound, 0);

        // Recent logs from last 2 cycles, capped at 20 entries
        const recentLogs: ApplicationLog[] = cycleLogs
          .slice(0, 2)
          .flatMap((c) => c.logs)
          .slice(0, 20);

        return jsonResponse(
          {
            service: "auto-apply-service",
            candidate: PROFILE.name,
            port: PORT,
            isRunning,
            currentCycle: currentCycle
              ? {
                  cycleId: currentCycle.cycleId,
                  startedAt: currentCycle.startedAt,
                  totalJobsFound: currentCycle.totalJobsFound,
                  matched: currentCycle.matched,
                  saved: currentCycle.saved,
                }
              : null,
            lastCycle: lastCycle
              ? {
                  cycleId: lastCycle.cycleId,
                  startedAt: lastCycle.startedAt,
                  completedAt: lastCycle.completedAt,
                  totalJobsFound: lastCycle.totalJobsFound,
                  matched: lastCycle.matched,
                  saved: lastCycle.saved,
                  failed: lastCycle.failed,
                  skipped: lastCycle.skipped,
                }
              : null,
            allTimeStats: {
              totalCycles: cycleLogs.length,
              totalJobsFound: totalJobs,
              totalMatched,
              totalSaved,
              totalFailed,
              totalSkipped,
            },
            recentLogs,
          },
          200,
          corsHeaders
        );
      }

      // ---------------------------------------------------------------
      // GET /api/logs — all application logs with optional filters
      // ---------------------------------------------------------------
      if (path === "/api/logs" && req.method === "GET") {
        const allLogs = cycleLogs.flatMap((c) => c.logs);
        const limitParam = url.searchParams.get("limit");
        const minScoreParam = url.searchParams.get("minScore");
        const statusParam = url.searchParams.get("status");

        let filtered = allLogs;

        if (minScoreParam) {
          const threshold = Number(minScoreParam);
          if (!isNaN(threshold)) {
            filtered = filtered.filter((l) => l.matchScore >= threshold);
          }
        }

        if (statusParam) {
          filtered = filtered.filter((l) => l.status === statusParam);
        }

        if (limitParam) {
          const n = Number(limitParam);
          if (!isNaN(n) && n > 0) {
            filtered = filtered.slice(0, n);
          }
        }

        return jsonResponse(
          {
            total: filtered.length,
            cycles: cycleLogs.length,
            logs: filtered,
          },
          200,
          corsHeaders
        );
      }

      // ---------------------------------------------------------------
      // 404 — Unknown route
      // ---------------------------------------------------------------
      return jsonResponse(
        {
          error: "Not Found",
          availableEndpoints: [
            "POST /api/auto-search  — Trigger a new search cycle",
            "GET  /api/status       — View service status and recent logs",
            "GET  /api/logs         — View all application logs",
            'GET  /api/logs?limit=50&minScore=50&status=saved  — Filtered logs',
          ],
        },
        404,
        corsHeaders
      );
    } catch (err) {
      console.error("[Server] Unhandled error:", err);
      return jsonResponse(
        {
          error: "Internal Server Error",
          message: err instanceof Error ? err.message : "Unknown error",
        },
        500,
        corsHeaders
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Response helper
// ---------------------------------------------------------------------------

function jsonResponse(
  data: unknown,
  status: number,
  extraHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                  AUTO-APPLY SERVICE                              ║
║  Candidate : ${PROFILE.name.padEnd(47)}║
║  Port      : ${String(PORT).padEnd(47)}║
║  Interval  : Every 4 hours                                       ║
║  Threshold : Match score ≥ ${String(MATCH_THRESHOLD).padEnd(39)}║
║  Endpoints :                                                       ║
║    POST /api/auto-search                                          ║
║    GET  /api/status                                               ║
║    GET  /api/logs                                                 ║
╚═══════════════════════════════════════════════════════════════════╝
`);

// Run initial search cycle on startup (with a small delay so the server is ready)
console.log("[Startup] Initial search cycle will begin in 3 seconds...\n");
setTimeout(() => {
  runSearchCycle().catch((err) => {
    console.error("[Startup] Initial cycle failed:", err);
    isRunning = false;
    currentCycle = null;
  });
}, 3000);

// Schedule recurring cycles every 4 hours
setInterval(() => {
  console.log("[Scheduler] 4-hour interval triggered");
  if (!isRunning) {
    runSearchCycle().catch((err) => {
      console.error("[Scheduler] Cycle failed:", err);
      isRunning = false;
      currentCycle = null;
    });
  } else {
    console.log("[Scheduler] Skipped — a cycle is already running");
  }
}, AUTO_SEARCH_INTERVAL_MS);