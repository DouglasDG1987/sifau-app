import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { ordensServico, profiles, occurrences } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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
    const autosParam = searchParams.get('autos') === '1';
    const fiscaisParam = searchParams.get('fiscais') === '1';

    if (fiscaisParam) {
      const fiscais = await db.query.profiles.findMany({
        where: eq(profiles.role, 'fiscal'),
      });
      return NextResponse.json({ fiscais });
    }

    const ordens = await db.query.ordensServico.findMany({
      orderBy: [desc(ordensServico.data_emissao)],
    });

    return NextResponse.json({ ordens });
  } catch (error) {
    console.error('Error fetching ordens:', error);
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

    if (!profile || profile.role !== 'gestor') {
      return NextResponse.json({ error: 'Only gestores can create OS' }, { status: 403 });
    }

    const body = await request.json();
    const {
      numero_os,
      origem_os,
      denuncia_id,
      requerente,
      fiscal_id,
      apoio_operacional,
      orgao_apoio,
      orgao_apoio_outro,
      servico_descricao,
      legislacao_aplicavel,
      endereco,
      latitude,
      longitude,
      prazo_resposta,
    } = body;

    if (!numero_os || !origem_os || !requerente || !servico_descricao || !endereco || !prazo_resposta) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [os] = await db.insert(ordensServico).values({
      numero_os,
      origem_os,
      denuncia_id: denuncia_id || null,
      requerente,
      gerente_id: user.id,
      fiscal_id: fiscal_id || null,
      apoio_operacional: apoio_operacional || false,
      orgao_apoio: orgao_apoio || null,
      orgao_apoio_outro: orgao_apoio_outro || null,
      servico_descricao,
      legislacao_aplicavel: legislacao_aplicavel || [],
      endereco,
      latitude: latitude || null,
      longitude: longitude || null,
      prazo_resposta: new Date(prazo_resposta),
      status: 'aberta',
    }).returning();

    return NextResponse.json({ os }, { status: 201 });
  } catch (error) {
    console.error('Error creating OS:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
