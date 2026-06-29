import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/unified-store';

// GET: Generate a PDF-ready document for an application (mock)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('id');
    const type = searchParams.get('type') || 'both';
    const store = getStore();

    // Special case: id='cv' means just download CV
    if (applicationId === 'cv' || type === 'cv-only') {
      const cvHtml = generateCVHtml(null);
      return NextResponse.json({ success: true, application: null, cvHtml, coverLetterHtml: null });
    }

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    const application = store.applications.find(
      (a: any) => a.id === applicationId
    );

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const cvHtml = generateCVHtml(null);
    const coverHtml = application.coverLetter ? generateCoverLetterHtml(application, null) : '';

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
  .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .skill-badge { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 4px 12px; border-radius: 4px; font-size: 11px; color: #166534; }
  .job { margin-bottom: 15px; }
  .job-header { display: flex; justify-content: space-between; align-items: baseline; }
  .job-title { font-size: 13px; font-weight: bold; color: #1a1a1a; }
  .job-company { font-size: 13px; color: #2d6a4f; font-weight: 600; }
  .job-period { font-size: 11px; color: #777; }
  .job-desc { font-size: 12px; color: #444; margin-top: 4px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="name">Hambisa Bekuma Tefera</div>
    <div class="title">Sales Manager</div>
    <div class="contact">
      <span>📧 hambisa1992@gmail.com</span>
      <span>📱 +251 952 341 525</span>
      <span>📍 Addis Ababa, Ethiopia</span>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">Over eight years in sales across Eastern Ethiopia and Addis Ababa. Managed 150+ B2B accounts at Romel General Trading. Built marketing/sales dept from zero at Deran PLC with 20% revenue growth. Led marketing at OL-BRIGHT College with 30%+ enrollment increase.</div>
  </div>
  <div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="skills-grid">
      <span class="skill-badge">Territory Management</span>
      <span class="skill-badge">Route-to-Market</span>
      <span class="skill-badge">Market Expansion</span>
      <span class="skill-badge">B2B Account Management</span>
      <span class="skill-badge">Negotiation</span>
      <span class="skill-badge">Sales Planning</span>
      <span class="skill-badge">Team Leadership</span>
      <span class="skill-badge">Excel & Reporting</span>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Professional Experience</div>
    <div class="job"><div class="job-header"><div><span class="job-title">Route Sales Representative</span> — <span class="job-company">Romel General Trading</span></div><span class="job-period">Jan 2026-Present</span></div><div class="job-desc">Managing 150+ B2B accounts with weekly route planning and new account acquisition monthly.</div></div>
    <div class="job"><div class="job-header"><div><span class="job-title">Marketing Manager</span> — <span class="job-company">OL-BRIGHT International College</span></div><span class="job-period">Dec 2022-Nov 2025</span></div><div class="job-desc">Led 30%+ enrollment growth and opened 2 new branches.</div></div>
    <div class="job"><div class="job-header"><div><span class="job-title">Marketing & Sales Manager</span> — <span class="job-company">Deran PLC</span></div><span class="job-period">Dec 2020-Nov 2022</span></div><div class="job-desc">Built department from zero, achieved 20% revenue growth in 2 years.</div></div>
    <div class="job"><div class="job-header"><div><span class="job-title">Territory Sales Manager</span> — <span class="job-company">SMADL Communication Terminal Factory</span></div><span class="job-period">Jul 2016-Nov 2020</span></div><div class="job-desc">Managed territory across 8+ cities, hired and trained field representatives.</div></div>
  </div>
  <div class="section">
    <div class="section-title">Education</div>
    <div>Master of Business Administration (MBA) — 2018</div>
    <div>BSc Agribusiness — 2014</div>
  </div>
  <div class="section">
    <div class="section-title">Languages</div>
    <div>Amharic (Native) • English (Professional) • Afaan Oromo (Fluent) • Somali (Conversational)</div>
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
    <div class="name">Hambisa Bekuma Tefera</div>
    <div class="contact">hambisa1992@gmail.com | +251 952 341 525 | Addis Ababa, Ethiopia</div>
  </div>
  <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="recipient">
    <div><strong>Hiring Manager</strong></div>
    ${application.company ? `<div>${application.company}</div>` : ''}
  </div>
  <div class="subject">Re: Application for ${application.jobTitle}</div>
  <div class="body">${application.coverLetter || 'Please accept this application for the above position. I am confident that my skills and experience make me a strong candidate.'}</div>
  <div class="signature">
    <div class="sig-name">Hambisa Bekuma Tefera</div>
    <div class="sig-contact">hambisa1992@gmail.com | +251 952 341 525</div>
  </div>
</body>
</html>`;
}
