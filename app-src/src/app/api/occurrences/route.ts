import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getSessionProfile, clientIp, requireRole } from "@/lib/auth";
import { logStatusChange, getSystemUser } from "@/lib/audit";
import { classifyOccurrence, filterNearby } from "@/lib/classify";
import { computeFiscalRanking } from "@/lib/fiscal";
import {
  notifyGestorsAboutOccurrence,
  notifyFiscalAboutAssignment,
  notifyCitizenAboutStatus,
} from "@/lib/notifications";
import type { AIClassificationResult, Occurrence, OccurrenceStatus, UserRole } from "@/lib/types";
import {
  CATEGORIES,
  DEFAULT_SLA_HOURS,
  isOpenStatus,
} from "@/lib/types";

const OPEN_STATUSES = ["aberta", "triada", "atribuida", "em_vistoria", "escalonada"];

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapOcc(row: any): Occurrence {
  return {
    id: row.id,
    citizen_id: row.citizen_id,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    status: row.status as OccurrenceStatus,
    urgency_score: row.urgency_score as Occurrence["urgency_score"],
    lat: row.lat,
    lng: row.lng,
    bairro: row.bairro,
    address: row.address,
    created_at: row.created_at,
    sla_deadline: row.sla_deadline,
    duplicate_of: row.duplicate_of,
    archived: row.archived,
    archive_reason: row.archive_reason,
    assigned_fiscal_id: row.assigned_fiscal_id,
    assigned_fiscal_name: row.fiscal_nome ?? null,
  };
}

async function enrichPhotos(rows: any[]): Promise<Occurrence[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const supabase = await createClient();
  const { data: media } = await supabase
    .from('occurrence_media')
    .select('occurrence_id, url')
    .in('occurrence_id', ids);
    
  const first = new Map<string, string>();
  for (const m of media || []) {
    if (m.occurrence_id && !first.has(m.occurrence_id)) first.set(m.occurrence_id, m.url);
  }
  return rows.map((r) => ({ ...mapOcc(r), photo: first.get(r.id) ?? null }));
}

async function withFiscalName(rows: any[]): Promise<any[]> {
  const fiscalIds = [...new Set(rows.map((r) => r.assigned_fiscal_id).filter(Boolean))];
  if (fiscalIds.length === 0) return rows.map((r) => ({ ...r, fiscal_nome: null }));
  
  const supabase = await createClient();
  const { data: fiscais } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('id', fiscalIds);
    
  const map = new Map((fiscais || []).map((f) => [f.id, f.nome]));
  return rows.map((r) => ({ ...r, fiscal_nome: r.assigned_fiscal_id ? map.get(r.assigned_fiscal_id) ?? null : null }));
}

/** Atribuição automática: fiscal ativo com a fila mais curta (evita cherry-picking). */
async function autoAssign(ip: string, geo?: string | null): Promise<{ fiscalId: string; fiscalName: string } | null> {
  const supabase = await createClient();
  const { data: fiscais } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('role', 'fiscal')
    .eq('ativo', true);
    
  if (!fiscais || fiscais.length === 0) return null;
  
  const ids = fiscais.map((f) => f.id);
  const { data: counts } = await supabase
    .from('occurrences')
    .select('assigned_fiscal_id')
    .in('assigned_fiscal_id', ids)
    .in('status', OPEN_STATUSES);
    
  const load = new Map<string, number>();
  for (const c of counts || []) {
    if (c.assigned_fiscal_id) {
      load.set(c.assigned_fiscal_id, (load.get(c.assigned_fiscal_id) ?? 0) + 1);
    }
  }
  
  let best = fiscais[0];
  for (const f of fiscais) {
    if ((load.get(f.id) ?? 0) < (load.get(best.id) ?? 0)) best = f;
  }
  void ip;
  void geo;
  return { fiscalId: best.id, fiscalName: best.nome };
}

