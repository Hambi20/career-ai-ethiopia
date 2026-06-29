import { NextRequest, NextResponse } from 'next/server';
import { deleteKnowledge } from '@/lib/unified-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteKnowledge(id);
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}