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

// Broad search queries covering marketing, sales, business dev, commercial, and Telegram channels
const SEARCH_QUERIES = [
  // Direct title matches
  'sales manager Ethiopia 2025 2026 job vacancy',
  'marketing manager Addis Ababa job opening',
  'area sales manager Ethiopia vacancy',
  'sales representative Addis Ababa Ethiopia',
  'business development manager Ethiopia job',
  'route sales Ethiopia vacancy 2025',
  'B2B sales manager Addis Ababa',
  'territory sales manager Ethiopia career',
  // Related roles under marketing & sales umbrella
  'commercial manager Ethiopia job vacancy',
  'marketing executive Ethiopia career 2025',
  'sales executive Addis Ababa vacancy',
  'sales supervisor Ethiopia job opening',
  'business development officer Ethiopia',
  'account manager Ethiopia sales vacancy',
  'regional sales manager Ethiopia 2025',
  'field sales representative Ethiopia job',
  'marketing officer Addis Ababa vacancy',
  'sales coordinator Ethiopia career',
  'brand manager Ethiopia marketing vacancy',
  'trade marketing manager Ethiopia job',
  'channel sales manager Ethiopia vacancy',
  'customer relationship manager Ethiopia sales',
  // Telegram & social media job groups
  'telegram job vacancy Ethiopia sales marketing',
  'Ethiopia job telegram channel sales manager',
  'Ethiopian telegram group job vacancy marketing',
  'zeregna job telegram sales marketing Ethiopia',
  'job vacancy Ethiopia telegram 2025 sales',
  // Broader web search without site filter (catches everything)
  'Ethiopia sales marketing manager job hiring 2025',
  'Addis Ababa sales representative job urgent hiring',
  'Ethiopian job site sales manager vacancy fresh',
];

// Split into two groups: job site queries and broad/telegram queries
const JOB_SITE_QUERIES = SEARCH_QUERIES.slice(0, 16);
const BROAD_QUERIES = SEARCH_QUERIES.slice(16);

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

function getQueries(request: NextRequest): string[] {
  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full');
  if (!full) return JOB_SITE_QUERIES.slice(0, 5);
  return [...JOB_SITE_QUERIES, ...BROAD_QUERIES];
}

