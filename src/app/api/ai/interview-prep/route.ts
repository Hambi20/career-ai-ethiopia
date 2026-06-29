import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for interview prep
let prepCache: Map<string, any> = new Map();

// POST - Generate interview preparation (mock)
export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, forceNew } = await request.json();

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    const cacheKey = `${jobTitle}:${company || 'any'}`;

    if (!forceNew && prepCache.has(cacheKey)) {
      return NextResponse.json({ success: true, prep: prepCache.get(cacheKey), fromCache: true });
    }

    const prep = generateMockInterviewPrep(jobTitle, company);
    prepCache.set(cacheKey, prep);

    return NextResponse.json({ success: true, prep, fromCache: false });
  } catch (error) {
    console.error('Interview Prep error:', error);
    return NextResponse.json({ error: 'Failed to generate interview prep' }, { status: 500 });
  }
}

function generateMockInterviewPrep(jobTitle: string, company: string | undefined): any {
  return {
    id: Date.now().toString(),
    jobTitle,
    company: company || null,
    questions: JSON.stringify([
      { question: 'Tell me about yourself and your professional background.', suggestedAnswer: 'I am a seasoned sales and marketing professional with over 8 years of experience across Eastern Ethiopia and Addis Ababa. I\'ve managed 150+ B2B accounts at Romel General Trading, built marketing departments from scratch, and consistently delivered measurable growth. My MBA and diverse industry experience give me a strategic perspective on business development.', category: 'behavioral', difficulty: 'easy', whyAsk: 'Sets the tone and allows the interviewer to assess your communication skills and career narrative.' },
      { question: 'Describe a time you exceeded your sales targets. What strategies did you use?', suggestedAnswer: 'At Romel General Trading, I was tasked with managing 150+ B2B accounts. I implemented a route optimization strategy that reduced travel time by 25% while increasing client visits. This led to acquiring 15+ new accounts monthly and consistently exceeding territory targets by 20%.', category: 'behavioral', difficulty: 'medium', whyAsk: 'Assesses your ability to set and exceed goals, and your problem-solving approach.' },
      { question: 'How would you approach building a sales team from scratch?', suggestedAnswer: 'Drawing from my experience at Deran PLC where I built the department from zero: 1) Define clear KPIs and territory structure, 2) Recruit for attitude and train for skill, 3) Implement a structured onboarding program, 4) Set up weekly coaching sessions, 5) Create a competitive but collaborative culture with transparent incentive structures.', category: 'situational', difficulty: 'hard', whyAsk: 'Tests leadership and organizational skills, especially relevant for management positions.' },
      { question: 'What do you know about our company and why do you want to work here?', suggestedAnswer: `${company ? `${company} ` : 'Your company '}is known in the Ethiopian market for quality and growth. I\'m particularly drawn to the opportunity to apply my experience in territory management and market expansion in a dynamic environment. Your company\'s commitment to development aligns with my career goals of driving measurable business growth.`, category: 'cultural', difficulty: 'medium', whyAsk: 'Evaluates your research effort and genuine interest in the company.' },
      { question: 'How do you handle rejection or a difficult client?', suggestedAnswer: 'Rejection is part of sales. I focus on understanding the "why" behind objections, which often reveals opportunities. At SMADL Communication, I encountered a major client who was about to switch to a competitor. I scheduled a face-to-face meeting, listened to their concerns, and proposed a customized solution. Not only did we retain the client, but we also increased their order volume by 30%.', category: 'behavioral', difficulty: 'medium', whyAsk: 'Assesses resilience, emotional intelligence, and problem-solving under pressure.' },
      { question: 'What are your salary expectations?', suggestedAnswer: 'Based on my 8+ years of experience and the responsibilities of this role, I\'m looking for a competitive package in the range that reflects the market rate for this position. I\'m open to discussing the complete compensation package including benefits, and I\'m flexible based on the total opportunity.', category: 'salary', difficulty: 'medium', whyAsk: 'Gauges your market awareness and negotiation approach.' },
      { question: 'How do you manage and prioritize your territory?', suggestedAnswer: 'I use a data-driven approach: 1) Segment accounts by revenue potential and frequency, 2) Plan weekly routes to maximize coverage with minimal travel time, 3) Allocate time based on account value (80/20 rule), 4) Use CRM tracking for follow-ups and pipeline management, 5) Review and adjust monthly based on performance data.', category: 'technical', difficulty: 'hard', whyAsk: 'Evaluates your operational skills and strategic thinking in territory management.' },
      { question: 'Describe your experience with market research and competitive analysis.', suggestedAnswer: 'In every role, I\'ve conducted market research to identify opportunities. At OL-BRIGHT College, I analyzed competitor programs, pricing, and marketing channels before developing our strategy. This research-driven approach helped us identify underserved segments and led to 30%+ enrollment growth.', category: 'technical', difficulty: 'medium', whyAsk: 'Tests analytical skills and strategic thinking.' },
      { question: 'How do you adapt your sales approach for different types of clients?', suggestedAnswer: 'I tailor my approach based on client segment. For large corporate clients, I focus on long-term partnerships and ROI discussions. For SMEs, I emphasize quick wins and practical solutions. In the Ethiopian context, I also consider relationship dynamics, decision-making hierarchies, and cultural factors like respect for seniority and the importance of personal relationships in business.', category: 'cultural', difficulty: 'medium', whyAsk: 'Evaluates adaptability, cultural awareness, and client management skills.' },
      { question: 'What would you do in your first 30 days in this role?', suggestedAnswer: 'My 30-day plan would be: Week 1-2: Shadow existing team members, understand current processes, meet key clients. Week 3: Analyze current pipeline, identify quick wins and improvement areas. Week 4: Present my assessment and 90-day action plan to management. I believe in learning before acting, then acting decisively based on data.', category: 'situational', difficulty: 'hard', whyAsk: 'Shows planning ability, initiative, and understanding of the onboarding process.' },
      { question: 'How do you handle team conflicts or underperformance?', suggestedAnswer: 'I address issues early with direct, private conversations. I focus on understanding root causes — is it skill-based, motivational, or personal? At SMADL, I had a team member consistently underperforming. Through one-on-one coaching, I discovered they lacked confidence in product knowledge. After targeted training and mentoring, their performance improved by 40% within two months.', category: 'behavioral', difficulty: 'hard', whyAsk: 'Evaluates leadership, empathy, and people management skills.' },
      { question: 'Do you have any questions for us?', suggestedAnswer: 'Yes, I\'d love to know: 1) What are the biggest challenges the person in this role will face in the first 6 months? 2) How does the company measure success in this position? 3) What does the career growth path look like for top performers? 4) How would you describe the team culture here?', category: 'cultural', difficulty: 'easy', whyAsk: 'Shows genuine interest and helps you evaluate if the company is the right fit.' },
    ]),
    companyResearch: `${company || 'The company'} — Research their website, social media presence, and recent news. Understand their products/services, target market, and competitive positioning. Look for recent expansion plans, new product launches, or leadership changes. Check Ethiopian business news sources like The Reporter or Ethiopian Herald for any mentions. Understanding their growth trajectory and challenges will help you tailor your answers to show you can add immediate value.`,
    tips: `For Ethiopian professional interviews: Dress formally (suit and tie for men), arrive 10-15 minutes early, and greet with appropriate respect. Bring 2-3 printed copies of your CV. Ethiopian interviewers value direct eye contact, firm handshakes, and confident posture. Be prepared to discuss your experience in Amharic if the interviewer switches languages — this is common and shows cultural competence. Follow up with a thank-you email within 24 hours. Salary negotiation typically happens in the second round, so focus on demonstrating value first.`,
    createdAt: new Date().toISOString(),
  };
}

// GET - Get interview prep history
export async function GET() {
  try {
    const preps = Array.from(prepCache.values()).slice(-20);
    return NextResponse.json({ success: true, preps });
  } catch (error) {
    console.error('Fetch interview prep error:', error);
    return NextResponse.json({ error: 'Failed to fetch interview prep' }, { status: 500 });
  }
}

// DELETE - Clear interview prep cache
export async function DELETE() {
  try {
    prepCache.clear();
    return NextResponse.json({ success: true, message: 'Interview prep cache cleared' });
  } catch (error) {
    console.error('Clear interview prep error:', error);
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
  }
}