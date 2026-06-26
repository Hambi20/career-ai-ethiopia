/**
 * Auto-Apply Service for Hambisa Bekuma Tefera
 *
 * Runs on port 3020. Periodically triggers the Next.js /api/auto-apply/run
 * endpoint which handles all job searching, LLM evaluation, cover letter
 * generation, and saving to the database.
 *
 * This service is a lightweight scheduler — all heavy logic lives in Next.js.
 */

// ---------------------------------------------------------------------------
// Process-level error handlers (prevent silent crashes)
// ---------------------------------------------------------------------------

let isRunning = false;
let currentCycle: {
  cycleId: string;
  startedAt: string;
  totalJobsFound: number;
  matched: number;
  saved: number;
} | null = null;

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
const NEXTJS_RUN_API = `http://${process.env.NEXTJS_HOST || "127.0.0.1"}:3000/api/auto-apply/run?full=true`;
const AUTO_SEARCH_INTERVAL_MS = 1 * 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CycleLog {
  cycleId: string;
  startedAt: string;
  completedAt?: string;
  totalFound: number;
  totalExpired: number;
  totalMatched: number;
  totalSaved: number;
  logs: string[];
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const cycleLogs: CycleLog[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nowISO(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
// Core: Run Full Search Cycle (delegates to Next.js)
// ---------------------------------------------------------------------------

async function runSearchCycle(): Promise<CycleLog> {
  const cycle: CycleLog = {
    cycleId: uid(),
    startedAt: nowISO(),
    totalFound: 0,
    totalExpired: 0,
    totalMatched: 0,
    totalSaved: 0,
    logs: [],
    success: false,
  };

  currentCycle = {
    cycleId: cycle.cycleId,
    startedAt: cycle.startedAt,
    totalJobsFound: 0,
    matched: 0,
    saved: 0,
  };
  isRunning = true;

  console.log(`\n${"=".repeat(64)}`);
  console.log(
    `[Cycle ${cycle.cycleId}] Starting auto-search cycle at ${cycle.startedAt}`
  );
  console.log(
    `  Source: ${NEXTJS_RUN_API}`
  );
  console.log(
    `  Next interval: ${AUTO_SEARCH_INTERVAL_MS / 1000 / 60} minutes`
  );
  console.log(`${"=".repeat(64)}\n`);

  try {
    console.log("[Cycle] Calling Next.js auto-apply/run endpoint...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600_000); // 10 min timeout

    const res = await fetch(NEXTJS_RUN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Next.js returned ${res.status}: ${body}`);
    }

    const data = await res.json();

    cycle.totalFound = data.totalFound || 0;
    cycle.totalExpired = data.totalExpired || 0;
    cycle.totalMatched = data.totalMatched || 0;
    cycle.totalSaved = data.totalSaved || 0;
    cycle.logs = data.logs || [];
    cycle.success = true;

    // Update live status
    if (currentCycle) {
      currentCycle.totalJobsFound = cycle.totalFound;
      currentCycle.matched = cycle.totalMatched;
      currentCycle.saved = cycle.totalSaved;
    }

    console.log(`\n[Cycle] Next.js response received:`);
    console.log(`  Total found: ${cycle.totalFound}`);
    console.log(`  Expired: ${cycle.totalExpired}`);
    console.log(`  Matched (≥40): ${cycle.totalMatched}`);
    console.log(`  New saved for review: ${cycle.totalSaved}`);

    // Print last few log lines
    if (cycle.logs.length > 0) {
      console.log(`\n[Cycle] Last log entries:`);
      for (const log of cycle.logs.slice(-5)) {
        console.log(`  ${log}`);
      }
    }
  } catch (err) {
    console.error("[Cycle] Error:", err);
    cycle.success = false;
    cycle.error = err instanceof Error ? err.message : String(err);
    cycle.logs.push(`Error: ${cycle.error}`);
  }

  cycle.completedAt = nowISO();
  isRunning = false;
  currentCycle = null;

  console.log(`\n${"=".repeat(64)}`);
  console.log(`[Cycle ${cycle.cycleId}] Complete at ${cycle.completedAt}`);
  console.log(
    `  Jobs found : ${cycle.totalFound}\n` +
    `  Expired    : ${cycle.totalExpired}\n` +
    `  Matched    : ${cycle.totalMatched}\n` +
    `  Saved      : ${cycle.totalSaved}\n` +
    `  Success    : ${cycle.success ? "✓" : "✗"}`
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
      // GET /api/status — current status + recent cycle logs
      // ---------------------------------------------------------------
      if (path === "/api/status" && req.method === "GET") {
        const lastCycle = cycleLogs[0] || null;
        const totalSaved = cycleLogs.reduce((s, c) => s + c.totalSaved, 0);
        const totalFound = cycleLogs.reduce((s, c) => s + c.totalFound, 0);
        const totalMatched = cycleLogs.reduce((s, c) => s + c.totalMatched, 0);

        return jsonResponse(
          {
            service: "auto-apply-service",
            candidate: "Hambisa Bekuma Tefera",
            port: PORT,
            intervalMinutes: AUTO_SEARCH_INTERVAL_MS / 1000 / 60,
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
                  totalFound: lastCycle.totalFound,
                  totalExpired: lastCycle.totalExpired,
                  totalMatched: lastCycle.totalMatched,
                  totalSaved: lastCycle.totalSaved,
                  success: lastCycle.success,
                }
              : null,
            allTimeStats: {
              totalCycles: cycleLogs.length,
              totalFound,
              totalMatched,
              totalSaved,
            },
            lastLogs: lastCycle?.logs?.slice(-10) || [],
          },
          200,
          corsHeaders
        );
      }

      // ---------------------------------------------------------------
      // GET /api/logs — all cycle logs
      // ---------------------------------------------------------------
      if (path === "/api/logs" && req.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 5, 20);

        return jsonResponse(
          {
            total: cycleLogs.length,
            cycles: cycleLogs.slice(0, limit).map((c) => ({
              cycleId: c.cycleId,
              startedAt: c.startedAt,
              completedAt: c.completedAt,
              totalFound: c.totalFound,
              totalExpired: c.totalExpired,
              totalMatched: c.totalMatched,
              totalSaved: c.totalSaved,
              success: c.success,
              logCount: c.logs.length,
            })),
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
            "GET  /api/logs         — View all cycle logs",
            "GET  /api/logs?limit=5 — View last N cycle summaries",
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
// Startup
// ---------------------------------------------------------------------------

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                  AUTO-APPLY SCHEDULER SERVICE                     ║
║  Candidate : Hambisa Bekuma Tefera                               ║
║  Port      : ${String(PORT).padEnd(47)}║
║  Interval  : Every 1 hour                                        ║
║  Searches  : Ethiopian sites, LinkedIn, Telegram, Remote jobs     ║
║  Delegates : Next.js /api/auto-apply/run?full=true               ║
║  Endpoints :                                                       ║
║    POST /api/auto-search                                          ║
║    GET  /api/status                                               ║
║    GET  /api/logs                                                 ║
╚═══════════════════════════════════════════════════════════════════╝
`);

// Run initial search cycle on startup (with delay for Next.js to be ready)
console.log("[Startup] Initial search cycle will begin in 10 seconds...\n");
setTimeout(() => {
  runSearchCycle().catch((err) => {
    console.error("[Startup] Initial cycle failed:", err);
    isRunning = false;
    currentCycle = null;
  });
}, 10000);

// Schedule recurring cycles every 1 hour
setInterval(() => {
  console.log(`[Scheduler] 1-hour interval triggered at ${nowISO()}`);
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
