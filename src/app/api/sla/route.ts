import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { slaRules, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    if (!profile || profile.role !== 'gestor') {
      return NextResponse.json({ error: 'Only gestores can view SLA rules' }, { status: 403 });
    }

    const rules = await db.query.slaRules.findMany();

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching SLA rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile || profile.role !== 'gestor') {
      return NextResponse.json({ error: 'Only gestores can update SLA rules' }, { status: 403 });
    }

    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: 'Invalid rules format' }, { status: 400 });
    }

    // Update or insert each rule
    for (const rule of rules) {
      const existing = await db.query.slaRules.findFirst({
        where: eq(slaRules.category, rule.category),
      });

      if (existing) {
        await db.update(slaRules)
          .set({ 
            hours: rule.hours,
            updated_at: new Date(),
          })
          .where(eq(slaRules.id, existing.id));
      } else {
        await db.insert(slaRules).values({
          category: rule.category,
          hours: rule.hours,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating SLA rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
