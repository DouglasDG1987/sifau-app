import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { ordensServico, profiles, vistorias, autosInfracao, tiposInfracao, occurrences } from "@/db/schema";
import { calcularMultaComRecidiva, registrarRecidiva } from "@/lib/recidiva";

const fiscalProfile = alias(profiles, "fiscal_profiles");
const gerenteProfile = alias(profiles, "gerente_profiles");
import { getSessionProfile, requireRole } from "@/lib/auth";
import { haversineMeters } from "@/lib/geo";
import { GEOFENCE_RADIUS_M } from "@/lib/types";
import type { CienciaStatus } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const { id } = await params;

  const rows = await db
    .select({
      os: ordensServico,
      fiscal_nome: fiscalProfile.nome,
      gerente_nome: gerenteProfile.nome,
    })
    .from(ordensServico)
    .leftJoin(fiscalProfile, eq(fiscalProfile.id, ordensServico.fiscal_id))
    .leftJoin(gerenteProfile, eq(gerenteProfile.id, ordensServico.gerente_id))
    .where(eq(ordensServico.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return err("Ordem de Serviço não encontrada.", 404);
  if (profile.role === "fiscal" && row.os.fiscal_id !== profile.id) {
    return err("Esta OS não está atribuída a você.", 403);
  }
  if (profile.role === "cidadao") return err("Sem permissão.", 403);

  const [vistoriaRows, autoRows] = await Promise.all([
    db.select().from(vistorias).where(eq(vistorias.os_id, id)).orderBy(vistorias.iniciada_em),
    db
      .select({
        auto: autosInfracao,
        tipo: tiposInfracao,
      })
      .from(autosInfracao)
      .innerJoin(tiposInfracao, eq(autosInfracao.tipo_infracao_id, tiposInfracao.id))
      .where(eq(autosInfracao.os_id, id)),
  ]);

  return NextResponse.json({
    os: {
      ...row.os,
      data_emissao: row.os.data_emissao.toISOString(),
      prazo_resposta: row.os.prazo_resposta.toISOString(),
      criado_em: row.os.criado_em.toISOString(),
      atualizado_em: row.os.atualizado_em.toISOString(),
      fiscal_nome: row.fiscal_nome ?? null,
      gerente_nome: row.gerente_nome ?? null,
    },
    vistorias: vistoriaRows.map((v) => ({
      ...v,
      iniciada_em: v.iniciada_em.toISOString(),
      finalizada_em: v.finalizada_em?.toISOString() ?? null,
      criado_em: v.criado_em.toISOString(),
    })),
    autos: autoRows.map((r) => ({
      id: r.auto.id,
      os_id: r.auto.os_id,
      tipo_infracao_id: r.auto.tipo_infracao_id,
      valor_multa: Number(r.auto.valor_multa),
      motivo: r.auto.motivo,
      autuado_nome: r.auto.autuado_nome,
      autuado_documento: r.auto.autuado_documento,
      ciencia_status: r.auto.ciencia_status,
      testemunha_nome: r.auto.testemunha_nome,
      criado_em: r.auto.criado_em.toISOString(),
      tipo_infracao: {
        id: r.tipo.id,
        artigo_legal: r.tipo.artigo_legal,
        descricao: r.tipo.descricao,
        valor_base: Number(r.tipo.valor_base),
      },
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action as string;

  const rows = await db.select().from(ordensServico).where(eq(ordensServico.id, id)).limit(1);
  const os = rows[0];
  if (!os) return err("Ordem de Serviço não encontrada.", 404);

  if (action === "iniciar_vistoria") {
    if (!requireRole(profile, ["fiscal"])) return err("Sem permissão.", 403);
    if (os.fiscal_id !== profile.id) return err("Esta OS não está atribuída a você.", 403);
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return err("Geolocalização obrigatória para iniciar a vistoria.", 400);
    // Geofencing: só permite iniciar dentro do raio do endereço da OS
    if (os.latitude != null && os.longitude != null) {
      const dist = haversineMeters(lat, lng, os.latitude, os.longitude);
      if (dist > GEOFENCE_RADIUS_M) {
        return err(
          `Você está a ${Math.round(dist)}m do endereço da OS (limite: ${GEOFENCE_RADIUS_M}m). Aproxime-se do local para iniciar a vistoria.`,
          403
        );
      }
    }
    const [vistoria] = await db
      .insert(vistorias)
      .values({
        os_id: id,
        fiscal_id: profile.id,
        iniciada_em: new Date(),
        geo_inicio_lat: lat,
        geo_inicio_lng: lng,
        geo_inicio_precisao_m: Number.isFinite(Number(body.precisao_m)) ? Number(body.precisao_m) : null,
        status: "em_andamento",
        fotos: [],
      })
      .returning();
    await db
      .update(ordensServico)
      .set({ status: "em_vistoria", atualizado_em: new Date() })
      .where(eq(ordensServico.id, id));
    return NextResponse.json({ ok: true, vistoria_id: vistoria.id });
  }

  if (action === "finalizar_vistoria") {
    if (!requireRole(profile, ["fiscal"])) return err("Sem permissão.", 403);
    if (os.fiscal_id !== profile.id) return err("Esta OS não está atribuída a você.", 403);
    const vistoriaId = String(body.vistoria_id ?? "");
    if (!vistoriaId) return err("Vistoria não identificada.", 400);
    const vRows = await db.select().from(vistorias).where(eq(vistorias.id, vistoriaId)).limit(1);
    if (!vRows[0]) return err("Vistoria não encontrada.", 404);

    const relatorio = String(body.relatorio ?? "").trim();
    const mediaUrls = Array.isArray(body.mediaUrls) ? (body.mediaUrls as string[]) : [];

    await db
      .update(vistorias)
      .set({
        finalizada_em: new Date(),
        relatorio: relatorio || null,
        fotos: mediaUrls,
        status: "finalizada",
      })
      .where(eq(vistorias.id, vistoriaId));

    // Auto de infração (obrigatório registrar a ciência para validade jurídica)
    const auto = body.auto as
      | {
          tipo_infracao_id?: string;
          valor_multa?: number;
          motivo?: string;
          autuado_nome?: string;
          autuado_documento?: string;
          ciencia_status?: CienciaStatus;
          testemunha_nome?: string;
        }
      | null
      | undefined;
    if (auto && auto.tipo_infracao_id) {
      if (!["assinou", "recusou", "ausente"].includes(auto.ciencia_status ?? "")) {
        return err("Registre a ciência do autuado (assinou, recusou ou ausente).", 400);
      }
      
      // Verifica reincidência se houver documento
      let valorFinal = auto.valor_multa ?? 0;
      let recidivaInfo = null;
      
      if (auto.autuado_documento) {
        const recidivaCheck = await calcularMultaComRecidiva(
          auto.valor_multa ?? 0,
          auto.autuado_documento,
          String(auto.tipo_infracao_id)
        );
        valorFinal = recidivaCheck.valor_final;
        recidivaInfo = recidivaCheck;
      }
      
      // Define data de vencimento (30 dias a partir de hoje)
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 30);
      
      const [createdAuto] = await db.insert(autosInfracao).values({
        os_id: id,
        tipo_infracao_id: String(auto.tipo_infracao_id),
        valor_multa: String(valorFinal),
        motivo: auto.motivo ?? null,
        autuado_nome: auto.autuado_nome ?? null,
        autuado_documento: auto.autuado_documento ?? null,
        ciencia_status: auto.ciencia_status ?? "ausente",
        testemunha_nome: auto.testemunha_nome ?? null,
        status_pagamento: "pendente",
        data_vencimento: dataVencimento,
      }).returning();
      
      // Registra reincidência se detectada
      if (recidivaInfo && recidivaInfo.nivel > 0 && auto.autuado_documento && os.denuncia_id) {
        await registrarRecidiva({
          auto_infracao_id: createdAuto.id,
          documento_responsavel: auto.autuado_documento,
          ocorrencia_original_id: os.denuncia_id,
        });
      }
    }

    await db
      .update(ordensServico)
      .set({ status: "concluida", atualizado_em: new Date() })
      .where(eq(ordensServico.id, id));
    return NextResponse.json({ ok: true });
  }

  if (action === "cancelar") {
    if (!requireRole(profile, ["gestor"])) return err("Apenas a gestão pode cancelar OS.", 403);
    await db
      .update(ordensServico)
      .set({ status: "cancelada", atualizado_em: new Date() })
      .where(eq(ordensServico.id, id));
    return NextResponse.json({ ok: true });
  }

  return err("Ação inválida.", 400);
}
