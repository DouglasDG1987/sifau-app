import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { occurrences, occurrenceMedia, profiles } from '@/db/schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';

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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const mapView = searchParams.get('map') === '1';
    const overviewView = searchParams.get('view') === 'overview';
    const rankingView = searchParams.get('view') === 'ranking';
    const logsView = searchParams.get('logs') === '1';

    if (mapView) {
      // Return map points (anonymized for citizens)
      let query;
      
      if (profile.role === 'cidadao') {
        // Citizens see only their own occurrences on map
        query = db.select({
          id: occurrences.id,
          lat: occurrences.lat,
          lng: occurrences.lng,
          category: occurrences.category,
          status: occurrences.status,
          urgency_score: occurrences.urgency_score,
        }).from(occurrences).where(eq(occurrences.citizen_id, user.id));
      } else {
        // Other roles see all occurrences
        query = db.select({
          id: occurrences.id,
          lat: occurrences.lat,
          lng: occurrences.lng,
          category: occurrences.category,
          status: occurrences.status,
          urgency_score: occurrences.urgency_score,
        }).from(occurrences);
      }
      
      const mapPoints = await query;
      return NextResponse.json({ mapPoints });
    }

    if (overviewView) {
      // Return statistics
      const stats = await db.select({
        total: sql<number>`count(*)`,
        resolved: sql<number>`count(*) filter (where status = 'resolvida')`,
        inProgress: sql<number>`count(*) filter (where status in ('atribuida', 'em_vistoria'))`,
        slaExceeded: sql<number>`count(*) filter (where sla_deadline < now() and status not in ('resolvida', 'arquivada'))`,
      }).from(occurrences);

      return NextResponse.json({ stats: stats[0] });
    }

    if (rankingView) {
      // Return fiscal ranking
      const ranking = await db.query.fiscalStats.findMany({
        orderBy: (fiscalStats, { desc }) => [desc(fiscalStats.total_resolved)],
      });

      return NextResponse.json({ ranking });
    }

    if (logsView) {
      // Return audit trail (only for gestores and auditores)
      if (profile.role !== 'gestor' && profile.role !== 'auditor') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const logs = await db.query.occurrenceStatusLog.findMany({
        orderBy: (occurrenceStatusLog, { desc }) => [desc(occurrenceStatusLog.changed_at)],
        limit: 100,
      });

      return NextResponse.json({ logs });
    }

    // Default: return occurrences based on role
    let userOccurrences;
    
    if (profile.role === 'cidadao') {
      userOccurrences = await db.query.occurrences.findMany({
        where: eq(occurrences.citizen_id, user.id),
        orderBy: [desc(occurrences.created_at)],
      });
    } else if (profile.role === 'fiscal') {
      userOccurrences = await db.query.occurrences.findMany({
        where: eq(occurrences.assigned_fiscal_id, user.id),
        orderBy: [desc(occurrences.created_at)],
      });
    } else {
      // gestor and auditor see all
      userOccurrences = await db.query.occurrences.findMany({
        orderBy: [desc(occurrences.created_at)],
      });
    }

    return NextResponse.json({ occurrences: userOccurrences });
  } catch (error) {
    console.error('Error fetching occurrences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    if (!profile || profile.role !== 'cidadao') {
      return NextResponse.json({ error: 'Only citizens can create occurrences' }, { status: 403 });
    }

    const body = await request.json();
    const {
      category,
      subcategory,
      description,
      lat,
      lng,
      bairro,
      address,
      urgency_score = 2,
    } = body;

    if (!category || !description || !lat || !lng) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (description.length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 });
    }

    const [newOccurrence] = await db.insert(occurrences).values({
      citizen_id: user.id,
      category,
      subcategory,
      description,
      lat,
      lng,
      bairro,
      address,
      urgency_score,
      status: 'aberta',
      sla_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000), // Default 72 hours
    }).returning();

    return NextResponse.json({ occurrence: newOccurrence }, { status: 201 });
  } catch (error) {
    console.error('Error creating occurrence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
