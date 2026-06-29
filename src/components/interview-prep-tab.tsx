'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  GraduationCap, Sparkles, Loader2, MessageSquare,
  Lightbulb, Building2, Briefcase, HelpCircle,
  ChevronDown, ChevronUp, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

interface QA {
  question: string;
  answer: string;
  category: string;
}

const MOCK_QA: QA[] = [
  {
    question: 'Tell me about yourself and your experience.',
    answer: 'Start with a brief summary of your professional background, highlight 2-3 key achievements relevant to this role, and connect your experience to why you are excited about this opportunity at the company.',
    category: 'Behavioral',
  },
  {
    question: 'Why do you want to work at our company?',
    answer: 'Research the company\'s mission, recent projects, and culture. Mention specific aspects that align with your career goals and values. Show genuine enthusiasm about contributing to their team.',
    category: 'Motivation',
  },
  {
    question: 'Describe a challenging technical problem you solved.',
    answer: 'Use the STAR method: Situation, Task, Action, Result. Choose a problem that demonstrates your analytical thinking, technical skills, and ability to collaborate with others to find a solution.',
    category: 'Technical',
  },
  {
    question: 'Where do you see yourself in 5 years?',
    answer: 'Focus on growth within the field and how this role fits into your long-term career plan. Show ambition while remaining realistic. Mention skills you want to develop and how this company can help you grow.',
    category: 'Career Goals',
  },
  {
    question: 'What is your expected salary range?',
    answer: 'Research the market rate for this role in Ethiopia. Provide a range based on your research and experience level. Express flexibility and focus on the overall compensation package including benefits and growth opportunities.',
    category: 'Negotiation',
  },
];

export default function InterviewPrepTab() {
  const { tabData } = useBotData();
  const [form, setForm] = useState({
    jobTitle: (tabData.profile?.targetRole as string) || '',
    company: '',
    description: '',
  });
  const [generating, setGenerating] = useState(false);
  const [qaList, setQaList] = useState<QA[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleGenerate = () => {
    if (!form.jobTitle.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    setGenerating(true);
    setQaList([]);
    setExpanded(new Set());
    setTimeout(() => {
      setQaList(MOCK_QA);
      setGenerating(false);
      toast.success('Interview prep generated', { description: `${MOCK_QA.length} questions for ${form.jobTitle}` });
    }, 2500);
  };

  const categoryColors: Record<string, string> = {
    Behavioral: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Technical: 'bg-blue-100 text-blue-700 border-blue-200',
    Motivation: 'bg-purple-100 text-purple-700 border-purple-200',
    'Career Goals': 'bg-amber-100 text-amber-700 border-amber-200',
    Negotiation: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Interview Preparation</CardTitle>
          </div>
          <CardDescription>Enter job details to generate tailored interview questions and answers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="job-title" className="flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-muted-foreground" />
                Job Title
              </Label>
              <Input
                id="job-title"
                placeholder="e.g. Senior Software Engineer"
                value={form.jobTitle}
                onChange={(e) => setForm(s => ({ ...s, jobTitle: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company" className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                Company
              </Label>
              <Input
                id="company"
                placeholder="e.g. Ethio Telecom"
                value={form.company}
                onChange={(e) => setForm(s => ({ ...s, company: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="job-desc" className="flex items-center gap-1.5">
              <ClipboardList className="size-3.5 text-muted-foreground" />
              Job Description
            </Label>
            <Textarea
              id="job-desc"
              placeholder="Paste the job description here for more targeted questions..."
              value={form.description}
              onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
              className="min-h-24 resize-y"
            />
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 w-full"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? 'Generating...' : 'Generate Prep'}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      {generating && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm font-medium">Generating interview questions...</p>
            <p className="text-xs text-muted-foreground mt-1">Tailoring questions for {form.jobTitle}</p>
          </CardContent>
        </Card>
      )}

      {/* Q&A Cards */}
      {qaList.length > 0 && !generating && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="size-5 text-emerald-600" />
            <h3 className="font-semibold">Questions &amp; Answers</h3>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              {qaList.length} questions
            </Badge>
          </div>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3 pr-2">
              {qaList.map((qa, i) => (
                <Card key={i} className="overflow-hidden">
                  <button
                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-accent/50 transition-colors"
                    onClick={() => toggleExpand(i)}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={`text-[10px] ${categoryColors[qa.category] || ''}`}>
                          {qa.category}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{qa.question}</p>
                    </div>
                    {expanded.has(i) ? <ChevronUp className="size-4 shrink-0 mt-1" /> : <ChevronDown className="size-4 shrink-0 mt-1" />}
                  </button>
                  {expanded.has(i) && (
                    <div className="px-4 pb-4 pl-15">
                      <Separator className="mb-3" />
                      <div className="flex items-start gap-2 ml-11">
                        <Lightbulb className="size-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed">{qa.answer}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {qaList.length === 0 && !generating && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center py-12">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
              <HelpCircle className="size-7 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Enter a job to generate interview questions</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
              Fill in the job title and optional details above, then click Generate Prep to get tailored questions and suggested answers.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}