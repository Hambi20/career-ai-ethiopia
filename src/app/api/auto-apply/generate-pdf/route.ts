import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Generate a professional PDF document as a downloadable buffer
function buildPdfText(content: string, title: string): string {
  // Simple approach: return the text content that will be wrapped in a downloadable HTML
  // For actual PDF, we use the browser's print capability
  return content;
}

// GET: Generate a PDF-ready document for an application
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('id');
    const type = searchParams.get('type') || 'both'; // 'cv', 'cover', 'both'

    // Special case: id='cv' means just download CV without application
    if (applicationId === 'cv' || type === 'cv-only') {
      const profile = await db.userProfile.findFirst({ orderBy: { updatedAt: 'desc' } });
      const cvHtml = generateCVHtml(profile);
      return NextResponse.json({ success: true, application: null, cvHtml, coverLetterHtml: null });
    }

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    const application = await db.application.findFirst({ where: { id: applicationId } });
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get user profile
    const profile = await db.userProfile.findFirst({ orderBy: { updatedAt: 'desc' } });

    const cvHtml = generateCVHtml(profile);
    const coverHtml = application.coverLetter ? generateCoverLetterHtml(application, profile) : '';

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        jobTitle: application.jobTitle,
        company: application.company,
        location: application.location,
        matchScore: application.matchScore,
        source: application.source,
        url: application.url,
      },
      cvHtml: type === 'cv' || type === 'both' ? cvHtml : null,
      coverLetterHtml: type === 'cover' || type === 'both' ? coverHtml : null,
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateCVHtml(profile: any): string {
  if (!profile) return '<p>Profile not found</p>';

  const skills = typeof profile.skills === 'string' ? JSON.parse(profile.skills) : (profile.skills || []);
  const education = typeof profile.education === 'string' ? JSON.parse(profile.education || '[]') : (profile.education || []);
  const experience = typeof profile.experience === 'string' ? JSON.parse(profile.experience || '[]') : (profile.experience || []);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Times New Roman', Georgia, serif; margin: 40px; color: #1a1a1a; line-height: 1.5; max-width: 800px; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2d6a4f; padding-bottom: 20px; }
  .name { font-size: 28px; font-weight: bold; color: #1b4332; margin-bottom: 5px; letter-spacing: 1px; }
  .title { font-size: 16px; color: #2d6a4f; font-style: italic; margin-bottom: 10px; }
  .contact { font-size: 12px; color: #555; }
  .contact span { margin: 0 8px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: bold; color: #1b4332; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1.5px solid #2d6a4f; padding-bottom: 5px; margin-bottom: 12px; }
  .summary { font-size: 12px; line-height: 1.6; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .skill-badge { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 4px 12px; border-radius: 4px; font-size: 11px; color: #166534; }
  .job { margin-bottom: 15px; }
  .job-header { display: flex; justify-content: space-between; align-items: baseline; }
  .job-title { font-size: 13px; font-weight: bold; color: #1a1a1a; }
  .job-company { font-size: 13px; color: #2d6a4f; font-weight: 600; }
  .job-period { font-size: 11px; color: #777; }
  .job-desc { font-size: 12px; color: #444; margin-top: 4px; }
  .edu-item { margin-bottom: 8px; }
  .edu-degree { font-size: 13px; font-weight: bold; }
  .edu-school { font-size: 12px; color: #555; }
  .languages { font-size: 12px; color: #444; }
  @media print {
    body { margin: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="name">${profile.fullName || 'Hambisa Bekuma Tefera'}</div>
    <div class="title">${profile.title || 'Sales Manager'}</div>
    <div class="contact">
      <span>📧 ${profile.email || 'hambisa1992@gmail.com'}</span>
      <span>📱 ${profile.phone || '+251 952 341 525'}</span>
      <span>📍 ${profile.location || 'Addis Ababa, Ethiopia'}</span>
    </div>
  </div>

  ${profile.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${profile.summary}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="skills-grid">
      ${(Array.isArray(skills) ? skills : []).map((s: string) => `<span class="skill-badge">${s}</span>`).join('\n      ')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Professional Experience</div>
    ${(Array.isArray(experience) ? experience : []).map((exp: any) => `
    <div class="job">
      <div class="job-header">
        <div><span class="job-title">${exp.title || exp.role || ''}</span> — <span class="job-company">${exp.company || ''}</span></div>
        <span class="job-period">${exp.period || ''}</span>
      </div>
      <div class="job-desc">${exp.description || ''}</div>
    </div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">Education</div>
    ${(Array.isArray(education) ? education : []).map((edu: any) => `
    <div class="edu-item">
      <div class="edu-degree">${edu.degree || edu.title || ''}</div>
      <div class="edu-school">${edu.institution || edu.school || ''} ${edu.year ? `— ${edu.year}` : ''}</div>
    </div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">Languages</div>
    <div class="languages">Amharic (Native) • English (Professional) • Afaan Oromo (Fluent) • Somali (Conversational)</div>
  </div>
</body>
</html>`;
}

function generateCoverLetterHtml(application: any, profile: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Times New Roman', Georgia, serif; margin: 40px; color: #1a1a1a; line-height: 1.6; max-width: 700px; }
  .letterhead { margin-bottom: 30px; border-bottom: 2px solid #2d6a4f; padding-bottom: 15px; }
  .name { font-size: 22px; font-weight: bold; color: #1b4332; }
  .contact { font-size: 12px; color: #555; margin-top: 5px; }
  .date { font-size: 12px; color: #555; margin-bottom: 20px; }
  .recipient { margin-bottom: 20px; font-size: 13px; }
  .subject { font-weight: bold; margin-bottom: 15px; font-size: 13px; }
  .body { font-size: 13px; line-height: 1.7; white-space: pre-line; }
  .signature { margin-top: 30px; }
  .sig-name { font-weight: bold; font-size: 14px; color: #1b4332; }
  .sig-contact { font-size: 12px; color: #555; margin-top: 5px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <div class="letterhead">
    <div class="name">${profile?.fullName || 'Hambisa Bekuma Tefera'}</div>
    <div class="contact">
      ${profile?.email || 'hambisa1992@gmail.com'} | ${profile?.phone || '+251 952 341 525'} | ${profile?.location || 'Addis Ababa, Ethiopia'}
    </div>
  </div>
  <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="recipient">
    <div><strong>Hiring Manager</strong></div>
    ${application.company ? `<div>${application.company}</div>` : ''}
  </div>
  <div class="subject">Re: Application for ${application.jobTitle}</div>
  <div class="body">${application.coverLetter || ''}</div>
  <div class="signature">
    <div class="sig-name">${profile?.fullName || 'Hambisa Bekuma Tefera'}</div>
    <div class="sig-contact">${profile?.email || 'hambisa1992@gmail.com'} | ${profile?.phone || '+251 952 341 525'}</div>
  </div>
</body>
</html>`;
}
