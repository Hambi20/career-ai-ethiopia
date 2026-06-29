'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, Clock, Circle, ListTodo, StickyNote,
  Sparkles, CalendarDays, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

type TaskStatus = 'all' | 'todo' | 'in_progress' | 'done';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  todo: { label: 'Todo', icon: <Circle className="size-3.5" />, color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', icon: <Clock className="size-3.5" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  done: { label: 'Done', icon: <CheckCircle2 className="size-3.5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const PRIORITY_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

export default function ExecutiveTab() {
  const { tasks, notes, botData } = useBotData();
  const summary = botData.summary;
  const [statusFilter, setStatusFilter] = useState<TaskStatus>('all');

  const filteredTasks = tasks.filter(
    (t: any) => statusFilter === 'all' || t.status === statusFilter
  );

  const statusCounts = {
    all: tasks.length,
    todo: summary.tasksTodo,
    in_progress: summary.tasksInProgress,
    done: summary.tasksDone,
  };

  return (
    <div className="space-y-6">
      {/* Tasks Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="size-5 text-emerald-600" />
              <CardTitle className="text-lg">Tasks</CardTitle>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {tasks.length}
              </Badge>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => toast.success('AI is planning your day ahead...', { description: 'This feature requires bot connection' })}
            >
              <Sparkles className="size-4" />
              AI Plan
            </Button>
          </div>
          <CardDescription>Manage your daily tasks and priorities</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="todo">Todo ({statusCounts.todo})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
              <TabsTrigger value="done">Done ({statusCounts.done})</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <ListTodo className="size-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No tasks found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === 'all'
                  ? 'Tasks from your executive bot will appear here.'
                  : `No ${STATUS_CONFIG[statusFilter]?.label?.toLowerCase() || ''} tasks at the moment.`}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3 pr-2">
                {filteredTasks.map((task: any, i: number) => {
                  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                  return (
                    <div
                      key={task.id || i}
                      className="flex items-start gap-3 rounded-lg border p-4 hover:bg-emerald-50/50 transition-colors"
                    >
                      <div className="mt-0.5 text-emerald-600">{status.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{task.title || 'Untitled Task'}</p>
                          <Badge variant={PRIORITY_VARIANT[task.priority] || 'outline'} className="text-[10px]">
                            {task.priority === 'high' && <AlertTriangle className="size-3 mr-1" />}
                            {task.priority || 'medium'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
                            {status.label}
                          </Badge>
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <StickyNote className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Notes</CardTitle>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              {notes.length}
            </Badge>
          </div>
          <CardDescription>Quick notes from your executive assistant</CardDescription>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <StickyNote className="size-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No notes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Notes created by your AI executive assistant will show up here.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-3 pr-2">
                {notes.map((note: any, i: number) => (
                  <div key={note.id || i} className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium">{note.title || 'Untitled Note'}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{note.content || note.body || ''}</p>
                    {note.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}