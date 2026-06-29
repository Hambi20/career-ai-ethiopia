'use client';

import { useState, useRef, useEffect } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Bot, Send, Loader2, MessageSquare, Search,
  Briefcase, FileText, GraduationCap, User,
  Sparkles,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CONTEXT_OPTIONS = [
  { id: 'job-search', label: 'Job Search', icon: <Search className="size-3.5" />, description: 'Find jobs in Ethiopia' },
  { id: 'career-advice', label: 'Career Advice', icon: <Briefcase className="size-3.5" />, description: 'Professional guidance' },
  { id: 'cv-help', label: 'CV Help', icon: <FileText className="size-3.5" />, description: 'Improve your resume' },
  { id: 'interview-tips', label: 'Interview Tips', icon: <GraduationCap className="size-3.5" />, description: 'Ace your interviews' },
];

const MOCK_REPLIES: Record<string, string> = {
  'job-search': 'I can help you find jobs in Ethiopia! The tech sector in Addis Ababa is growing rapidly. Popular job boards include EthioJobs and Miz. Would you like me to search for specific roles or companies?',
  'career-advice': 'Great question! Here are some key career tips for the Ethiopian market:\n\n1. **Network actively** — attend tech meetups in Addis Ababa\n2. **Build skills** — focus on high-demand areas like mobile dev and cloud\n3. **Get certified** — AWS and Google Cloud certs are valued\n4. **Leverage LinkedIn** — many recruiters source from there\n\nWhat specific area would you like advice on?',
  'cv-help': 'For a strong CV in the Ethiopian job market:\n\n1. Keep it to 1-2 pages maximum\n2. Include a professional summary at the top\n3. Quantify achievements (e.g., "increased sales by 30%")\n4. Highlight relevant technical skills\n5. Include education and certifications\n\nWould you like me to review your CV? You can paste it in the CV Analyzer tab.',
  'interview-tips': 'Here are interview tips for the Ethiopian job market:\n\n1. **Research the company** — know their mission and recent news\n2. **Prepare STAR answers** — Situation, Task, Action, Result\n3. **Dress professionally** — business formal is standard\n4. **Arrive 10-15 minutes early** — punctuality is highly valued\n5. **Prepare questions** — show genuine interest in the role\n\nWant me to generate practice questions for a specific role?',
};

export default function AiChatTab() {
  const { tabData } = useBotData();
  const [context, setContext] = useState('career-advice');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    setTimeout(() => {
      const reply = MOCK_REPLIES[context] || 'Thanks for your message! I am your Career AI assistant. How can I help you with your career in Ethiopia today?';
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setSending(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      {/* Context Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-emerald-600" />
            <p className="text-sm font-medium">Chat Context</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CONTEXT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setContext(opt.id)}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all hover:bg-emerald-50/50 ${
                  context === opt.id ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : ''
                }`}
              >
                <div className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${
                  context === opt.id ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">AI Career Assistant</CardTitle>
            {messages.length > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {messages.length} messages
              </Badge>
            )}
          </div>
          <CardDescription>
            Context: <span className="font-medium text-foreground">{CONTEXT_OPTIONS.find(c => c.id === context)?.label}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 min-h-[300px] max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                  <MessageSquare className="size-7 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground">Ask me anything about your career</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  I can help with job searching, career advice, CV writing, and interview preparation in the Ethiopian market.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['How to find tech jobs?', 'CV tips', 'Interview prep'].map((q) => (
                    <button
                      key={q}
                      className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                      onClick={() => { setInput(q); }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className={msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}>
                      {msg.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-background border rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-emerald-200' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-slate-200 text-slate-700">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-background border rounded-xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="size-4 text-emerald-500 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1"
            />
            <Button
              size="icon"
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}