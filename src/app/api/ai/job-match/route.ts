import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// POST - Detailed job matching analysis
export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, company, location } = await request.json();

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    // Get user profile
    const profile = await db.userProfile.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found. Please set up your profile first.' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const skills = JSON.parse(profile.skills || '[]');
    const education = JSON.parse(profile.education || '[]');
    const experience = JSON.parse(profile.experience || '[]');

    const prompt = `You are an expert job matching AI for the Ethiopian job market. Analyze how well this candidate matches the job and provide detailed scoring.

## CANDIDATE PROFILE:
**Name:** ${profile.fullName}
**Title:** ${profile.title}
**Location:** ${profile.location}
**Summary:** ${profile.summary}

**Skills:** ${skills.join(', ')}

**Education:**
${education.map((e: any) => `- ${e.degree} from ${e.institution} (${e.year || 'N/A'})`).join('\n')}

**Experience:**
${experience.map((e: any) => `- ${e.title} at ${e.company} (${e.period})\n  ${e.description}`).join('\n\n')}

## TARGET JOB:
**Title:** ${jobTitle}
${company ? `**Company:** ${company}` : ''}
${location ? `**Location:** ${location}` : ''}
${jobDescription ? `**Description:** ${jobDescription.substring(0, 3000)}` : ''}

---

Respond ONLY with valid JSON (no markdown, no code blocks, no extra text):

{
  "overallMatch": <number 0-100>,
  "skillMatch": <number 0-100>,
  "experienceMatch": <number 0-100>,
  "educationMatch": <number 0-100>,
  "locationMatch": <number 0-100>,
  "matchedSkills": ["<skill1>", "<skill2>", ...],
  "missingSkills": ["<skill1>", "<skill2>", ...],
  "transferableSkills": ["<skill1>", "<skill2>", ...],
  "gaps": [
    {
      "area": "<gap area>",
      "description": "<detailed description>",
      "severity": "critical|moderate|minor",
      "howToAddress": "<how the candidate can address this gap>"
    }
  ],
  "strengths": ["<strength1>", "<strength2>", ...],
  "salaryExpectation": "<realistic salary range in ETB for this role>",
  "recommendation": "<2-3 paragraph recommendation: should they apply? how to position themselves?>",
  "interviewTips": "<specific interview tips for this particular role and company>"
}

SCORING:
- overallMatch: Weighted average (skill 30%, experience 30%, education 20%, location 20%)
- Be realistic - don't inflate scores. A 90+ match should be truly exceptional.
- Consider the Ethiopian job market context for salary expectations.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a JSON-only response API. Always respond with valid JSON, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const analysis = JSON.parse(responseText);

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Job Match error:', error);
    if (error.message?.includes('JSON')) {
      return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to analyze job match' }, { status: 500 });
  }
}
