'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Brain, TrendingUp, Target, Lightbulb, CheckCircle2,
  AlertTriangle, BarChart3, ArrowUpRight, ArrowDownRight,
  ScanSearch, Loader2, Sparkles, ShieldCheck, Zap
} from 'lucide-react';

interface SkillGap {
  skill: string;
  yourLevel: number;
  marketDemand: number;
  gap: number;
}

interface MarketInsight {
  title: string;
  description: string;
  trend: 'up' | 'down' | 'stable';
  change: string;
}

export function CvIntelligenceTab() {
  const { tabData } = useBotData();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const matchScore = 72;
  const overallScore = 68;
  const atsScore = 85;

  const skillGaps: SkillGap[] = [
    { skill: 'React', yourLevel: 80, marketDemand: 90, gap: 10 },
    { skill: 'TypeScript', yourLevel: 70, marketDemand: 88, gap: 18 },
    { skill: 'Node.js', yourLevel: 75, marketDemand: 82, gap: 7 },
    { skill: 'Cloud (AWS)', yourLevel: 30, marketDemand: 75, gap: 45 },
    { skill: 'Docker', yourLevel: 40, marketDemand: 70, gap: 30 },
  ];

  const marketInsights: MarketInsight[] = [
    { title: 'Software Engineer Demand', description: '22% increase in Addis Ababa tech roles', trend: 'up', change: '+22%' },
    { title: 'Average Salary Range', description: 'ETB 45K-120K for mid-level roles', trend: 'up', change: '+8%' },
    { title: 'Remote Work Opportunities', description: 'Growing remote openings for Ethiopian devs', trend: 'up', change: '+15%' },
    { title: 'Entry-Level Competition', description: 'High competition for junior positions', trend: 'down', change: '-5%' },
  ];

  const suggestions = [
    { icon: AlertTriangle, text: 'Add cloud computing experience (AWS/GCP) — high demand skill gap', priority: 'high' },
    { icon: Lightbulb, text: 'Include quantifiable achievements with metrics and percentages', priority: 'high' },
    { icon: CheckCircle2, text: 'Strengthen Docker and CI/CD pipeline experience section', priority: 'medium' },
    { icon: Target, text: 'Add more action verbs: Led, Built, Delivered, Optimized', priority: 'medium' },
    { icon: Sparkles, text: 'Consider adding a professional summary highlighting 3 key strengths', priority: 'low' },
  ];

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-cv', { method: 'POST' });
      const data = await res.json();
      if (data.success) { toast.success('CV analysis complete!'); setAnalyzed(true); }
      else toast.error(data.error || 'Analysis failed');
    } catch { toast.error('Failed to analyze CV'); }
    setAnalyzing(false);
  };

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const progressColor = (score: number) =>
    score >= 80 ? '[&>div]:bg-emerald-500' : score >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500';

  return (
    <div className="space-y-6">
      {/* Analyze Button */}
      {!analyzed && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
          <CardContent className="py-12 text-center">
            <ScanSearch className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-1">Analyze your CV to get intelligence insights</p>
            <p className="text-xs text-muted-foreground mb-4">Get match scores, skill gaps, and market analysis</p>
            <Button onClick={handleAnalyze} disabled={analyzing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {analyzing ? 'Analyzing...' : 'Analyze My CV'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Score Overview */}
      {analyzed && (
        <>
          <Card className="border-emerald-200">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-emerald-600" />CV Match Score Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Overall Score', score: overallScore, icon: BarChart3 },
                  { label: 'ATS Compatibility', score: atsScore, icon: ShieldCheck },
                  { label: 'Job Match Avg', score: matchScore, icon: Target },
                ].map(item => (
                  <div key={item.label} className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <item.icon className={`w-4 h-4 ${scoreColor(item.score)}`} />
                      <span className={`text-2xl font-bold ${scoreColor(item.score)}`}>{item.score}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <Progress value={item.score} className={`h-1.5 ${progressColor(item.score)}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Analysis */}
          <Card className="border-emerald-200">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-600" />Skills Gap Analysis</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skillGaps.map(sg => (
                  <div key={sg.skill} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{sg.skill}</span>
                      <span className="text-muted-foreground">You: {sg.yourLevel}% · Market: {sg.marketDemand}%</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sg.yourLevel}%` }} />
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-300/60 rounded-full" style={{ width: `${sg.marketDemand}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" /> Your Level</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-emerald-300/60 inline-block" /> Market Demand</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Insights */}
          <Card className="border-emerald-200">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" />Market Insights</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {marketInsights.map(insight => (
                  <div key={insight.title} className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold">{insight.title}</p>
                      <Badge className={`text-[10px] border-0 ${insight.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : insight.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {insight.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : insight.trend === 'down' ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
                        {insight.change}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{insight.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Improvement Suggestions */}
          <Card className="border-emerald-200">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-emerald-600" />Improvement Suggestions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <s.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.priority === 'high' ? 'text-amber-500' : s.priority === 'medium' ? 'text-sky-500' : 'text-emerald-500'}`} />
                    <div className="flex-1">
                      <p className="text-xs">{s.text}</p>
                    </div>
                    <Badge className={`text-[10px] border-0 flex-shrink-0 ${s.priority === 'high' ? 'bg-amber-100 text-amber-700' : s.priority === 'medium' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {s.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}