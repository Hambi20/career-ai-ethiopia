import { NextRequest, NextResponse } from 'next/server';
import { getKnowledge } from '@/lib/unified-store';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ success: false, error: 'query required' }, { status: 400 });
    const knowledge = getKnowledge();
    const q = query.toLowerCase();
    const matches = knowledge.filter((k: any) => {
      const title = (k.title || k.name || '').toLowerCase();
      const content = (k.content || k.body || '').toLowerCase();
      const category = (k.category || '').toLowerCase();
      return title.includes(q) || content.includes(q) || category.includes(q);
    });
    const answer = matches.length > 0
      ? `Found ${matches.length} results:\n${matches.slice(0, 5).map((m: any, i: number) => `${i + 1}. ${m.title || m.name}: ${(m.content || '').slice(0, 200)}`).join('\n')}`
      : 'No matching documents found. Try different keywords.';
    return NextResponse.json({ success: true, answer, results: matches });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}