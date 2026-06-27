import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// POST - Generate interview preparation
export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, forceNew } = await request.json();

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    // Check for existing prep with same job title and company
    if (!forceNew) {
      const existing = await db.interviewPrep.findFirst({
        where: { jobTitle, company: company || null },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return NextResponse.json({ success: true, prep: existing, fromCache: true });
      }
    }

    // Get user profile
    const profile = await db.userProfile.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const zai = await ZAI.create();

    const profileContext = profile ? `
**Candidate Profile:**
- Name: ${profile.fullName || 'Not set'}
- Current Title: ${profile.title || 'Not set'}
- Skills: ${profile.skills || 'Not set'}
- Location: ${profile.location || 'Not set'}
- Summary: ${profile.summary || 'Not set'}
` : '';

    const prompt = `You are an expert interview coach specializing in the Ethiopian job market. Generate comprehensive interview preparation for this candidate.

${profileContext}
**Target Position:** ${jobTitle}
${company ? `**Target Company:** ${company}` : ''}
${jobDescription ? `**Job Description:** ${jobDescription.substring(0, 2000)}` : ''}

---

Respond ONLY with valid JSON (no markdown, no code blocks, no extra text) in this exact format:

{
  "questions": [
    {
      "question": "<interview question>",
      "suggestedAnswer": "<detailed 3-4 sentence suggested answer tailored to the candidate's profile>",
      "category": "behavioral|technical|situational|cultural|salary",
      "difficulty": "easy|medium|hard",
      "whyAsk": "<brief explanation of why this question is asked>"
    }
  ],
  "companyResearch": "<2-3 paragraphs about what to research about the company and how to demonstrate knowledge in the interview>",
  "tips": "<2-3 paragraphs of specific interview tips for this role and company in the Ethiopian context, including cultural considerations>"
}

Generate exactly 12 questions covering these categories:
1. 3 behavioral questions (STAR method)
2. 3 technical/skills questions specific to the role
3. 2 situational/problem-solving questions
4. 2 cultural fit questions (Ethiopian workplace context)
5. 1 salary negotiation question
6. 1 closing/your questions question

Each suggested answer MUST be personalized to the candidate's actual profile and experience. Don't give generic answers - reference their specific skills, education, and work history.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a JSON-only response API. Always respond with valid JSON, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const prep = JSON.parse(responseText);

    // Save to database
    const saved = await db.interviewPrep.create({
      data: {
        jobTitle,
        company: company || null,
        jobDescription: jobDescription ? jobDescription.substring(0, 5000) : null,
        questions: JSON.stringify(prep.questions || []),
        companyResearch: prep.companyResearch || '',
        tips: prep.tips || '',
      },
    });

    return NextResponse.json({ success: true, prep: saved, fromCache: false });
  } catch (error: any) {
    console.error('Interview Prep error:', error);
    if (error.message?.includes('JSON')) {
      return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate interview prep' }, { status: 500 });
  }
}

// GET - Get interview prep history
export async function GET() {
  try {
    const preps = await db.interviewPrep.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, preps });
  } catch (error) {
    console.error('Fetch interview prep error:', error);
    return NextResponse.json({ error: 'Failed to fetch interview prep' }, { status: 500 });
  }
}

// DELETE - Clear interview prep history
export async function DELETE() {
  try {
    await db.interviewPrep.deleteMany({});
    return NextResponse.json({ success: true, message: 'Interview prep history cleared' });
  } catch (error) {
    console.error('Clear interview prep error:', error);
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
  }
}
