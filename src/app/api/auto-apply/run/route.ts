import { NextResponse } from 'next/server';
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
TARGET ROLES: Marketing & Sales Manager, Sales Representative, Area Sales Manager, Route Sales Representative, Business Development Manager
`;

const SEARCH_QUERIES = [
  'sales manager Ethiopia 2025 2026 job vacancy',
  'marketing manager Addis Ababa job opening',
  'area sales manager Ethiopia vacancy',
  'sales representative Addis Ababa Ethiopia',
  'business development manager Ethiopia job',
  'route sales Ethiopia vacancy 2025',
  'B2B sales manager Addis Ababa',
  'territory sales manager Ethiopia career',
];

// Use first 3 queries for quick runs, more for full runs
function getQueries(request: NextRequest): string[] {
  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full');
  return full ? SEARCH_QUERIES : SEARCH_QUERIES.slice(0, 3);
}

interface SearchResult {
  url: string; name: string; snippet: string; host_name: string; date?: string;
}

function extractCompany(text: string, title: string): string {
  const combined = `${title} ${text}`;
  const patterns = [
    /(?:at|@|by|from)\s+([A-Z][A-Za-z&\s]{2,30}?)(?:\s*[-–|,.\n:;]|\s+(?:is|hiring|needs|looking|seeks)|$)/,
    /([A-Z][A-Za-z&\s]{2,30}?)\s+(?:is hiring|needs|looking for|seeks|wants|invites)/i,
  ];
  for (const pat of patterns) {
    const m = combined.match(pat);
    if (m && m[1]) {
      const name = m[1].trim();
      const bad = ['Ethiopia', 'Addis Ababa', 'Job', 'Vacancy', 'Career', 'Hiring', 'View', 'Apply', 'Click', 'Read', 'More', 'Details', 'Full'];
      if (!bad.includes(name)) return name;
    }
  }
  return null;
}

// GET: Run auto-apply (trigger via GET for simplicity from frontend)
// POST: Also supported
export async function GET(request: NextRequest) {
  return runAutoApply(request);
}

export async function POST(request: NextRequest) {
  return runAutoApply(request);
}

async function runAutoApply(request: NextRequest) {
  try {
    const zai = await ZAI.create();
    const logs: string[] = [];
    const seen = new Set<string>();
    let totalFound = 0;
    let totalMatched = 0;
    let totalSaved = 0;
    const queries = getQueries(request);

    logs.push(`[${new Date().toISOString()}] Starting auto-apply cycle (${queries.length} queries)`);

    for (const query of queries) {
      try {
        logs.push(`Searching: "${query.substring(0, 50)}..."`);

        const siteFilter = 'site:ethiojobs.net OR site:mekanisa.com OR site:jobs.et OR site:addisjobs.com';
        const results = await zai.functions.invoke('web_search', {
          query: `${query} ${siteFilter}`,
          num: 8,
          recency_days: 30,
        }) as SearchResult[];

        for (const item of results) {
          if (!item || seen.has(item.url)) continue;
          seen.add(item.url);
          if (!item.snippet || item.snippet.length < 40) continue;
          if (item.host_name?.includes('facebook') || item.host_name?.includes('twitter')) continue;

          totalFound++;

          try {
            // Quick LLM score
            const scoreResult = await zai.chat.completions.create({
              messages: [
                { role: 'assistant', content: 'You are a recruiter. Rate 0-100. Return ONLY a number.' },
                { role: 'user', content: `Candidate:\n${HAMBISA_CV}\n\nJob: ${item.name}\nSource: ${item.host_name}\nDescription: ${item.snippet}\n\nScore (0-100):` },
              ],
              thinking: { type: 'disabled' },
            });
            const matchScore = parseInt((scoreResult.choices[0]?.message?.content || '0').replace(/[^0-9]/g, '')) || 0;
            logs.push(`  "${item.name.substring(0, 45)}" → ${matchScore}%`);

            if (matchScore >= 50) {
              totalMatched++;

              // Generate cover letter
              let coverLetter = '';
              try {
                const clResult = await zai.chat.completions.create({
                  messages: [
                    { role: 'assistant', content: 'Write a 250-350 word professional cover letter for Ethiopian job application. Reference specific experience. Return only the letter text.' },
                    { role: 'user', content: `Candidate:\n${HAMBISA_CV}\nPosition: ${item.name}\nCompany: ${extractCompany(item.snippet, item.name) || item.host_name}\n\nWrite cover letter:` },
                  ],
                  thinking: { type: 'disabled' },
                });
                coverLetter = clResult.choices[0]?.message?.content || '';
              } catch { coverLetter = 'Cover letter generation pending.'; }

              // Check if already applied
              const existing = await db.application.findFirst({ where: { url: item.url } });
              if (existing) {
                logs.push(`  ↳ Already tracked (ID: ${existing.id.substring(0, 8)})`);
                continue;
              }

              // Save application
              await db.application.create({
                data: {
                  jobTitle: item.name,
                  company: extractCompany(item.snippet, item.name),
                  url: item.url,
                  source: item.host_name,
                  location: 'Addis Ababa',
                  status: 'auto-applied',
                  matchScore,
                  coverLetter,
                  notes: `Auto-applied | Match: ${matchScore}/100 | Query: "${query.substring(0, 40)}"`,
                  appliedAt: new Date(),
                },
              });
              totalSaved++;
              logs.push(`  ✅ Saved: "${item.name.substring(0, 40)}"`);
            }
          } catch (e) {
            logs.push(`  Error: ${String(e).substring(0, 80)}`);
          }

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 4000));
        }
      } catch (e) {
        logs.push(`Search error: ${String(e).substring(0, 80)}`);
      }

      // Delay between queries
      await new Promise(r => setTimeout(r, 6000));
    }

    logs.push(`[${new Date().toISOString()}] Cycle complete: ${totalFound} found, ${totalMatched} matched (≥50), ${totalSaved} saved`);

    return NextResponse.json({
      success: true,
      totalFound,
      totalMatched,
      totalSaved,
      logs,
    });
  } catch (error) {
    console.error('Auto-apply error:', error);
    return NextResponse.json({ error: 'Failed to run auto-apply' }, { status: 500 });
  }
}
