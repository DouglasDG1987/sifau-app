import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { occurrenceMedia } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dataUrl, kind, occurrenceId } = body;

    if (!dataUrl || !occurrenceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real implementation, you would upload to Supabase Storage or another service
    // For now, we'll use the dataURL directly (not recommended for production)
    const url = dataUrl; // In production, this would be a storage URL

    const [media] = await db.insert(occurrenceMedia).values({
      occurrence_id: occurrenceId,
      url,
      type: kind || 'foto',
      uploaded_by: user.id,
    }).returning();

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
