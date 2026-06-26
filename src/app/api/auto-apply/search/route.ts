import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

const HAMBISA_PROFILE = `
Name: Hambisa Bekuma Tefera
Phone: +251 952 341 525
Email: hambisa1992@gmail.com
Location: Addis Ababa, Ethiopia
Title: Sales Manager (8+ years experience)
Target: Marketing & Sales Manager, Sales Representative, Area Sales Manager, Route Sales Representative

Skills: Territory Management, Route-to-Market, Market Expansion, Field Team Leadership, Negotiation, B2B Account Management, Distributor Development, Sales Planning, Market Intelligence, Excel Analysis, Team Coaching

Experience:
1. Route Sales Representative - Romel General Trading (Jan 2026-Present) - 150+ B2B accounts
2. Marketing Manager - OL-BRIGHT International College (Dec 2022-Nov 2025) - 30%+ enrollment growth, 2 branches
3. Marketing & Sales Manager - Deran PLC (Dec 2020-Nov 2022) - Built dept from zero, 20% revenue growth
4. Territory Sales Manager - SMADL Communication Terminal Factory PLC (Jul 2016-Nov 2020) - 8+ cities

Education: MBA (2018), BSc Agribusiness (2014)
Languages: Amharic, English, Afaan Oromo, Somali
`;

const SEARCH_QUERIES = [
  "sales manager Ethiopia 2025 2026 job vacancy",
  "marketing manager Addis Ababa job vacancy",
  "area sales manager Ethiopia job",
  "sales representative Addis Ababa Ethiopia",
  "business development manager Ethiopia",
  "route sales Ethiopia vacancy",
  "sales executive Addis Ababa",
  "commercial manager Ethiopia job",
];

interface SearchResult {
  url: string; name: string; snippet: string; host_name: string;
}

function extractCompany(snippet: string, title: string): string {
  const text = `${title} ${snippet}`;
  const patterns = [
    /(?:at|by|from|@)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:is hiring|needs|looking for|seeks)/g,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[1].length > 2 && match[1].length < 40) return match[1];
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const zai = await ZAI.create();
    const logs: string[] = [];
    const seen = new Set<string>();
    let totalApplied = 0;

    logs.push(`[${new Date().toISOString()}] Starting auto-search cycle`);

    for (const query of SEARCH_QUERIES) {
      try {
        logs.push(`Searching: "${query.substring(0, 60)}"`);
        const searchResults = await zai.functions.invoke('web_search', {
          query: `${query} site:ethiojobs.net OR site:mekanisa.com OR site:jobs.et`,
          num: 10,
          recency_days: 30,
        });

        for (const item of searchResults as SearchResult[]) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          if (item.snippet.length < 50) continue;
          if (item.host_name?.includes('facebook') || item.host_name?.includes('twitter') || item.host_name?.includes('instagram')) continue;

          try {
            // Score match
            const scoreResult = await zai.chat.completions.create({
              messages: [
                { role: 'assistant', content: 'Rate how well a job matches a candidate on 0-100. Return ONLY a number.' },
                { role: 'user', content: `Candidate:\n${HAMBISA_PROFILE}\n\nJob: ${item.name}\nSource: ${item.host_name}\nDescription: ${item.snippet}\n\nScore (0-100):` },
              ],
              thinking: { type: 'disabled' },
            });
            const matchScore = parseInt((scoreResult.choices[0]?.message?.content || '0').replace(/[^0-9]/g, '')) || 0;
            logs.push(`  ${item.name.substring(0, 45)}: ${matchScore}%`);

            if (matchScore >= 50) {
              // Generate cover letter
              let coverLetter: string | null = null;
              try {
                const clResult = await zai.chat.completions.create({
                  messages: [
                    { role: 'assistant', content: 'Write a 200-300 word cover letter for Ethiopian job application. Reference specific experience. Return only the letter text.' },
                    { role: 'user', content: `Candidate:\n${HAMBISA_PROFILE}\nPosition: ${item.name}\nCompany: ${extractCompany(item.snippet, item.name) || item.host_name}\n\nWrite cover letter:` },
                  ],
                  thinking: { type: 'disabled' },
                });
                coverLetter = clResult.choices[0]?.message?.content || null;
              } catch { logs.push('  Cover letter failed'); }

              // Save to DB
              await db.application.create({
                data: {
                  jobTitle: item.name,
                  company: extractCompany(item.snippet, item.name),
                  url: item.url,
                  source: item.host_name,
                  status: 'pending_review',
                  matchScore,
                  coverLetter,
                  notes: `Pending review | Match: ${matchScore}/100 | ${item.host_name}`,
                },
              });
              totalApplied++;
              logs.push(`  ✅ Saved: "${item.name.substring(0, 40)}"`);
            }
          } catch (e) {
            logs.push(`  Error evaluating: ${String(e).substring(0, 80)}`);
          }
        }
      } catch (e) {
        logs.push(`Search error "${query.substring(0, 40)}": ${String(e).substring(0, 80)}`);
      }
    }

    logs.push(`[${new Date().toISOString()}] Cycle complete. Applied: ${totalApplied}`);
    return NextResponse.json({ success: true, logs, totalApplied });
  } catch (error) {
    console.error('Auto-search error:', error);
    return NextResponse.json({ error: 'Failed to run auto-search' }, { status: 500 });
  }
}
