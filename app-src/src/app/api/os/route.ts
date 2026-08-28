import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { ordensServico, profiles, autosInfracao, tiposInfracao } from "@/db/schema";
import { notifyFiscalAboutAssignment } from "@/lib/notifications";

const fiscalProfile = alias(profiles, "fiscal_profiles");
const gerenteProfile = alias(profiles, "gerente_profiles");
import { getSessionProfile, requireRole } from "@/lib/auth";
import type { OrdemServico, OrigemOS, OrgaoApoio } from "@/lib/types";
import { ORIGEM_OS_LABELS } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapOS(row: typeof ordensServico.$inferSelect & { fiscal_nome?: string | null; gerente_nome?: string | null }): OrdemServico {
  return {
    id: row.id,
    numero_os: row.numero_os,
    origem_os: row.origem_os as OrigemOS,
    denuncia_id: row.denuncia_id,
    requerente: row.requerente,
    gerente_id: row.gerente_id,
    gerente_nome: row.gerente_nome ?? null,
    fiscal_id: row.fiscal_id,
    fiscal_nome: row.fiscal_nome ?? null,
    apoio_operacional: row.apoio_operacional,
    orgao_apoio: (row.orgao_apoio as OrgaoApoio) ?? null,
    orgao_apoio_outro: row.orgao_apoio_outro,
    servico_descricao: row.servico_descricao,
    legislacao_aplicavel: row.legislacao_aplicavel,
    endereco: row.endereco,
    latitude: row.latitude,
    longitude: row.longitude,
    data_emissao: row.data_emissao.toISOString(),
    prazo_resposta: row.prazo_resposta.toISOString(),
    status: row.status as OrdemServico["status"],
    criado_em: row.criado_em.toISOString(),
    atualizado_em: row.atualizado_em.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const sp = req.nextUrl.searchParams;

  if (sp.get("fiscais") === "1") {
    const fiscais = await db
      .select({ id: profiles.id, nome: profiles.nome })
      .from(profiles)
      .where(and(eq(profiles.role, "fiscal"), eq(profiles.ativo, true)))
      .orderBy(profiles.nome);
    return NextResponse.json({ fiscais });
  }

  const rows = await db
    .select({
      os: ordensServico,
      fiscal_nome: fiscalProfile.nome,
      gerente_nome: gerenteProfile.nome,
    })
    .from(ordensServico)
    .leftJoin(fiscalProfile, eq(fiscalProfile.id, ordensServico.fiscal_id))
    .leftJoin(gerenteProfile, eq(gerenteProfile.id, ordensServico.gerente_id))
    .orderBy(desc(ordensServico.criado_em));

  let list = rows;
  if (profile.role === "fiscal") {
    list = rows.filter((r) => r.os.fiscal_id === profile.id);
  }

  const osList = list.map((r) =>
    mapOS({ ...r.os, fiscal_nome: r.fiscal_nome ?? null, gerente_nome: r.gerente_nome ?? null })
  );

  // Resumo de autos de infração (auditor/gestor)
  let autos: unknown[] = [];
  if (sp.get("autos") === "1" && profile.role !== "cidadao") {
    const rowsAutos = await db
      .select({
        auto: autosInfracao,
        tipo: tiposInfracao,
        os: ordensServico,
      })
      .from(autosInfracao)
      .innerJoin(tiposInfracao, eq(autosInfracao.tipo_infracao_id, tiposInfracao.id))
      .innerJoin(ordensServico, eq(autosInfracao.os_id, ordensServico.id))
      .orderBy(desc(autosInfracao.criado_em));
    autos = rowsAutos.map((r) => ({
      id: r.auto.id,
      os_id: r.auto.os_id,
      numero_os: r.os.numero_os,
      tipo_infracao_id: r.auto.tipo_infracao_id,
      artigo_legal: r.tipo.artigo_legal,
      infracao_descricao: r.tipo.descricao,
      valor_multa: Number(r.auto.valor_multa),
      motivo: r.auto.motivo,
      autuado_nome: r.auto.autuado_nome,
      autuado_documento: r.auto.autuado_documento,
      ciencia_status: r.auto.ciencia_status,
      testemunha_nome: r.auto.testemunha_nome,
      criado_em: r.auto.criado_em.toISOString(),
    }));
  }

  return NextResponse.json({ ordens: osList, autos });
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["gestor"])) return err("Apenas a gestão pode emitir Ordens de Serviço.", 403);

  const body = (await req.json().catch(() => ({}))) as {
    origem_os?: string;
    denuncia_id?: string | null;
    requerente?: string;
    fiscal_id?: string | null;
    apoio_operacional?: boolean;
    orgao_apoio?: string | null;
    orgao_apoio_outro?: string | null;
    servico_descricao?: string;
    legislacao_aplicavel?: string[];
    endereco?: string;
    latitude?: number | null;
    longitude?: number | null;
    prazo_dias?: number;
  };

  const origem = body.origem_os as OrigemOS;
  if (!ORIGEM_OS_LABELS[origem]) return err("Origem inválida.", 400);
  if (!body.requerente || String(body.requerente).trim().length < 3) return err("Informe o requerente.", 400);
  if (!body.servico_descricao || String(body.servico_descricao).trim().length < 20) {
    return err("Descreva o serviço da OS (mínimo 20 caracteres).", 400);
  }
  if (!body.endereco || String(body.endereco).trim().length < 5) return err("Informe o endereço.", 400);
  const prazoDias = Math.max(1, Math.min(365, Number(body.prazo_dias) || 7));
  const prazo = new Date(Date.now() + prazoDias * 24 * 3600 * 1000);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordensServico);
  const ano = new Date().getFullYear();
  const numero_os = `OS-${ano}-${String(count + 1).padStart(4, "0")}`;

  const [created] = await db
    .insert(ordensServico)
    .values({
      numero_os,
      origem_os: origem,
      denuncia_id: body.denuncia_id ?? null,
      requerente: String(body.requerente).trim(),
      gerente_id: profile.id,
      fiscal_id: body.fiscal_id ?? null,
      apoio_operacional: Boolean(body.apoio_operacional),
      orgao_apoio: body.orgao_apoio ?? null,
      orgao_apoio_outro: body.orgao_apoio_outro ?? null,
      servico_descricao: String(body.servico_descricao).trim(),
      legislacao_aplicavel: Array.isArray(body.legislacao_aplicavel) ? body.legislacao_aplicavel : [],
      endereco: String(body.endereco).trim(),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      prazo_resposta: prazo,
    })
    .returning();

  const fiscal = body.fiscal_id
    ? await db
        .select({ id: profiles.id, nome: profiles.nome })
        .from(profiles)
        .where(eq(profiles.id, body.fiscal_id))
        .limit(1)
    : null;

  // Notifica o fiscal se foi designado
  if (fiscal && fiscal[0]) {
    await notifyFiscalAboutAssignment(
      created.id,
      fiscal[0].id,
      "Ordem de Serviço"
    );
  }

  return NextResponse.json(
    {
      os: mapOS({
        ...created,
        fiscal_nome: fiscal?.[0]?.nome ?? null,
        gerente_nome: profile.nome,
      }),
    },
    { status: 201 }
  );
}
