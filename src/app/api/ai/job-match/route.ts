import { NextRequest, NextResponse } from 'next/server';

// POST - Detailed job matching analysis (mock)
export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, company, location } = await request.json();

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    const lowerTitle = jobTitle.toLowerCase();
    let skillMatch = 65;
    let experienceMatch = 75;
    let educationMatch = 70;
    let locationMatch = 90;

    // Adjust scores based on job title keywords
    if (lowerTitle.includes('sales') || lowerTitle.includes('marketing') || lowerTitle.includes('business')) {
      skillMatch = 88;
      experienceMatch = 92;
      educationMatch = 78;
    } else if (lowerTitle.includes('manager') || lowerTitle.includes('director') || lowerTitle.includes('head')) {
      skillMatch = 82;
      experienceMatch = 85;
      educationMatch = 80;
    } else if (lowerTitle.includes('data') || lowerTitle.includes('admin') || lowerTitle.includes('assistant')) {
      skillMatch = 60;
      experienceMatch = 65;
      educationMatch = 75;
    } else if (lowerTitle.includes('engineer') || lowerTitle.includes('developer') || lowerTitle.includes('it')) {
      skillMatch = 30;
      experienceMatch = 25;
      educationMatch = 50;
    }

    const overallMatch = Math.round(skillMatch * 0.3 + experienceMatch * 0.3 + educationMatch * 0.2 + locationMatch * 0.2);

    const analysis = {
      overallMatch,
      skillMatch,
      experienceMatch,
      educationMatch,
      locationMatch,
      matchedSkills: ['B2B Sales', 'Territory Management', 'Team Leadership', 'Negotiation', 'Market Research'],
      missingSkills: lowerTitle.includes('engineer') || lowerTitle.includes('developer')
        ? ['Programming', 'Software Development', 'System Design', 'Technical Architecture']
        : ['Digital Marketing', 'CRM Software', 'Data Analytics'],
      transferableSkills: ['Project Management', 'Communication', 'Problem Solving', 'Strategic Planning'],
      gaps: [
        {
          area: 'Digital Tools',
          description: 'Modern roles increasingly require proficiency with digital tools and platforms.',
          severity: 'moderate',
          howToAddress: 'Consider taking online courses in digital marketing, CRM tools (Salesforce, HubSpot), or data analytics.',
        },
      ],
      strengths: [
        '8+ years of progressive sales and marketing experience in Ethiopia',
        'Proven track record of revenue growth (20-30%) across multiple companies',
        'MBA qualification with BSc Agribusiness background',
        'Multilingual (Amharic, English, Afaan Oromo, Somali)',
        'Experience building teams and departments from scratch',
      ],
      salaryExpectation: 'ETB 15,000 - 40,000/month for mid-level roles in Addis Ababa; ETB 30,000 - 60,000/month for senior management positions.',
      recommendation: `Based on the analysis, this ${jobTitle} position at ${company || 'the company'} shows an overall match of ${overallMatch}%. ${overallMatch >= 70 ? 'This is a strong match and I recommend applying with a tailored cover letter highlighting your relevant achievements.' : 'While there are some skill gaps, your transferable skills and experience could still make you a competitive candidate if you position yourself well.'} Focus your application on your quantifiable achievements and leadership experience.`,
      interviewTips: `For this ${jobTitle} role: 1) Prepare specific examples of your sales achievements with numbers, 2) Research ${company || 'the company'} thoroughly, 3) Be ready to discuss how your experience in education/trading/manufacturing translates to this role, 4) Prepare questions about the team structure and growth plans, 5) Practice STAR method answers for behavioral questions.`,
    };

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error('Job Match error:', error);
    return NextResponse.json({ error: 'Failed to analyze job match' }, { status: 500 });
  }
}