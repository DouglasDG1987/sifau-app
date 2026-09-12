import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { inspections, occurrences, profiles, occurrenceStatusLog } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile || profile.role !== 'fiscal') {
      return NextResponse.json({ error: 'Only fiscais can create inspections' }, { status: 403 });
    }

    const body = await request.json();
    const {
      occurrence_id,
      arrival_at,
      arrival_lat,
      arrival_lng,
      report,
      action_taken,
      fine_amount,
      fine_process_number,
      mediaUrls,
    } = body;

    if (!occurrence_id || !arrival_at || !report || !action_taken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if occurrence is assigned to this fiscal
    const occurrence = await db.query.occurrences.findFirst({
      where: eq(occurrences.id, occurrence_id),
    });

    if (!occurrence) {
      return NextResponse.json({ error: 'Occurrence not found' }, { status: 404 });
    }

    if (occurrence.assigned_fiscal_id !== user.id) {
      return NextResponse.json({ error: 'Occurrence not assigned to you' }, { status: 403 });
    }

    // Create inspection
    const [inspection] = await db.insert(inspections).values({
      occurrence_id,
      fiscal_id: user.id,
      arrival_at: new Date(arrival_at),
      arrival_lat,
      arrival_lng,
      report_json: { report, action_taken, fine_amount, fine_process_number },
      action_taken,
      fine_amount: fine_amount || null,
      fine_process_number: fine_process_number || null,
    }).returning();

    // Update occurrence status to 'resolvida' if action is not 'sem_acao'
    if (action_taken !== 'sem_acao') {
      await db.update(occurrences)
        .set({ status: 'resolvida' })
        .where(eq(occurrences.id, occurrence_id));
    } else {
      await db.update(occurrences)
        .set({ status: 'em_vistoria' })
        .where(eq(occurrences.id, occurrence_id));
    }

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error) {
    console.error('Inspection creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
