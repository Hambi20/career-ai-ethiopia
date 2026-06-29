import { NextRequest, NextResponse } from 'next/server';
import { getStore, createApplication, findApplicationByUrl } from '@/lib/unified-store';

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const logs: string[] = [];
    const seen = new Set<string>();
    let totalApplied = 0;

    logs.push(`[${new Date().toISOString()}] Starting auto-search cycle (in-memory mode)`);

    // Use existing job search results from the store
    const jobs = store.jobSearchResults || [];

    for (const item of jobs) {
      const url = item.url || item.id;
      if (!url || seen.has(url)) continue;
      seen.add(url);

      // Skip social media
      const host = item.host_name || item.source || '';
      if (host.includes('facebook') || host.includes('twitter') || host.includes('instagram')) continue;

      // Check if already tracked
      const existing = findApplicationByUrl(url);
      if (existing) {
        logs.push(`  ↳ Already tracked: "${(item.name || item.title || '').substring(0, 45)}"`);
        continue;
      }

      const title = item.name || item.title || 'Unknown Position';
      const score = Math.floor(Math.random() * 30) + 55; // 55-84 mock score

      if (score >= 50) {
        createApplication({
          jobTitle: title,
          company: item.company || host || null,
          url,
          source: host,
          location: 'Addis Ababa',
          status: 'pending_review',
          matchScore: score,
          coverLetter: null,
          notes: `Auto-search | Match: ${score}/100 | ${host}`,
        });
        totalApplied++;
        logs.push(`  ✅ Saved: "${title.substring(0, 45)}" (${score}%)`);
      }
    }

    logs.push(`[${new Date().toISOString()}] Cycle complete. Saved: ${totalApplied}`);
    return NextResponse.json({ success: true, logs, totalApplied });
  } catch (error) {
    console.error('Auto-search error:', error);
    return NextResponse.json({ error: 'Failed to run auto-search' }, { status: 500 });
  }
}