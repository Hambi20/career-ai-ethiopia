import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription } = await request.json();
    if (!jobTitle || !company) {
      return NextResponse.json({ success: false, error: 'jobTitle and company required' }, { status: 400 });
    }

    const coverLetter = `Dear Hiring Manager at ${company},

I am writing to express my strong interest in the ${jobTitle} position. With my diverse experience and proven track record, I believe I would be an excellent addition to your team.

${jobDescription ? `Having reviewed the job description, I am particularly excited about the opportunity to contribute my skills to your organization. The role's requirements align well with my background and professional aspirations.` : ''}

Key strengths I would bring to this role:
• Strong analytical and problem-solving abilities
• Excellent communication and teamwork skills
• Proven ability to deliver results in fast-paced environments
• Commitment to continuous learning and professional development

I would welcome the opportunity to discuss how my experience and qualifications make me a strong candidate for this position. Thank you for considering my application.

Best regards,
Hambisa Bekuma Tefera
Addis Ababa, Ethiopia
+251 952 341 525`;

    return NextResponse.json({ success: true, coverLetter });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}