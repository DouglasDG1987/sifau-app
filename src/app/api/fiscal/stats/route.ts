import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { fiscalStats, profiles, inspections, occurrences } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only fiscais can view stats' }, { status: 403 });
    }

    let stats = await db.query.fiscalStats.findFirst({
      where: eq(fiscalStats.fiscal_id, user.id),
    });

    if (!stats) {
      // Create stats record if it doesn't exist
      const [newStats] = await db.insert(fiscalStats).values({
        fiscal_id: user.id,
        total_assigned: 0,
        total_resolved: 0,
        avg_resolution_hours: '0',
        sla_compliance_rate: '0',
      }).returning();
      stats = newStats;
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching fiscal stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
