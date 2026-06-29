'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, Sparkles, Loader2, GraduationCap, Briefcase,
  Wrench, Award, TrendingUp, AlertCircle, CheckCircle2,
  Upload, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalysisResult {
  score: number;
  skills: string[];
  experience: string[];
  education: string[];
  strengths: string[];
  improvements: string[];
}

const MOCK_ANALYSIS: AnalysisResult = {
  score: 78,
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'Docker'],
  experience: ['3+ years as Full Stack Developer', 'Led team of 4 engineers', 'Built microservices architecture'],
  education: ['BSc in Computer Science - Addis Ababa University', 'AWS Certified Solutions Architect'],
  strengths: ['Strong technical background', 'Leadership experience', 'Diverse tech stack'],
  improvements: ['Add more quantifiable achievements', 'Include project outcomes and metrics', 'Highlight Ethiopia-specific market experience'],
};

export default function CvAnalyzerTab() {
  const { tabData } = useBotData();
  const [cvText, setCvText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = () => {
    if (!cvText.trim()) {
      toast.error('Please paste your CV text first');
      return;
    }
    setAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      setResult(MOCK_ANALYSIS);
      setAnalyzing(false);
      toast.success('CV analysis complete', { description: `Match score: ${MOCK_ANALYSIS.score}%` });
    }, 2000);
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-600';
    if (s >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className='space-y-6'>
      {/* Input Card */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <FileText className='size-5 text-emerald-600' />
            <CardTitle className='text-lg'>CV Analyzer</CardTitle>
          </div>
          <CardDescription>Paste your CV to extract skills, experience, and get a match score</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <div className='flex items-center justify-between'>
              <label className='text-sm font-medium flex items-center gap-1.5'>
                <Upload className='size-3.5 text-muted-foreground' />
                CV Content
              </label>
              <span className='text-xs text-muted-foreground'>{cvText.length} characters</span>
            </div>
            <Textarea
              placeholder={'Paste your CV text here...\n\nExample:\nJohn Doe\nFull Stack Developer\n3 years experience\nSkills: JavaScript, React, Node.js, Python...'}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              className='min-h-40 resize-y'
            />
          </div>
          <Button
            className='bg-emerald-600 hover:bg-emerald-700 w-full'
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className='size-4 animate-spin' /> : <Sparkles className='size-4' />}
            {analyzing ? 'Analyzing CV...' : 'Analyze CV'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analyzing && (
        <Card>
          <CardContent className='p-6 flex flex-col items-center justify-center py-12'>
            <Loader2 className='size-8 text-emerald-500 animate-spin mb-3' />
            <p className='text-sm font-medium'>Analyzing your CV...</p>
            <p className='text-xs text-muted-foreground mt-1'>Extracting skills, experience, and education</p>
          </CardContent>
        </Card>
      )}

      {result && !analyzing && (
        <>
          {/* Score Card */}
          <Card className='border-emerald-200 bg-emerald-50/30'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <BarChart3 className='size-5 text-emerald-600' />
                  <h3 className='font-semibold'>Overall Match Score</h3>
                </div>
                <span className={`text-3xl font-bold ${scoreColor(result.score)}`}>{result.score}%</span>
              </div>
              <Progress value={result.score} className='h-3 [&>div]:bg-emerald-500' />
              <div className='flex justify-between mt-2 text-xs text-muted-foreground'>
                <span>Needs Work</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Data */}
          <div className='grid md:grid-cols-2 gap-4'>
            {/* Skills */}
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2'>
                  <Wrench className='size-4 text-emerald-600' />
                  <CardTitle className='text-sm'>Skills Detected</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-1.5'>
                  {result.skills.map((skill) => (
                    <Badge key={skill} variant='outline' className='bg-emerald-50 text-emerald-700 border-emerald-200'>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2'>
                  <GraduationCap className='size-4 text-emerald-600' />
                  <CardTitle className='text-sm'>Education</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2'>
                  {result.education.map((edu, i) => (
                    <li key={i} className='text-sm flex items-start gap-2'>
                      <Award className='size-3.5 text-emerald-500 mt-0.5 shrink-0' />
                      {edu}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2'>
                  <Briefcase className='size-4 text-emerald-600' />
                  <CardTitle className='text-sm'>Experience Highlights</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2'>
                  {result.experience.map((exp, i) => (
                    <li key={i} className='text-sm flex items-start gap-2'>
                      <CheckCircle2 className='size-3.5 text-emerald-500 mt-0.5 shrink-0' />
                      {exp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2'>
                  <AlertCircle className='size-4 text-amber-500' />
                  <CardTitle className='text-sm'>Suggested Improvements</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2'>
                  {result.improvements.map((imp, i) => (
                    <li key={i} className='text-sm flex items-start gap-2 text-muted-foreground'>
                      <TrendingUp className='size-3.5 text-amber-500 mt-0.5 shrink-0' />
                      {imp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty State (initial) */}
      {!result && !analyzing && !cvText && (
        <Card>
          <CardContent className='p-6 flex flex-col items-center justify-center py-12'>
            <div className='flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4'>
              <FileText className='size-7 text-emerald-400' />
            </div>
            <p className='text-sm font-medium text-foreground'>Paste your CV below to get started</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs text-center'>
              We will analyze your skills, experience, education, and provide actionable improvement suggestions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}