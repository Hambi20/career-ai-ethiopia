import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const result = await zai.functions.invoke('page_reader', {
      url: url,
    });

    // Extract plain text from HTML
    const html = result.data?.html || '';
    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    // Use LLM to extract structured job information
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a job listing analyzer. Extract structured information from job posting content. Return ONLY valid JSON with these fields: title, company, location, type, salary, description (full job description), requirements (array of strings), responsibilities (array of strings), qualifications (array of strings), deadline, contactEmail, contactPhone. If a field cannot be found, set it to null. Keep the description detailed but concise.`
        },
        {
          role: 'user',
          content: `Analyze this job posting and extract structured data:\n\nTitle: ${result.data?.title || 'Unknown'}\n\nContent:\n${plainText.substring(0, 8000)}`
        }
      ],
      thinking: { type: 'disabled' }
    });

    const aiResponse = completion.choices[0]?.message?.content || '{}';
    
    let jobData;
    try {
      // Try to parse JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      jobData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      jobData = {};
    }

    return NextResponse.json({
      success: true,
      url: url,
      pageTitle: result.data?.title || '',
      rawContent: plainText.substring(0, 3000),
      extractedData: {
        title: jobData.title || result.data?.title || '',
        company: jobData.company || null,
        location: jobData.location || null,
        type: jobData.type || null,
        salary: jobData.salary || null,
        description: jobData.description || plainText.substring(0, 2000),
        requirements: jobData.requirements || [],
        responsibilities: jobData.responsibilities || [],
        qualifications: jobData.qualifications || [],
        deadline: jobData.deadline || null,
        contactEmail: jobData.contactEmail || null,
        contactPhone: jobData.contactPhone || null,
      },
    });
  } catch (error: unknown) {
    console.error('Job read error:', error);
    return NextResponse.json(
      { error: 'Failed to read job page. The page may be inaccessible or protected.' },
      { status: 500 }
    );
  }
}
