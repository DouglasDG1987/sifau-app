import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase';
import { db } from '@/db';
import { profiles, auditExports, occurrenceStatusLog } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

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

    if (!profile || (profile.role !== 'gestor' && profile.role !== 'auditor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view');

    if (view === 'users') {
      const users = await db.query.profiles.findMany({
        orderBy: (profiles, { desc }) => [desc(profiles.created_at)],
      });
      return NextResponse.json({ users });
    }

    if (view === 'exports') {
      const exports = await db.query.auditExports.findMany({
        orderBy: (auditExports, { desc }) => [desc(auditExports.created_at)],
      });
      return NextResponse.json({ exports });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile || (profile.role !== 'gestor' && profile.role !== 'auditor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role, ativo } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Update user
    const [updated] = await db.update(profiles)
      .set({ 
        role: role || undefined,
        ativo: ativo !== undefined ? ativo : undefined,
      })
      .where(eq(profiles.id, userId))
      .returning();

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Error updating user:', error);
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

    if (!profile || (profile.role !== 'gestor' && profile.role !== 'auditor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, type, description } = body;

    if (action === 'export') {
      let data;
      let rowCount = 0;

      if (type === 'audit_trail') {
        data = await db.query.occurrenceStatusLog.findMany({
          orderBy: (occurrenceStatusLog, { desc }) => [desc(occurrenceStatusLog.changed_at)],
        });
        rowCount = data.length;
      } else if (type === 'users') {
        data = await db.query.profiles.findMany();
        rowCount = data.length;
      } else if (type === 'occurrences') {
        data = await db.query.occurrences.findMany();
        rowCount = data.length;
      } else {
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
      }

      // Calculate SHA-256 hash
      const dataString = JSON.stringify(data, null, 2);
      const sha256 = crypto.createHash('sha256').update(dataString).digest('hex');

      // Register export
      const [exportRecord] = await db.insert(auditExports).values({
        profile_id: user.id,
        sha256,
        description: description || `Exportação de ${type}`,
        row_count: rowCount,
      }).returning();

      return NextResponse.json({ 
        sha256,
        rowCount,
        exportId: exportRecord.id,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in admin action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
