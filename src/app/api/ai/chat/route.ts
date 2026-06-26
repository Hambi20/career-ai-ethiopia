import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { message, context = 'job-search' } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user profile for context
    const profile = await db.userProfile.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Save user message
    await db.chatMessage.create({
      data: { role: 'user', content: message },
    });

    const zai = await ZAI.create();

    // Build system prompt based on context
    const systemPrompts: Record<string, string> = {
      'job-search': `You are an expert Ethiopian job search assistant. You help job seekers in Ethiopia find and apply for jobs. You know about major Ethiopian job sites like EthioJobs.net, Mekanisa.com, Jobs.et, and others. You provide advice on:
- Job search strategies for Ethiopian market
- Resume/CV writing tips for Ethiopian employers
- Interview preparation for Ethiopian companies
- Salary expectations in Ethiopia
- Career development in the Ethiopian context
- Application tips and follow-up best practices

${profile ? `The user's profile: Name: ${profile.fullName || 'Not set'}, Title: ${profile.title || 'Not set'}, Skills: ${profile.skills || 'Not set'}, Location: ${profile.location || 'Not set'}, Summary: ${profile.summary || 'Not set'}` : 'The user has not set up their profile yet.'}

Respond in a friendly, helpful, and encouraging tone. Be concise and actionable.`,
      'interview': `You are an expert interview coach specializing in Ethiopian job interviews. You help candidates prepare for interviews at Ethiopian companies. You provide:
- Common interview questions for Ethiopian companies
- STAR method answer frameworks
- Cultural tips for Ethiopian professional settings
- Salary negotiation advice for Ethiopian market
- Follow-up email templates

${profile ? `The user's profile: Name: ${profile.fullName || 'Not set'}, Title: ${profile.title || 'Not set'}, Skills: ${profile.skills || 'Not set'}` : ''}

Respond in a supportive and practical tone.`,
      'career': `You are a career counselor specializing in the Ethiopian job market. You provide guidance on:
- Career path planning in Ethiopia
- Skill development recommendations
- Industry trends in Ethiopia
- Education and certification advice
- Networking strategies in Ethiopian professional circles

${profile ? `The user's profile: Name: ${profile.fullName || 'Not set'}, Title: ${profile.title || 'Not set'}, Skills: ${profile.skills || 'Not set'}` : ''}

Respond with actionable and encouraging advice.`,
    };

    // Get recent chat history for context
    const recentMessages = await db.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const chatHistory = recentMessages.reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Build messages array
    const messages = [
      {
        role: 'assistant' as const,
        content: systemPrompts[context] || systemPrompts['job-search'],
      },
      ...chatHistory.slice(0, -1), // Exclude the just-saved user message since we'll add it
      { role: 'user' as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.';

    // Save AI response
    await db.chatMessage.create({
      data: { role: 'assistant', content: aiResponse },
    });

    return NextResponse.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}

// GET - Get chat history
export async function GET() {
  try {
    const messages = await db.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error('Fetch chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// DELETE - Clear chat history
export async function DELETE() {
  try {
    await db.chatMessage.deleteMany({});

    return NextResponse.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