// Deep LLM evaluation: checks expiry, position accuracy, match reasoning
async function evaluateJob(job: SearchResult): Promise<{
  score: number; isExpired: boolean; deadline: string | null;
  reasoning: string; positionMatch: string; isRelated: boolean;
}> {
  const zai = await ZAI.create();
  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert Ethiopian recruitment analyst. You carefully evaluate whether a job posting matches a candidate's profile.

Today's date: ${today}

You MUST respond with a JSON object with these exact fields:
- "score": number 0-100 (how well the candidate fits)
- "isExpired": boolean (true if the job deadline has passed or it's clearly outdated)
- "deadline": string or null (the deadline date if mentioned, e.g. "2025-08-15" or "Feb 28, 2025")
- "reasoning": string (2-3 sentences explaining why this job does or doesn't fit)
- "positionMatch": string (one of: "exact_match", "strong_match", "related_role", "weak_match")
- "isRelated": boolean (true if the role is in any way related to marketing, sales, business development, or commercial operations)

Guidelines:
- A job related to sales, marketing, business development, commercial, account management, brand management, trade marketing, field sales, route sales, territory management is "related"
- Check for expiry dates like "Deadline: ...", "Apply before ...", "Closing date ...", "expired", "closed"
- If the deadline has passed, set isExpired=true and score=0 regardless of fit
- Be generous with "related" — if it involves selling, promoting, managing accounts, or growing business, it's related
- Return ONLY valid JSON, no markdown fences`
        },
        {
          role: 'user',
          content: `CANDIDATE PROFILE:
${HAMBISA_CV}

JOB POSTING:
- Title: ${job.name}
- Source: ${job.host_name}
- URL: ${job.url}
- Description: ${job.snippet}
- Date: ${job.date || 'Not specified'}

Evaluate this job against the candidate.`
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
  } catch (err) {
    console.error('[Evaluate] LLM error:', err);
    return {
      score: 0, isExpired: false, deadline: null,
      reasoning: 'Failed to evaluate', positionMatch: 'weak_match', isRelated: false,
    };
  }
}

export async function POST(request: NextRequest) {
  return runAutoApply(request);
}

export async function GET(request: NextRequest) {
  return runAutoApply(request);
}

async function runAutoApply(request: NextRequest) {
  try {
    const zai = await ZAI.create();
    const logs: string[] = [];
    const seen = new Set<string>();
    let totalFound = 0;
    let totalExpired = 0;
    let totalMatched = 0;
    let totalSaved = 0;
    const queries = getQueries(request);

    logs.push(`[${new Date().toISOString()}] Starting smart search (${queries.length} queries, ${BROAD_QUERIES.length > 0 ? 'full mode' : 'quick mode'})`);

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi];
      const isBroad = qi >= JOB_SITE_QUERIES.length;

      try {
        logs.push(`\n[${qi + 1}/${queries.length}] Searching: "${query.substring(0, 60)}" ${isBroad ? '(broad)' : ''}`);

        // Job site queries get site filter, broad queries don't
        const siteFilter = isBroad ? '' : ' site:ethiojobs.net OR site:mekanisa.com OR site:jobs.et OR site:addisjobs.com OR site:jobwebethiopia.com OR site:ethiopianjobs.com OR site:ethiocareers.com';
        const results = await zai.functions.invoke('web_search', {
          query: `${query}${siteFilter}`,
          num: isBroad ? 5 : 8,
          recency_days: 45,
        }) as SearchResult[];

        let found = 0;
        for (const item of results) {
          if (!item || seen.has(item.url)) continue;
          seen.add(item.url);
          if (!item.snippet || item.snippet.length < 30) continue;
          if (item.host_name?.includes('facebook.com') || item.host_name?.includes('twitter.com') || item.host_name?.includes('instagram.com') || item.host_name?.includes('pinterest.com')) continue;

          totalFound++;
          found++;

          try {
            // Deep evaluation with expiry check
            const eval_ = await evaluateJob(item);
            logs.push(`  "${item.name.substring(0, 50)}" → ${eval_.score}% [${eval_.positionMatch}] ${eval_.isExpired ? '⛔ EXPIRED' : eval_.isRelated ? '✓ related' : '✗ unrelated'}`);

            if (eval_.isExpired) {
              totalExpired++;
              continue;
            }

            if (eval_.score < 40 || !eval_.isRelated) {
              logs.push(`  ↳ Skipped (score=${eval_.score}, related=${eval_.isRelated})`);
              continue;
            }

            totalMatched++;

            // Check if already tracked
            const existing = await db.application.findFirst({ where: { url: item.url } });
            if (existing) {
              logs.push(`  ↳ Already tracked (${existing.id.substring(0, 8)})`);
              continue;
            }

            // Generate cover letter
            let coverLetter = '';
            try {
              const clResult = await zai.chat.completions.create({
                messages: [
                  { role: 'assistant', content: 'Write a professional 250-350 word cover letter for Ethiopian job application. Reference the candidate\'s specific experience. Include contact info at top. Follow Ethiopian business norms. Return ONLY the letter text, no preamble.' },
                  { role: 'user', content: `Candidate:\n${HAMBISA_CV}\nPosition: ${item.name}\nCompany: ${extractCompany(item.snippet, item.name) || item.host_name}\nMatch Reasoning: ${eval_.reasoning}\n\nWrite the cover letter:` },
                ],
                thinking: { type: 'disabled' },
              });
              coverLetter = clResult.choices[0]?.message?.content || '';
            } catch { coverLetter = 'Cover letter generation pending.'; }

            // Save as pending review for user approval
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
            totalSaved++;
            logs.push(`  ✅ Saved for review: "${item.name.substring(0, 40)}"`);
          } catch (e) {
            logs.push(`  Error: ${String(e).substring(0, 80)}`);
          }

          // Rate limit throttle
          await new Promise(r => setTimeout(r, 3000));
        }

        logs.push(`  Found ${found} results for this query`);
      } catch (e) {
        logs.push(`Search error: ${String(e).substring(0, 80)}`);
      }

      // Delay between queries
      await new Promise(r => setTimeout(r, 4000));
    }

    logs.push(`\n[${new Date().toISOString()}] Cycle complete:`);
    logs.push(`  Total found: ${totalFound}`);
    logs.push(`  Expired: ${totalExpired} (filtered out)`);
    logs.push(`  Matched (≥40): ${totalMatched}`);
    logs.push(`  New saved for review: ${totalSaved}`);

    return NextResponse.json({
      success: true,
      totalFound,
      totalExpired,
      totalMatched,
      totalSaved,
      logs,
    });
  } catch (error) {
    console.error('Auto-apply error:', error);
    return NextResponse.json({ error: 'Failed to run auto-apply' }, { status: 500 });
  }
}
