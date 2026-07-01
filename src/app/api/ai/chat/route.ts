import { NextRequest, NextResponse } from 'next/server';
import { createChatMessage, getChatMessages, clearChatMessages, ensureStoreWarmed } from '@/lib/unified-store';

const SYSTEM_PROMPT = `You are Career AI Ethiopia — a friendly, knowledgeable AI assistant specializing in the Ethiopian job market and career development. You help Hambisa Bekuma Tefera with:

- Job search strategy for Ethiopian market (EthioJobs, Mekanisa, LinkedIn)
- CV/resume writing and optimization for Ethiopian employers
- Cover letter generation tailored to specific positions
- Interview preparation with STAR method coaching
- Salary negotiation guidance for Ethiopian market rates
- Career coaching and professional development advice
- Sales & Marketing career expertise

Keep responses concise (2-4 paragraphs max for regular chat). Be encouraging and practical. Use Ethiopian context when relevant (Addis Ababa market, local companies, ETB currency). Respond in English unless the user writes in Amharic.`;

// In-memory conversation store (keyed by userId)
const conversations = new Map<string, any[]>();

function getConversation(userId: string): any[] {
  if (!conversations.has(userId)) {
    conversations.set(userId, [
      { role: 'assistant', content: SYSTEM_PROMPT },
    ]);
  }
  return conversations.get(userId)!;
}

function trimConversation(messages: any[], maxMessages = 20) {
  if (messages.length > maxMessages) {
    return [messages[0], ...messages.slice(-(maxMessages - 1))];
  }
  return messages;
}

export async function POST(request: NextRequest) {
  try {
    await ensureStoreWarmed();

    const { messages, message, context = 'job-search', userId, userName } = await request.json();

    // Support both { messages } array and single { message } string
    const userMessage = message || (Array.isArray(messages) && messages[messages.length - 1]?.content);

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Save user message to store
    createChatMessage({ role: 'user', content: userMessage, userId: userId || 'anonymous' });

    // Build conversation
    const convUserId = userId || 'default';
    const conversation = getConversation(convUserId);

    // Add user message
    conversation.push({ role: 'user', content: userMessage });

    // Trim if too long
    const trimmed = trimConversation(conversation);

    // Try AI response first, fall back to mock
    let reply: string;

    try {
      // Import AI SDK — fall back to local stub if not available
      const ZAI = await import('z-ai-web-dev-sdk').catch(() => import('@/ai-sdk-stub'));
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: trimmed,
        thinking: { type: 'disabled' },
      });
      reply = completion.choices[0]?.message?.content;

      if (!reply || reply.trim().length === 0) {
        reply = generateMockReply(userMessage, context);
      }
    } catch (aiError) {
      console.error('[AI Chat] SDK error, using fallback:', aiError);
      reply = generateMockReply(userMessage, context);
    }

    // Save assistant message
    createChatMessage({ role: 'assistant', content: reply, userId: userId || 'anonymous' });

    // Update conversation history
    conversation.push({ role: 'assistant', content: reply });

    return NextResponse.json({
      success: true,
      response: reply,
      reply,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
  }
}

// GET - Get chat history
export async function GET() {
  try {
    await ensureStoreWarmed();
    return NextResponse.json({
      success: true,
      messages: getChatMessages().slice(-50),
    });
  } catch (error) {
    console.error('Fetch chat history error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

// DELETE - Clear chat history
export async function DELETE() {
  try {
    clearChatMessages();
    conversations.clear();
    return NextResponse.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 });
  }
}

function generateMockReply(message: string, context: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('cover letter') || lower.includes('coverletter')) {
    return 'I\'d be happy to help with your cover letter! For the best results, please share the job title and company name. A strong Ethiopian cover letter should include: your contact information, a professional greeting, 2-3 paragraphs highlighting your relevant experience, and a closing with call to action. Keep it to 300-400 words and reference specific achievements with numbers.';
  }

  if (lower.includes('resume') || lower.includes('cv')) {
    return 'For your CV, make sure to include: a clear professional summary, core competencies section, detailed work experience with quantifiable achievements, education, and languages. Ethiopian employers value clean formatting, professional email addresses, and local phone numbers (+251). Consider using Times New Roman or Arial font.';
  }

  if (lower.includes('interview') || lower.includes('prepare')) {
    return 'Interview preparation tips for Ethiopia: 1) Research the company thoroughly, 2) Prepare STAR method answers (Situation, Task, Action, Result), 3) Dress professionally, 4) Arrive 10-15 minutes early, 5) Bring printed copies of your CV, 6) Prepare questions about the role, 7) Practice common questions like "Tell me about yourself" and "Why do you want this job?". Would you like me to help with specific interview questions?';
  }

  if (lower.includes('salary') || lower.includes('pay') || lower.includes('negotiate')) {
    return 'Salary expectations in Ethiopia vary by role and experience level. For mid-level positions in Addis Ababa: Sales/Marketing managers typically earn ETB 15,000-40,000/month, IT professionals ETB 20,000-60,000/month, and administrative roles ETB 8,000-20,000/month. When negotiating, research the market rate, consider benefits beyond base salary, and be prepared to discuss your value with specific achievements.';
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! 👋 I\'m your Career AI assistant. I can help you with: finding jobs, writing cover letters, preparing for interviews, CV improvements, salary negotiation advice, and career planning. What would you like help with today?';
  }

  return `Thank you for your message. As your Career AI assistant, I can help with:\n\n• 🔍 Job search strategy for Ethiopia\n• 📄 CV and cover letter writing\n• 🎯 Interview preparation\n• 💰 Salary negotiation\n• 📈 Career development\n\nWhat would you like to focus on?`;
}
