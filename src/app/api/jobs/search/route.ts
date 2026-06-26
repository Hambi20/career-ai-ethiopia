import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Ethiopian job search sites to target
const ETHIOPIAN_JOB_SITES = [
  'ethiojobs.net',
  'mekanisa.com',
  'jobs.et',
  'addisjobs.com',
  'ethiopianjobs.com',
  'jobwebethiopia.com',
  'ethiocareers.com',
];

export async function POST(request: NextRequest) {
  try {
    const { query, location, category, type, numResults = 15 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Build Ethiopian job search query
    const locationPart = location ? ` in ${location}` : ' in Ethiopia';
    const categoryPart = category ? ` ${category}` : '';
    const typePart = type ? ` ${type}` : '';
    
    const searchQuery = `${query}${categoryPart}${typePart} job${locationPart} site:${ETHIOPIAN_JOB_SITES.slice(0, 4).join(' OR site:')}`;

    // Perform web search
    const results = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: Math.min(numResults, 20),
      recency_days: 30,
    });

    // Also search with a broader query for more results
    const broadQuery = `latest jobs in Ethiopia ${query} ${category || ''} ${location || ''} 2025`;
    const broadResults = await zai.functions.invoke('web_search', {
      query: broadQuery,
      num: Math.min(numResults, 20),
      recency_days: 14,
    });

    // Combine and deduplicate results
    const allResults = [...results, ...broadResults];
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((item: { url: string }) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    // Process and categorize results
    const processedResults = uniqueResults.map((item: {
      url: string;
      name: string;
      snippet: string;
      host_name: string;
      date?: string;
      rank?: number;
    }) => {
      const source = ETHIOPIAN_JOB_SITES.find(site => item.host_name?.includes(site)) || item.host_name;
      
      return {
        id: item.url,
        title: item.name,
        company: extractCompany(item.snippet, item.name),
        location: extractLocation(item.snippet),
        type: extractJobType(item.snippet),
        description: item.snippet,
        url: item.url,
        source: source || item.host_name,
        postedDate: item.date || null,
        deadline: extractDeadline(item.snippet),
        category: category || extractCategory(item.name, item.snippet),
      };
    });

    return NextResponse.json({
      success: true,
      query: searchQuery,
      totalResults: processedResults.length,
      results: processedResults,
    });
  } catch (error: unknown) {
    console.error('Job search error:', error);
    return NextResponse.json(
      { error: 'Failed to search jobs. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper functions to extract structured data from search snippets
function extractCompany(snippet: string, title: string): string {
  const text = `${title} ${snippet}`;
  const patterns = [
    /(?:at|by|from|@)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:is hiring|needs|looking for|seeks)/g,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[1].length > 2 && match[1].length < 40) {
      return match[1];
    }
  }
  return null;
}

function extractLocation(snippet: string): string {
  const ethiopianCities = ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Adama', 'Mekelle', 'Gondar', 'Jimma', 'Dessie', 'Debre Berhan'];
  
  for (const city of ethiopianCities) {
    if (snippet?.includes(city)) {
      return city;
    }
  }
  return 'Ethiopia';
}

function extractJobType(snippet: string): string {
  const lower = (snippet || '').toLowerCase();
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('full-time') || lower.includes('full time')) return 'Full-Time';
  if (lower.includes('part-time') || lower.includes('part time')) return 'Part-Time';
  if (lower.includes('contract')) return 'Contract';
  if (lower.includes('intern')) return 'Internship';
  return null;
}

function extractDeadline(snippet: string): string {
  const patterns = [
    /(?:deadline|apply by|closing date|due)[:\s]*(\w+\s+\d+,\s*\d{4})/i,
    /(?:deadline|apply by)[:\s]*(\d{4}-\d{2}-\d{2})/i,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(snippet || '');
    if (match) return match[1];
  }
  return null;
}

function extractCategory(title: string, snippet: string): string {
  const text = `${title} ${(snippet || '')}`.toLowerCase();
  const categories: Record<string, string> = {
    'engineer': 'Engineering',
    'developer': 'IT & Software',
    'software': 'IT & Software',
    'manager': 'Management',
    'account': 'Finance & Accounting',
    'finance': 'Finance & Accounting',
    'nurse': 'Healthcare',
    'doctor': 'Healthcare',
    'teach': 'Education',
    'marketing': 'Marketing',
    'sales': 'Sales',
    'hr': 'Human Resources',
    'admin': 'Administration',
    'design': 'Design & Creative',
    'lawyer': 'Legal',
    'bank': 'Banking',
    'logistic': 'Logistics',
  };
  
  for (const [keyword, cat] of Object.entries(categories)) {
    if (text.includes(keyword)) return cat;
  }
  return null;
}