// ------------------------------------------------------------
export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const sp = req.nextUrl.searchParams;
  const supabase = await createClient();

  // Ranking de fiscais (gestor) / estatísticas do próprio fiscal
  if (sp.get("view") === "ranking") {
    if (!requireRole(profile, ["gestor"])) return err("Sem permissão.", 403);
    const ranking = await computeFiscalRanking();
    return NextResponse.json({ ranking });
  }

  // Visão agregada para o dashboard da gestão
  if (sp.get("view") === "overview") {
    if (!requireRole(profile, ["gestor"])) return err("Sem permissão.", 403);
    const { data: all } = await supabase
      .from('occurrences')
      .select('*')
      .eq('archived', false);
      
    const now = Date.now();
    const total = all?.length || 0;
    const byStatus = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const o of all || []) {
      byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
      byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + 1);
    }
    const resolved = (all || []).filter((o) => o.status === "resolvida");
    const overdue = (all || []).filter(
      (o) =>
        o.status !== "resolvida" &&
        o.status !== "arquivada" &&
        new Date(o.sla_deadline).getTime() < now
    ).length;

    // Tempo real de resolução via trilha de auditoria
    const { data: logs } = await supabase
      .from('occurrence_status_log')
      .select('occurrence_id, changed_at, sla_deadline')
      .eq('to_status', 'resolvida')
      .order('changed_at', { ascending: false });
      
    const firstResolve = new Map<string, { at: number; sla: number }>();
    for (const l of logs || []) {
      if (!firstResolve.has(l.occurrence_id)) {
        firstResolve.set(l.occurrence_id, { at: new Date(l.changed_at).getTime(), sla: new Date(l.sla_deadline).getTime() });
      }
    }
    let slaOk = 0;
    let slaTotal = 0;
    for (const o of resolved) {
      const r = firstResolve.get(o.id);
      if (r) {
        slaTotal++;
        if (r.at <= r.sla) slaOk++;
      }
    }
    return NextResponse.json({
      overview: {
        total,
        resolved: resolved.length,
        overdue,
        sla_ok: slaOk,
        sla_total: slaTotal,
        sla_pct: slaTotal === 0 ? 100 : Math.round((slaOk / slaTotal) * 100),
        by_status: Object.fromEntries(byStatus),
        by_category: Object.fromEntries(byCategory),
      },
    });
  }

  // Trilha de auditoria (auditor)
  if (sp.get("logs") === "1") {
    if (!requireRole(profile, ["auditor"])) return err("Sem permissão.", 403);
    const { data: rows } = await supabase
      .from('occurrence_status_log')
      .select(`
        *,
        occurrences!inner(category, status)
      `)
      .order('changed_at', { ascending: false })
      .limit(500);
      
    return NextResponse.json({
      logs: (rows || []).map((r: any) => ({
        id: r.id,
        occurrence_id: r.occurrence_id,
        occurrence_category: r.occurrences?.category,
        occurrence_status: r.occurrences?.status,
        from_status: r.from_status,
        to_status: r.to_status,
        changed_by: r.changed_by,
        changed_by_name: r.changed_by_name,
        changed_at: r.changed_at,
        ip_address: r.ip_address,
        geo: r.geo,
        note: r.note,
      })),
    });
  }

  // Mapa público anonimizado (qualquer perfil autenticado)
  if (sp.get("map") === "1") {
    const { data: rows } = await supabase
      .from('occurrences')
      .select('id, lat, lng, category, urgency_score, status, bairro')
      .eq('archived', false);
      
    return NextResponse.json({
      points: (rows || []).map((r) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        category: r.category,
        urgency: r.urgency_score,
        status: r.status,
        bairro: r.bairro,
      })),
    });
  }

  // Cidadão: minhas ocorrências
  if (profile.role === "cidadao") {
    const { data: rows } = await supabase
      .from('occurrences')
      .select('*')
      .eq('citizen_id', profile.id)
      .order('created_at', { ascending: false });
      
    const withFiscal = await withFiscalName(rows || []);
    const enriched = await enrichPhotos(withFiscal);
    return NextResponse.json({ occurrences: enriched });
  }

  // Fiscal: fila atribuída + resolvidas recentes
  if (profile.role === "fiscal") {
    const { data: mine } = await supabase
      .from('occurrences')
      .select('*')
      .eq('assigned_fiscal_id', profile.id)
      .eq('archived', false)
      .order('created_at', { ascending: false });
      
    const queue = (mine || []).filter((o) => isOpenStatus(o.status as OccurrenceStatus));
    const resolved = (mine || []).filter((o) => o.status === "resolvida").slice(0, 5);
    const queueSorted = [...queue].sort(
      (a, b) => b.urgency_score - a.urgency_score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const [queueRows, resolvedRows] = await Promise.all([
      withFiscalName(queueSorted),
      withFiscalName(resolved),
    ]);
    const [queueEnriched, resolvedEnriched] = await Promise.all([
      enrichPhotos(queueRows),
      enrichPhotos(resolvedRows),
    ]);
    const ranking = await computeFiscalRanking();
    const me = ranking.find((r) => r.fiscal_id === profile.id);
    return NextResponse.json({
      queue: queueEnriched,
      resolved_recent: resolvedEnriched,
      stats: me ?? {
        fiscal_id: profile.id,
        fiscal_name: profile.nome,
        sla_compliance_pct: 100,
        avg_rating: 4.5,
        total_resolved: 0,
        active_assigned: queue.length,
      },
    });
  }

  // Gestor / Auditor: visão ampla
  const escaladas = sp.get("escaladas") === "1";
  const { data: rows } = await supabase
    .from('occurrences')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false });
    
  const filtered = escaladas ? (rows || []).filter((o) => o.status === "escalonada") : (rows || []);
  const withFiscal = await withFiscalName(filtered);
  const enriched = await enrichPhotos(withFiscal);
  return NextResponse.json({ occurrences: enriched });
}

