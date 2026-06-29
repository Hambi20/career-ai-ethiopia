import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for CV analysis
let cachedAnalysis: any = null;

// POST - Run CV analysis (mock)
export async function POST(request: NextRequest) {
  try {
    const { forceNew } = await request.json();

    if (!forceNew && cachedAnalysis) {
      return NextResponse.json({ success: true, analysis: cachedAnalysis, fromCache: true });
    }

    cachedAnalysis = {
      id: Date.now().toString(),
      overallScore: 78,
      atsScore: 72,
      formatScore: 85,
      contentScore: 76,
      strengths: [
        'Strong quantifiable achievements (150+ B2B accounts, 30%+ enrollment growth, 20% revenue growth)',
        'Progressive career trajectory from Territory Manager to Marketing Manager to Route Sales Rep',
        'Diverse language skills (Amharic, English, Afaan Oromo, Somali) - major asset in Ethiopian market',
        'MBA qualification with relevant BSc in Agribusiness',
        'Broad experience across multiple industries (education, FMCG, manufacturing, trading)',
      ],
      weaknesses: [
        'CV summary could be more impactful with a clear value proposition statement',
        'Missing specific certifications or professional development courses',
        'Could benefit from more quantifiable metrics in earlier roles',
        'No mention of digital skills or CRM tools proficiency',
      ],
      missingSkills: [
        'Digital Marketing (Google Ads, Social Media Marketing)',
        'CRM Software (Salesforce, HubSpot)',
        'Data Analytics (Excel advanced, Power BI)',
        'Project Management Certification (PMP, PRINCE2)',
      ],
      suggestions: [
        { title: 'Add a Professional Summary', description: 'Add a 2-3 sentence summary at the top highlighting your key value proposition and career focus.', priority: 'high', category: 'content' },
        { title: 'Include Digital Skills', description: 'Add CRM tools, digital marketing platforms, and data analysis tools you use.', priority: 'high', category: 'skills' },
        { title: 'Quantify Earlier Achievements', description: 'Add specific numbers and metrics to your SMADL Communication role achievements.', priority: 'medium', category: 'content' },
        { title: 'Add Certifications', description: 'List any professional certifications, workshops, or training programs completed.', priority: 'medium', category: 'content' },
      ],
      industryTips: 'The Ethiopian job market increasingly values digital literacy alongside traditional sales skills. Many employers in Addis Ababa are looking for candidates who can bridge traditional sales approaches with digital tools. Consider highlighting any experience with mobile money platforms, digital payment systems, or e-commerce, as these are growing rapidly in Ethiopia. Networking through professional associations and LinkedIn is becoming more common in Ethiopia — a well-maintained LinkedIn profile can significantly boost your visibility.',
      recommendation: 'Your CV is strong for mid-level sales and marketing positions in Ethiopia. The 8+ years of diverse experience is a major asset. To improve your competitiveness for senior roles, focus on three areas: 1) Strengthen the professional summary with a clear value proposition, 2) Add digital skills and tools proficiency, and 3) Include more quantifiable achievements. For the Ethiopian market, consider creating both Amharic and English versions of your CV depending on the employer.',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, analysis: cachedAnalysis, fromCache: false });
  } catch (error) {
    console.error('CV Analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze CV' }, { status: 500 });
  }
}

// GET - Get latest CV analysis
export async function GET() {
  try {
    return NextResponse.json({ success: true, analysis: cachedAnalysis });
  } catch (error) {
    console.error('Fetch CV analysis error:', error);
    return NextResponse.json({ error: 'Failed to fetch CV analysis' }, { status: 500 });
  }
}

// DELETE - Clear CV analysis cache
export async function DELETE() {
  try {
    cachedAnalysis = null;
    return NextResponse.json({ success: true, message: 'CV analysis cache cleared' });
  } catch (error) {
    console.error('Clear CV analysis error:', error);
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
  }
}