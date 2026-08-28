import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { occurrences, inspections, occurrenceMedia } from "@/db/schema";
import { getSessionProfile, clientIp, requireRole } from "@/lib/auth";
import { logStatusChange } from "@/lib/audit";
import { notifyCitizenAboutStatus } from "@/lib/notifications";
import type { InspectionAction, OccurrenceStatus } from "@/lib/types";
import { ACTION_LABELS } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

interface InspectionInput {
  occurrence_id: string;
  arrival_at: string;
  arrival_lat?: number | null;
  arrival_lng?: number | null;
  report?: string;
  action_taken: InspectionAction;
  fine_amount?: number | null;
  fine_process_number?: string | null;
  mediaUrls?: string[];
  geo?: string | null;
}

async function processInspection(profile: NonNullable<Awaited<ReturnType<typeof getSessionProfile>>>, input: InspectionInput, ip: string) {
  const occRows = await db.select().from(occurrences).where(eq(occurrences.id, input.occurrence_id)).limit(1);
  const occ = occRows[0];
  if (!occ) return { error: "Ocorrência não encontrada." };
  if (occ.assigned_fiscal_id !== profile.id) {
    return { error: "Esta ocorrência não está atribuída a você." };
  }
  if (!input.arrival_at) return { error: "Registro de chegada obrigatório." };
  const actions: InspectionAction[] = ["notificacao", "multa", "encaminhamento", "orientacao", "sem_acao"];
  if (!actions.includes(input.action_taken)) return { error: "Ação inválida." };
  if (input.action_taken === "multa" && (input.fine_amount == null || !input.fine_process_number)) {
    return { error: "Multa exige valor e número do processo." };
  }
  const reportJson = { laudo: input.report ?? "", ...(input.geo ? { geo: input.geo } : {}) };

  const [insp] = await db
    .insert(inspections)
    .values({
      occurrence_id: input.occurrence_id,
      fiscal_id: profile.id,
      arrival_at: new Date(input.arrival_at),
      arrival_lat: input.arrival_lat ?? null,
      arrival_lng: input.arrival_lng ?? null,
      report_json: reportJson,
      action_taken: input.action_taken,
      fine_amount: input.fine_amount != null ? String(input.fine_amount) : null,
      fine_process_number: input.fine_process_number ?? null,
    })
    .returning();

  if (input.mediaUrls && input.mediaUrls.length > 0) {
    await db
      .update(occurrenceMedia)
      .set({ occurrence_id: input.occurrence_id })
      .where(and(inArray(occurrenceMedia.url, input.mediaUrls), eq(occurrenceMedia.uploaded_by, profile.id)));
  }

  const current = occ.status as OccurrenceStatus;
  await db
    .update(occurrences)
    .set({ status: "resolvida" })
    .where(eq(occurrences.id, input.occurrence_id));
  await logStatusChange(
    input.occurrence_id,
    current,
    "resolvida",
    profile.id,
    profile.nome,
    {
      note: `Vistoria concluída — ${ACTION_LABELS[input.action_taken]}`,
      ip,
      geo: input.geo ?? null,
    }
  );
  
  // Notifica o cidadão sobre a resolução
  await notifyCitizenAboutStatus(input.occurrence_id, occ.citizen_id, "resolvida", occ.category);
  
  return { ok: true, inspection_id: insp.id };
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["fiscal"])) return err("Apenas fiscais podem registrar vistorias.", 403);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    items?: InspectionInput[];
  } & InspectionInput;

  const ip = clientIp(req);

  if (body.action === "sync" && Array.isArray(body.items)) {
    let synced = 0;
    const failed: string[] = [];
    for (const item of body.items) {
      const res = await processInspection(profile, { ...item, geo: item.geo ?? null }, ip);
      if (res.ok) synced++;
      else failed.push(item.occurrence_id ?? "desconhecida");
    }
    return NextResponse.json({ synced, failed });
  }

  const res = await processInspection(profile, body, ip);
  if ("error" in res) return err(res.error ?? "Falha ao registrar vistoria.", 400);
  return NextResponse.json(res, { status: 201 });
}