// ------------------------------------------------------------
export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["cidadao"])) return err("Apenas cidadãos podem registrar ocorrências.", 403);

  const body = (await req.json().catch(() => ({}))) as {
    category?: string;
    subcategory?: string | null;
    description?: string;
    lat?: number;
    lng?: number;
    bairro?: string | null;
    address?: string | null;
    mediaUrls?: string[];
    ai?: AIClassificationResult | null;
  };

  const description = String(body.description ?? "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (description.length < 20) return err("A descrição precisa ter no mínimo 20 caracteres.", 400);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return err("Informe a localização da ocorrência.", 400);
  if (!CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])) {
    return err("Categoria inválida.", 400);
  }

  const supabase = await createClient();

  // Classificação por IA (com fallback heurístico) — nunca trava o app
  const { data: recent } = await supabase
    .from('occurrences')
    .select('*')
    .eq('archived', false);
    
  const nearby = filterNearby(recent || [], lat, lng);
  const ai = body.ai ?? (await classifyOccurrence(description, { nearby, categoryHint: body.category }));

  // SLA por categoria
  const { data: rules } = await supabase
    .from('sla_rules')
    .select('*')
    .eq('category', ai.category)
    .limit(1);
    
  const maxHours = rules?.[0]?.max_hours ?? DEFAULT_SLA_HOURS;
  const slaDeadline = new Date(Date.now() + maxHours * 3600 * 1000);

  const ip = clientIp(req);
  const geo = lat != null && lng != null ? `${lat.toFixed(5)},${lng.toFixed(5)}` : null;

  const assigned = await autoAssign(ip, geo);
  const system = await getSystemUser();

  const { data: created, error: insertError } = await supabase
    .from('occurrences')
    .insert({
      citizen_id: profile.id,
      category: ai.category,
      subcategory: ai.subcategory,
      description,
      status: assigned ? "atribuida" : "triada",
      urgency_score: ai.urgency,
      lat,
      lng,
      bairro: body.bairro ?? null,
      address: body.address ?? null,
      sla_deadline: slaDeadline.toISOString(),
      duplicate_of: ai.duplicate_suspected && ai.duplicate_of ? ai.duplicate_of : null,
      archived: false,
      assigned_fiscal_id: assigned?.fiscalId ?? null,
    })
    .select()
    .single();

  if (insertError || !created) {
    return err("Erro ao criar ocorrência.", 500);
  }

  // Vincula fotos enviadas antes do registro
  if (body.mediaUrls && body.mediaUrls.length > 0) {
    await supabase
      .from('occurrence_media')
      .update({ occurrence_id: created.id })
      .in('url', body.mediaUrls)
      .eq('uploaded_by', profile.id);
  }

  // Trilha de auditoria
  await logStatusChange(created.id, null, "aberta", profile.id, profile.nome, {
    note: "Registro pelo aplicativo",
    ip,
    geo,
  });
  await logStatusChange(created.id, "aberta", "triada", system.id, system.nome, {
    note: `Classificação ${ai.source === "ia" ? "por IA" : "heurística"} — confiança ${Math.round(ai.confidence * 100)}%`,
    ip,
    geo,
  });
  if (assigned) {
    await logStatusChange(created.id, "triada", "atribuida", system.id, system.nome, {
      note: "Atribuição automática — fila equilibrada (evita cherry-picking)",
      ip,
      geo,
    });
    
    // Notifica o fiscal designado
    await notifyFiscalAboutAssignment(created.id, assigned.fiscalId, ai.category);
  }

  // Notifica gestores sobre nova ocorrência
  await notifyGestorsAboutOccurrence(created.id, ai.category, ai.urgency);

  return NextResponse.json(
    { occurrence: { ...mapOcc(created), assigned_fiscal_name: assigned?.fiscalName ?? null } },
    { status: 201 }
  );
}