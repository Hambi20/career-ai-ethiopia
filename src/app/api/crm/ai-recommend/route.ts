import { NextRequest, NextResponse } from 'next/server';
import { getContacts, ensureStoreWarmed } from '@/lib/unified-store';

export async function POST(request: NextRequest) {
  try {
    await ensureStoreWarmed();
    const { contactId } = await request.json();
    const contacts = getContacts();
    const contact = contacts.find((c: any) => (c.id || c._id) === contactId);
    if (!contact) return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });

    const type = contact.type || 'general';
    const recommendations: string[] = [];
    if (type === 'customer' || type === 'Customer') {
      recommendations.push('Schedule a follow-up visit within 2 weeks');
      recommendations.push('Consider upselling premium products');
      recommendations.push('Review their order history for patterns');
    } else if (type === 'dealer' || type === 'Dealer') {
      recommendations.push('Review current inventory levels');
      recommendations.push('Discuss quarterly targets and incentives');
      recommendations.push('Explore new product line opportunities');
    } else {
      recommendations.push('Send a personalized follow-up email');
      recommendations.push('Schedule a discovery call to understand needs');
      recommendations.push('Add to relevant nurture campaign');
    }
    recommendations.push(`Follow up regarding ${(contact.company || 'their organization')} within 48 hours`);

    return NextResponse.json({ success: true, recommendations: recommendations.join('\n'), contact });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
