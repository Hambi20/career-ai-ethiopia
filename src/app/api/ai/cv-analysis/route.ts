import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// POST - Run CV analysis
export async function POST(request: NextRequest) {
  try {
    const { forceNew } = await request.json();

    // Check for existing analysis
    if (!forceNew) {
      const existing = await db.cvAnalysis.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return NextResponse.json({ success: true, analysis: existing, fromCache: true });
      }
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

    const prompt = `You are an expert CV/Resume analyst specializing in the Ethiopian and East African job market. Analyze the following professional profile and provide detailed scoring and recommendations.

## PROFILE DATA:
**Name:** ${profile.fullName || 'Not set'}
**Title:** ${profile.title || 'Not set'}
**Location:** ${profile.location || 'Not set'}
**Email:** ${profile.email || 'Not set'}
**Phone:** ${profile.phone || 'Not set'}

**Summary:**
${profile.summary || 'No summary provided'}

**Skills (${skills.length}):**
${skills.join(', ')}

**Education (${education.length}):**
${education.map((e: any) => `- ${e.degree} from ${e.institution} (${e.year || 'N/A'})`).join('\n')}

**Experience (${experience.length}):**
${experience.map((e: any) => `- ${e.title} at ${e.company} (${e.period || 'N/A'})\n  ${e.description || 'No description'}`).join('\n\n')}

---

Respond ONLY with valid JSON (no markdown, no code blocks, no extra text) in this exact format:

{
  "overallScore": <number 0-100>,
  "atsScore": <number 0-100>,
  "formatScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "strengths": ["<strength1>", "<strength2>", ...],
  "weaknesses": ["<weakness1>", "<weakness2>", ...],
  "missingSkills": ["<skill1>", "<skill2>", ...],
  "suggestions": [
    {
      "title": "<suggestion title>",
      "description": "<detailed description>",
      "priority": "high|medium|low",
      "category": "skills|format|content|strategy"
    }
  ],
  "industryTips": "<2-3 paragraphs of industry-specific tips for Ethiopian job market>",
  "recommendation": "<3-4 paragraph detailed recommendation for improving this CV/profile>"
}

SCORING CRITERIA:
- **Overall (0-100)**: Weighted average considering ATS compatibility, content quality, and formatting
- **ATS Score (0-100)**: How well keywords, skills, and structure match Applicant Tracking Systems used by Ethiopian employers
- **Format Score (0-100)**: Structure, organization, readability, professional presentation
- **Content Score (0-100)**: Depth of experience descriptions, quantifiable achievements, action verbs, clarity

Important: Be honest but constructive. Focus on actionable improvements for the Ethiopian job market. Consider both local and international opportunities.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a JSON-only response API. Always respond with valid JSON, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    // Clean up response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const analysis = JSON.parse(responseText);

    // Save to database
    const saved = await db.cvAnalysis.create({
      data: {
        overallScore: analysis.overallScore,
        strengths: JSON.stringify(analysis.strengths || []),
        weaknesses: JSON.stringify(analysis.weaknesses || []),
        missingSkills: JSON.stringify(analysis.missingSkills || []),
        atsScore: analysis.atsScore,
        formatScore: analysis.formatScore,
        contentScore: analysis.contentScore,
        suggestions: JSON.stringify(analysis.suggestions || []),
        industryTips: analysis.industryTips || '',
        recommendation: analysis.recommendation || '',
      },
    });

    return NextResponse.json({ success: true, analysis: saved, fromCache: false });
  } catch (error: any) {
    console.error('CV Analysis error:', error);
    if (error.message?.includes('JSON')) {
      return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to analyze CV' }, { status: 500 });
  }
}

// GET - Get latest CV analysis
export async function GET() {
  try {
    const analysis = await db.cvAnalysis.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      return NextResponse.json({ success: true, analysis: null });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error('Fetch CV analysis error:', error);
    return NextResponse.json({ error: 'Failed to fetch CV analysis' }, { status: 500 });
  }
}

// DELETE - Clear CV analysis history
export async function DELETE() {
  try {
    await db.cvAnalysis.deleteMany({});
    return NextResponse.json({ success: true, message: 'CV analysis history cleared' });
  } catch (error) {
    console.error('Clear CV analysis error:', error);
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
  }
}
