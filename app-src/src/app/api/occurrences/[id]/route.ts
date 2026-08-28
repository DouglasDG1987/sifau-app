import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { occurrences, profiles, occurrenceMedia, statusLogs, comments, inspections } from "@/db/schema";

const citizenProfile = alias(profiles, "citizen_profiles");
const fiscalProfile = alias(profiles, "fiscal_profiles");
import { getSessionProfile, clientIp, requireRole } from "@/lib/auth";
import { logStatusChange } from "@/lib/audit";
import type { CommentVisibility, Occurrence, OccurrenceStatus } from "@/lib/types";
import { ACTION_LABELS, isOpenStatus } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const { id } = await params;

  const rows = await db
    .select({
      occ: occurrences,
      citizen: citizenProfile.nome,
      fiscal: fiscalProfile.nome,
    })
    .from(occurrences)
    .leftJoin(citizenProfile, eq(citizenProfile.id, occurrences.citizen_id))
    .leftJoin(fiscalProfile, eq(fiscalProfile.id, occurrences.assigned_fiscal_id))
    .where(eq(occurrences.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return err("Ocorrência não encontrada.", 404);

  const occ = row.occ;
  // Permissões
  if (profile.role === "cidadao" && occ.citizen_id !== profile.id) {
    return err("Você não tem acesso a esta ocorrência.", 403);
  }
  if (profile.role === "fiscal" && occ.assigned_fiscal_id !== profile.id) {
    return err("Esta ocorrência não está atribuída a você.", 403);
  }

  const [media, logs, allComments, inspRows] = await Promise.all([
    db
      .select()
      .from(occurrenceMedia)
      .where(eq(occurrenceMedia.occurrence_id, id))
      .orderBy(desc(occurrenceMedia.created_at)),
    db
      .select()
      .from(statusLogs)
      .where(eq(statusLogs.occurrence_id, id))
      .orderBy(desc(statusLogs.changed_at)),
    db
      .select({
        id: comments.id,
        occurrence_id: comments.occurrence_id,
        author_id: comments.author_id,
        author_name: comments.author_name,
        visibility: comments.visibility,
        text: comments.text,
        created_at: comments.created_at,
      })
      .from(comments)
      .where(eq(comments.occurrence_id, id))
      .orderBy(desc(comments.created_at)),
    db
      .select()
      .from(inspections)
      .where(eq(inspections.occurrence_id, id))
      .orderBy(desc(inspections.created_at)),
  ]);

  const isCitizen = profile.role === "cidadao";
  const visibleComments = allComments.filter((c) => (isCitizen ? c.visibility === "public" : true));

  return NextResponse.json({
    occurrence: {
      ...occ,
      created_at: occ.created_at.toISOString(),
      sla_deadline: occ.sla_deadline.toISOString(),
      assigned_fiscal_name: row.fiscal ?? null,
    } as Occurrence,
    citizen_nome: profile.role === "cidadao" ? profile.nome : (row.citizen ?? null),
    media: media.map((m) => ({
      id: m.id,
      occurrence_id: m.occurrence_id,
      url: m.url,
      type: m.type,
      uploaded_by: m.uploaded_by,
      created_at: m.created_at.toISOString(),
    })),
    logs: logs.map((l) => ({
      id: l.id,
      occurrence_id: l.occurrence_id,
      from_status: l.from_status,
      to_status: l.to_status,
      changed_by: l.changed_by,
      changed_by_name: l.changed_by_name,
      changed_at: l.changed_at.toISOString(),
      ip_address: l.ip_address,
      geo: l.geo,
      note: l.note,
    })),
    comments: visibleComments.map((c) => ({
      id: c.id,
      occurrence_id: c.occurrence_id,
      author_id: c.author_id,
      author_name: c.author_name,
      visibility: c.visibility,
      text: c.text,
      created_at: c.created_at.toISOString(),
    })),
    inspection:
      inspRows[0] && !isCitizen
        ? {
            ...inspRows[0],
            arrival_at: inspRows[0].arrival_at.toISOString(),
            created_at: inspRows[0].created_at.toISOString(),
            fine_amount: inspRows[0].fine_amount ? Number(inspRows[0].fine_amount) : null,
          }
        : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const { id } = await params;
  const ip = clientIp(req);
  const geo = req.headers.get("x-sifau-geo") ?? null;

  const rows = await db.select().from(occurrences).where(eq(occurrences.id, id)).limit(1);
  const occ = rows[0];
  if (!occ) return err("Ocorrência não encontrada.", 404);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action as string;

  if (action === "comment") {
    const text = String(body.text ?? "").trim();
    if (text.length < 2) return err("Escreva um comentário.", 400);
    let visibility: CommentVisibility = "public";
    if (profile.role === "cidadao") {
      if (occ.citizen_id !== profile.id) return err("Sem permissão.", 403);
    } else if (profile.role === "fiscal" && occ.assigned_fiscal_id !== profile.id) {
      return err("Sem permissão.", 403);
    } else if (profile.role === "auditor") {
      return err("Perfil somente leitura.", 403);
    }
    if (body.visibility === "internal" && ["fiscal", "gestor"].includes(profile.role)) {
      visibility = "internal";
    }
    const [c] = await db
      .insert(comments)
      .values({
        occurrence_id: id,
        author_id: profile.id,
        author_name: profile.nome,
        visibility,
        text,
      })
      .returning();
    return NextResponse.json({
      comment: { ...c, created_at: c.created_at.toISOString() },
    });
  }

  if (!requireRole(profile, ["gestor"])) return err("Sem permissão para esta ação.", 403);

  const current = occ.status as OccurrenceStatus;

  if (action === "escalate") {
    if (!isOpenStatus(current) || current === "escalonada") {
      return err("Apenas ocorrências ativas podem ser escalonadas.", 400);
    }
    await db
      .update(occurrences)
      .set({ status: "escalonada" })
      .where(eq(occurrences.id, id));
    await logStatusChange(id, current, "escalonada", profile.id, profile.nome, {
      note: String(body.note ?? "Escalonado pela gestão"),
      ip,
      geo,
    });
    return NextResponse.json({ ok: true, status: "escalonada" });
  }

  if (action === "reassign") {
    const fiscalId = String(body.fiscal_id ?? "");
    if (!fiscalId) return err("Selecione um fiscal.", 400);
    const fiscal = await db
      .select({ id: profiles.id, nome: profiles.nome })
      .from(profiles)
      .where(and(eq(profiles.id, fiscalId), eq(profiles.role, "fiscal"), eq(profiles.ativo, true)))
      .limit(1);
    if (!fiscal[0]) return err("Fiscal inválido.", 400);
    await db
      .update(occurrences)
      .set({ assigned_fiscal_id: fiscalId, status: "atribuida", archived: false })
      .where(eq(occurrences.id, id));
    await logStatusChange(id, current, "atribuida", profile.id, profile.nome, {
      note: `Redistribuição pela gestão → ${fiscal[0].nome}`,
      ip,
      geo,
    });
    return NextResponse.json({ ok: true, status: "atribuida", fiscal_name: fiscal[0].nome });
  }

  if (action === "archive") {
    const reason = String(body.reason ?? "Arquivada pela gestão");
    await db
      .update(occurrences)
      .set({ archived: true, archive_reason: reason, status: "arquivada" })
      .where(eq(occurrences.id, id));
    await logStatusChange(id, current, "arquivada", profile.id, profile.nome, {
      note: reason,
      ip,
      geo,
    });
    return NextResponse.json({ ok: true, status: "arquivada" });
  }

  return err("Ação inválida.", 400);
}
