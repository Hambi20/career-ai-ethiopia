'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  MessageSquare, Plus, Send, ArrowLeft, Clock,
  User, Mail, Check, CheckCheck, Loader2, X, Inbox
} from 'lucide-react';

interface Message {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const SAMPLE_MESSAGES: Message[] = [
  { id: '1', senderName: 'Ethio Telecom HR', senderEmail: 'hr@ethiotelecom.et', subject: 'Interview Invitation', body: 'Dear candidate, we are pleased to invite you for an interview for the Senior Software Engineer position. Please confirm your availability for next Tuesday at 10:00 AM at our headquarters.', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', senderName: 'Dashen Bank', senderEmail: 'careers@dashenbank.com', subject: 'Application Received', body: 'Thank you for applying to the Product Manager role. We have received your application and will review it within 5 business days.', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', senderName: 'Career AI Team', senderEmail: 'support@careerai.et', subject: 'Welcome to Career AI Ethiopia!', body: 'Welcome! Your profile is set up and ready. Start by uploading your CV to get personalized job matches and AI-powered cover letters.', read: true, createdAt: new Date(Date.now() - 604800000).toISOString() },
];

export function MessagesTab() {
  const { tabData } = useBotData();
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });

  const selected = messages.find(m => m.id === selectedId);
  const unreadCount = messages.filter(m => !m.read).length;

  const openMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    setSelectedId(id);
  };

  const handleSend = async () => {
    if (!compose.to || !compose.body) { toast.error('Recipient and message required'); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setMessages(prev => [{
      id: crypto.randomUUID(), senderName: 'You', senderEmail: compose.to,
      subject: compose.subject || '(No Subject)', body: compose.body,
      read: true, createdAt: new Date().toISOString(),
    }, ...prev]);
    setShowCompose(false);
    setCompose({ to: '', subject: '', body: '' });
    toast.success('Message sent!');
    setSending(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString();
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Messages</h3>
          {unreadCount > 0 && <Badge className="bg-emerald-600 text-white border-0 text-[10px]">{unreadCount} new</Badge>}
        </div>
        <Button size="sm" onClick={() => setShowCompose(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> Compose
        </Button>
      </div>

      {/* Message Detail View */}
      {selected ? (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)} className="h-7 w-7 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-sm flex-1 truncate">{selected.subject}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">{initials(selected.senderName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{selected.senderName}</p>
                <p className="text-xs text-muted-foreground">{selected.senderEmail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(selected.createdAt)}</span>
            </div>
            <Separator className="mb-4" />
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</p>
          </CardContent>
        </Card>
      ) : (
        /* Message List */
        messages.length > 0 ? (
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg.id)}
                  className="w-full text-left rounded-xl border transition-colors p-4 hover:bg-emerald-50/50"
                  style={{ borderColor: msg.read ? '#e5e7eb' : '#6ee7b7' }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-bold ${!msg.read ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        {initials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${!msg.read ? 'font-bold' : 'font-medium'}`}>{msg.senderName}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${!msg.read ? 'font-semibold' : 'text-muted-foreground'}`}>{msg.subject}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msg.body}</p>
                    </div>
                    {!msg.read && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Inbox className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Messages from employers and the Career AI team will appear here</p>
            </CardContent>
          </Card>
        )
      )}

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compose Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-sm">To</Label><Input value={compose.to} onChange={e => setCompose(p => ({ ...p, to: e.target.value }))} placeholder="recipient@email.com" className="border-emerald-200" /></div>
            <div className="space-y-1.5"><Label className="text-sm">Subject</Label><Input value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} placeholder="Message subject" className="border-emerald-200" /></div>
            <div className="space-y-1.5"><Label className="text-sm">Message</Label><Textarea value={compose.body} onChange={e => setCompose(p => ({ ...p, body: e.target.value }))} rows={5} placeholder="Write your message..." className="border-emerald-200" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending} className="bg-emerald-600 text-white gap-1.5">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}