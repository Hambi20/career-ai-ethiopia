'use client';

import { useState } from 'react';
import { useBotData } from '@/lib/bot-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  User, Mail, Phone, MapPin, Edit, Save, X,
  Briefcase, GraduationCap, Target, FileCheck, Award, Loader2
} from 'lucide-react';

interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
  skills: string;
  education: string;
  experience: string;
}

function parseJsonOrString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item.title && item.company) return `${item.title} at ${item.company}${item.period ? ` (${item.period})` : ''}`;
          if (item.degree && item.institution) return `${item.degree} — ${item.institution}${item.year ? ` (${item.year})` : ''}`;
          return JSON.stringify(item);
        }).join('\n');
      }
      return typeof parsed === 'string' ? parsed : val;
    } catch { return val; }
  }
  return String(val);
}

function buildForm(profileData: any): ProfileForm {
  return {
    fullName: profileData?.fullName || '',
    email: profileData?.email || '',
    phone: profileData?.phone || '',
    location: profileData?.location || '',
    title: profileData?.title || '',
    summary: profileData?.summary || '',
    skills: parseJsonOrString(profileData?.skills),
    education: parseJsonOrString(profileData?.education),
    experience: parseJsonOrString(profileData?.experience),
  };
}

export function ProfileTab() {
  const { tabData } = useBotData();
  const profileData = tabData.profile;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localEdits, setLocalEdits] = useState<ProfileForm | null>(null);

  const displayForm = localEdits ?? buildForm(profileData);

  const startEditing = () => {
    setLocalEdits(buildForm(profileData));
    setEditing(true);
  };

  const cancelEditing = () => {
    setLocalEdits(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!localEdits) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localEdits),
      });
      const data = await res.json();
      if (data.success) { toast.success('Profile saved!'); setLocalEdits(null); setEditing(false); }
      else toast.error(data.error || 'Save failed');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const initials = displayForm.fullName
    ? displayForm.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const skills = displayForm.skills ? displayForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const stats = [
    { icon: FileCheck, label: 'CV Score', value: profileData?.cvScore ?? 72, suffix: '%', color: 'text-emerald-600' },
    { icon: Target, label: 'Applications', value: profileData?.applicationsCount ?? 14, suffix: '', color: 'text-sky-600' },
    { icon: Award, label: 'Interviews', value: profileData?.interviewsCount ?? 3, suffix: '', color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="border-emerald-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-emerald-300">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold">{displayForm.fullName || 'Your Name'}</h2>
                {displayForm.title && <p className="text-sm text-emerald-600">{displayForm.title}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {displayForm.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{displayForm.email}</span>}
                </div>
              </div>
            </div>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={startEditing} className="gap-1.5 border-emerald-300">
                <Edit className="w-3.5 h-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEditing}><X className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold">{s.value}{s.suffix}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Full Name</Label><Input value={localEdits!.fullName} onChange={e => setLocalEdits(p => ({ ...p!, fullName: e.target.value }))} className="border-emerald-200" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={localEdits!.email} onChange={e => setLocalEdits(p => ({ ...p!, email: e.target.value }))} className="border-emerald-200" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={localEdits!.phone} onChange={e => setLocalEdits(p => ({ ...p!, phone: e.target.value }))} className="border-emerald-200" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={localEdits!.location} onChange={e => setLocalEdits(p => ({ ...p!, location: e.target.value }))} className="border-emerald-200" /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Job Title</Label><Input value={localEdits!.title} onChange={e => setLocalEdits(p => ({ ...p!, title: e.target.value }))} className="border-emerald-200" /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Professional Summary</Label><Textarea value={localEdits!.summary} onChange={e => setLocalEdits(p => ({ ...p!, summary: e.target.value }))} rows={3} className="border-emerald-200" /></div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {displayForm.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-emerald-500" />{displayForm.phone}</div>}
                {displayForm.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 text-emerald-500" />{displayForm.location}</div>}
                {displayForm.summary && <p className="text-muted-foreground mt-2 leading-relaxed">{displayForm.summary}</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-emerald-600" />Skills</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Comma-separated skills</Label>
              <Input value={localEdits!.skills} onChange={e => setLocalEdits(p => ({ ...p!, skills: e.target.value }))} placeholder="JavaScript, React, Node.js..." className="border-emerald-200" />
            </div>
          ) : skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">{skills.map(s => <Badge key={s} className="bg-emerald-100 text-emerald-800 border-0">{s}</Badge>)}</div>
          ) : (
            <p className="text-xs text-muted-foreground">No skills added yet</p>
          )}
        </CardContent>
      </Card>

      {/* Education & Experience */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-emerald-200">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-emerald-600" />Education</CardTitle></CardHeader>
          <CardContent>
            {editing ? <Textarea value={localEdits!.education} onChange={e => setLocalEdits(p => ({ ...p!, education: e.target.value }))} rows={4} placeholder="Your education background..." className="border-emerald-200 text-sm" />
              : displayForm.education ? <p className="text-xs text-muted-foreground whitespace-pre-wrap">{displayForm.education}</p>
              : <p className="text-xs text-muted-foreground">No education added</p>}
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-600" />Experience</CardTitle></CardHeader>
          <CardContent>
            {editing ? <Textarea value={localEdits!.experience} onChange={e => setLocalEdits(p => ({ ...p!, experience: e.target.value }))} rows={4} placeholder="Your work experience..." className="border-emerald-200 text-sm" />
              : displayForm.experience ? <p className="text-xs text-muted-foreground whitespace-pre-wrap">{displayForm.experience}</p>
              : <p className="text-xs text-muted-foreground">No experience added</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}