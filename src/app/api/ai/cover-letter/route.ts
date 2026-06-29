import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, userName, userSkills, tone = 'professional' } = await request.json();

    if (!jobTitle || !company) {
      return NextResponse.json(
        { error: 'Job title and company are required' },
        { status: 400 }
      );
    }

    const name = userName || 'Hambisa Bekuma Tefera';
    const skills = Array.isArray(userSkills) ? userSkills.join(', ') : 'Territory Management, Route-to-Market, Market Expansion, B2B Account Management, Sales Planning, Team Leadership';

    const coverLetter = generateMockCoverLetter({ jobTitle, company, name, skills, tone, jobDescription });

    return NextResponse.json({
      success: true,
      coverLetter,
    });
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter. Please try again.' },
      { status: 500 }
    );
  }
}

function generateMockCoverLetter(params: {
  jobTitle: string;
  company: string;
  name: string;
  skills: string;
  tone: string;
  jobDescription?: string;
}): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `${params.name}
hambisa1992@gmail.com | +251 952 341 525 | Addis Ababa, Ethiopia

${today}

Hiring Manager
${params.company}

Re: Application for ${params.jobTitle}

Dear Hiring Manager,

I am writing to express my strong interest in the ${params.jobTitle} position at ${params.company}. With over eight years of progressive experience in sales, marketing, and business development across Eastern Ethiopia and Addis Ababa, I am confident in my ability to make a meaningful contribution to your organization.

Throughout my career, I have consistently delivered measurable results. At Romel General Trading, I manage over 150 B2B accounts across weekly routes, consistently acquiring new accounts each month. Previously, as Marketing Manager at OL-BRIGHT International College, I achieved a 30%+ increase in enrollment and successfully opened two new branch locations. At Deran PLC, I built the marketing and sales department from the ground up, resulting in 20% revenue growth within two years.

My core competencies include ${params.skills}, and field team leadership. I hold an MBA and a BSc in Agribusiness, and I am fluent in Amharic, English, Afaan Oromo, and conversational in Somali — enabling effective communication across Ethiopia's diverse professional landscape.

I am particularly drawn to ${params.company} because of its reputation in the market, and I believe my experience in territory management and market expansion aligns well with the requirements of this role. I am eager to bring my skills and dedication to your team.

I would welcome the opportunity to discuss how my background and achievements can benefit ${params.company}. Thank you for considering my application.

Sincerely,
${params.name}`;
}