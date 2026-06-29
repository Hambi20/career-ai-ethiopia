---
Task ID: 1
Agent: Main Agent
Task: Fix Telegram bot not replying on Vercel

Work Log:
- Read webhook route at /src/app/api/telegram/webhook/route.ts
- Identified critical bug: fire-and-forget pattern (processUpdate runs as unawaited promise, Vercel freezes function before it completes)
- Identified secondary issue: AI chat handler makes self-call to same deployment (adds latency, risks cold start)
- Fixed webhook POST handler to await processUpdate (keeps function alive during processing)
- Moved AI chat logic inline using z-ai-web-dev-sdk (eliminates self-call pattern)
- Added conversation store keyed by chatId for persistent conversation context
- Created vercel.json with maxDuration: 60 for webhook and 30 for AI chat routes
- Added logging to sendTelegramMessage for debugging failed sends
- Added logging to processUpdate for incoming messages

Stage Summary:
- Root cause: Vercel serverless freezes function after returning 200, killing background promises
- Fix: await processUpdate instead of fire-and-forget
- Improvement: inline AI chat eliminates self-call (faster, fewer cold starts)
- Files changed: src/app/api/telegram/webhook/route.ts (major rewrite), vercel.json (new)
- Lint: 0 errors, 0 warnings
- All routes returning 200 in dev server
