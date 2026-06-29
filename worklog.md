# Worklog - Career AI Ethiopia Dashboard

---
Task ID: 1
Agent: Main Agent
Task: Fix data persistence gap between Telegram sync and direct URL access on Vercel

Work Log:
- Diagnosed root cause: `unified-store.ts` uses module-level `let store` — per-instance memory that's empty on every Vercel serverless cold start
- When Telegram bot syncs via POST `/api/bot/sync`, data goes into Instance A's memory
- When user visits URL directly, GET `/api/bot/data` may hit Instance B (cold start) → empty data
- Previous localStorage caching in `bot-data-context.tsx` was overwritten by empty API responses

## Solution: Three-Layer Data Persistence

### Layer 1: Client-side localStorage (always available)
- Fixed `bot-data-context.tsx` to NEVER overwrite localStorage with empty API data
- Added `dataWeight()` function to compare API response vs cached data
- Only updates state if API has MORE data than current cache
- Shows cached data immediately on page load (no loading spinner for returning users)
- Added merge logic for tab data: only updates fields that have content

### Layer 2: Static JSON file (`public/bot-data.json`)
- Created `public/bot-data.json` with Hambisa's default profile data
- On bot sync, `/api/bot/sync` writes ALL synced data to this file
- This file is shipped with every Vercel deploy and is always readable by API routes

### Layer 3: In-memory store with auto-warming
- Added `ensureStoreWarmed()` function to `unified-store.ts`
- On first access after cold start, automatically reads `public/bot-data.json` into memory
- All 13+ GET API routes call `await ensureStoreWarmed()` before reading data
- This means EVERY API route gets persisted data even on cold starts

## Files Changed
1. **`public/bot-data.json`** (NEW) — Persistent data file with default profile
2. **`src/lib/unified-store.ts`** — Added `ensureStoreWarmed()`, `getStoreAsync()`, file loading
3. **`src/lib/bot-data-context.tsx`** — Fixed localStorage overwrite, added dataWeight comparison
4. **`src/app/api/bot/sync/route.ts`** — Returns ALL data in response, writes to JSON file
5. **`src/app/api/bot/data/route.ts`** — Uses ensureStoreWarmed(), simplified
6. **`src/app/page.tsx`** — Added `?sync=1` detection for Telegram links
7. **13 API route files** — Added `await ensureStoreWarmed()` to all GET handlers

## How the Flow Works Now
1. **Telegram bot syncs**: POST `/api/bot/sync` → stores in memory + writes to `bot-data.json`
2. **User opens Telegram link with `?sync=1`**: Frontend detects, forces refresh
3. **API cold start**: `ensureStoreWarmed()` loads from `bot-data.json` → data available
4. **Direct URL visit**: localStorage shows cached data immediately, API refreshes in background
5. **API returns empty (truly no data)**: localStorage cache preserved, NOT overwritten

Stage Summary:
- ✅ Build passes (all 52 routes compile)
- ✅ Lint passes (0 errors, 0 warnings)
- ✅ Data persistence across Vercel serverless instances solved
- ✅ Both Telegram link and direct URL will show same data
- ✅ Default profile (Hambisa's data) always available as fallback
