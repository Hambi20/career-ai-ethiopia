import { NextRequest, NextResponse } from 'next/server';
import { createChatMessage, getChatMessages, clearChatMessages } from '@/lib/unified-store';

export async function POST(request: NextRequest) {
  try {
    const { messages, message, context = 'job-search' } = await request.json();

    // Support both { messages } array and single { message } string
    const userMessage = message || (Array.isArray(messages) && messages[messages.length - 1]?.content);

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Save user message
    createChatMessage({ role: 'user', content: userMessage });

    // Generate a mock reply
    const reply = generateMockReply(userMessage, context);

    // Save assistant message
    createChatMessage({ role: 'assistant', content: reply });

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

  if (lower.includes('job') && (lower.includes('find') || lower.includes('search') || lower.includes('look'))) {
    return 'Great question! The best Ethiopian job sites are: 1) EthioJobs.net - largest job board, 2) Mekanisa.com - growing platform, 3) Jobs.et, 4) AddisJobs.com, 5) LinkedIn for professional roles. I recommend checking daily, setting up alerts, and tailoring your CV for each application. Would you like me to help search for specific positions?';
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! 👋 I\'m your Ethiopian job search assistant. I can help you with: finding jobs, writing cover letters, preparing for interviews, CV improvements, salary negotiation advice, and career planning. What would you like help with today?';
  }

  return `Thank you for your question about "${message.substring(0, 80)}". In the Ethiopian job market context, I'd recommend the following approach:

1. **Research** - Check EthioJobs.net, Mekanisa.com, and LinkedIn for current openings
2. **Prepare** - Tailor your CV and cover letter for each position
3. **Apply** - Follow up within 1-2 weeks of applying
4. **Network** - Connect with professionals in your target industry

Would you like more specific advice on any of these areas?`;
}
