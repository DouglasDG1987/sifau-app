import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { occurrences, occurrenceMedia, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const occurrence = await db.query.occurrences.findFirst({
      where: eq(occurrences.id, id),
    });

    if (!occurrence) {
      return NextResponse.json({ error: 'Occurrence not found' }, { status: 404 });
    }

    // Check access based on role
    if (profile.role === 'cidadao' && occurrence.citizen_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (profile.role === 'fiscal' && occurrence.assigned_fiscal_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get media
    const media = await db.query.occurrenceMedia.findMany({
      where: eq(occurrenceMedia.occurrence_id, id),
    });

    return NextResponse.json({ occurrence, media });
  } catch (error) {
    console.error('Error fetching occurrence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile || profile.role !== 'gestor') {
      return NextResponse.json({ error: 'Only gestores can update occurrences' }, { status: 403 });
    }

    const body = await request.json();
    const { status, assigned_fiscal_id } = body;

    const [updated] = await db.update(occurrences)
      .set({ 
        status,
        assigned_fiscal_id: assigned_fiscal_id || null,
      })
      .where(eq(occurrences.id, id))
      .returning();

    return NextResponse.json({ occurrence: updated });
  } catch (error) {
    console.error('Error updating occurrence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
