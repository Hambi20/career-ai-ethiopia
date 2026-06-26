import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, userName, userSkills, userExperience, tone = 'professional' } = await request.json();

    if (!jobTitle || !company) {
      return NextResponse.json(
        { error: 'Job title and company are required' },
        { status: 400 }
      );
    }

    // Get user profile if not provided
    let profile = null;
    if (!userName || !userSkills) {
      profile = await db.userProfile.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
    }

    const name = userName || profile?.fullName || 'Applicant';
    const skills = userSkills || (profile?.skills ? JSON.parse(profile.skills) : []);
    const experience = userExperience || (profile?.experience ? JSON.parse(profile.experience || '[]') : []);
    const summary = profile?.summary || '';

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a professional cover letter writer specializing in Ethiopian job applications. Write a compelling, ${tone} cover letter. The letter should be well-structured with proper formatting. Return the cover letter as plain text (not JSON). Make it specific to the job and company. Keep it concise but impactful - around 300-400 words. Include Ethiopian cultural professional norms.`
        },
        {
          role: 'user',
          content: `Write a cover letter for:

Position: ${jobTitle}
Company: ${company}
${jobDescription ? `Job Description:\n${jobDescription.substring(0, 2000)}` : ''}

Applicant Information:
Name: ${name}
Skills: ${skills.join(', ') || 'Not specified'}
Experience: ${experience.map((e: { title?: string; company?: string }) => `${e.title || 'Position'} at ${e.company || 'Company'}`).join('; ') || 'Not specified'}
${summary ? `Summary: ${summary}` : ''}`
        }
      ],
      thinking: { type: 'disabled' }
    });

    const coverLetter = completion.choices[0]?.message?.content || '';

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
