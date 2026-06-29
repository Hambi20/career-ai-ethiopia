import { NextRequest, NextResponse } from 'next/server';

// Sample Ethiopian job data for mock responses
const SAMPLE_JOBS = [
  { title: 'Sales Manager', company: 'Ethio Telecom', location: 'Addis Ababa' },
  { title: 'Marketing Manager', company: 'Dashen Brewery', location: 'Addis Ababa' },
  { title: 'Business Development Officer', company: 'Mekelle Business Incubation Center', location: 'Mekelle' },
  { title: 'Senior Accountant', company: 'Ethiopian Airlines', location: 'Addis Ababa' },
  { title: 'Software Developer', company: 'Hibre-IT Solutions', location: 'Addis Ababa' },
  { title: 'Human Resources Manager', company: 'Moss Building Materials', location: 'Dire Dawa' },
  { title: 'Project Manager', company: 'Yencomad Real Estate', location: 'Addis Ababa' },
  { title: 'Data Entry Clerk', company: 'Ethiopian Revenue Authority', location: 'Addis Ababa' },
  { title: 'Customer Service Representative', company: 'Commercial Bank of Ethiopia', location: 'Hawassa' },
  { title: 'Route Sales Representative', company: 'Heineken Ethiopia', location: 'Addis Ababa' },
  { title: 'Territory Sales Manager', company: 'Mugen Pharmaceuticals', location: 'Bahir Dar' },
  { title: 'Administrative Assistant', company: 'UNDP Ethiopia', location: 'Addis Ababa' },
  { title: 'Finance Officer', company: 'World Vision Ethiopia', location: 'Adama' },
  { title: 'Procurement Specialist', company: 'Ethiopian Electric Utility', location: 'Addis Ababa' },
  { title: 'Digital Marketing Specialist', company: 'Kuraz Technology', location: 'Addis Ababa' },
  { title: 'Operations Manager', company: 'Dangote Cement Ethiopia', location: 'Jimma' },
  { title: 'Nursing Officer', company: 'Black Lion Hospital', location: 'Addis Ababa' },
  { title: 'Mechanical Engineer', company: 'Ethiopian Roads Authority', location: 'Addis Ababa' },
  { title: 'Graphic Designer', company: 'Berry Advertising', location: 'Addis Ababa' },
  { title: 'Branch Manager', company: 'Awash Bank', location: 'Dessie' },
  { title: 'Logistics Coordinator', company: 'DHL Ethiopia', location: 'Addis Ababa' },
  { title: 'Research Analyst', company: 'Ethiopian Economics Association', location: 'Addis Ababa' },
  { title: 'IT Support Specialist', company: 'Ethio Telecom', location: 'Dire Dawa' },
  { title: 'Legal Advisor', company: 'Law Offices of Ethiopia', location: 'Addis Ababa' },
  { title: 'Quality Assurance Manager', company: 'Messebo Cement', location: 'Mekelle' },
  { title: 'Teacher - English', company: 'Gospel Light Academy', location: 'Addis Ababa' },
  { title: 'Supply Chain Manager', company: 'East Africa Holdings', location: 'Addis Ababa' },
  { title: 'Civil Engineer', company: 'Consulting Engineers Group', location: 'Hawassa' },
  { title: 'Sales Executive', company: 'MIDROC Investment Group', location: 'Addis Ababa' },
  { title: 'Public Relations Officer', company: 'Ethiopian Broadcasting Corporation', location: 'Addis Ababa' },
];

function matchJobs(query: string, limit: number) {
  if (!query) return SAMPLE_JOBS.slice(0, limit);

  const q = query.toLowerCase();
  const keywords = q.split(/\s+/).filter((w: string) => w.length > 1);

  const scored = SAMPLE_JOBS.map((job) => {
    const text = `${job.title} ${job.company} ${job.location}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1;
    }
    return { ...job, _score: score };
  });

  // Sort by score descending, then by original order
  scored.sort((a, b) => b._score - a._score);

  // If no matches, return first N jobs
  if (scored[0]._score === 0) {
    return SAMPLE_JOBS.slice(0, limit).map(({ _score, ...rest }: any) => rest);
  }

  return scored
    .filter((j) => j._score > 0)
    .slice(0, limit)
    .map(({ _score, ...rest }: any) => rest);
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();

    const jobs = matchJobs(query || '', limit);

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Job search error:', error);
    return NextResponse.json(
      { success: true, jobs: [] },
      { status: 200 }
    );
  }
}
