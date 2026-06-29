import { NextResponse } from 'next/server';

export async function POST() {
  // Returns a mock analysis result since CV analysis would need AI integration
  return NextResponse.json({
    success: true,
    analysis: {
      overallScore: 72,
      sections: {
        experience: { score: 78, feedback: 'Good experience coverage' },
        education: { score: 85, feedback: 'Strong educational background' },
        skills: { score: 68, feedback: 'Could benefit from more technical skills' },
        formatting: { score: 65, feedback: 'Consider improving layout' },
      },
      suggestions: [
        'Add quantifiable achievements to each role',
        'Include a professional summary section',
        'Optimize for ATS compatibility',
        'Add relevant keywords for target roles',
      ],
    },
  });
}