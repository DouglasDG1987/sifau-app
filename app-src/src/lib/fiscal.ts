// ============================================================
// SIFAU — Estatísticas de fiscais (ranking, SLA, notas)
// ============================================================
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { fiscalStats, inspections, occurrences, profiles } from "@/db/schema";
import type { FiscalStat } from "@/lib/types";
import { isOpenStatus } from "@/lib/types";

const OPEN_STATUSES = ["aberta", "triada", "atribuida", "em_vistoria", "escalonada"];

/** Ranking de fiscais: resolvidas, fila ativa, % SLA e nota média. */
export async function computeFiscalRanking(): Promise<FiscalStat[]> {
  const fiscais = await db
    .select({ id: profiles.id, nome: profiles.nome })
    .from(profiles)
    .where(and(eq(profiles.role, "fiscal"), eq(profiles.ativo, true)));

  if (fiscais.length === 0) return [];

  const ids = fiscais.map((f) => f.id);

  const resolved = await db
    .select({
      fiscal_id: inspections.fiscal_id,
      total: sql<number>`count(*)::int`,
      within: sql<number>`count(*) filter (where ${occurrences.sla_deadline} >= ${inspections.created_at})::int`,
    })
    .from(inspections)
    .innerJoin(occurrences, eq(inspections.occurrence_id, occurrences.id))
    .groupBy(inspections.fiscal_id);

  const active = await db
    .select({
      fiscal_id: occurrences.assigned_fiscal_id,
      count: sql<number>`count(*)::int`,
    })
    .from(occurrences)
    .where(
      and(
        inArray(occurrences.assigned_fiscal_id, ids),
        inArray(occurrences.status, OPEN_STATUSES),
        eq(occurrences.archived, false)
      )
    )
    .groupBy(occurrences.assigned_fiscal_id);

  const ratings = await db.select().from(fiscalStats);

  const resolvedMap = new Map(resolved.map((r) => [r.fiscal_id, r]));
  const activeMap = new Map(active.map((a) => [a.fiscal_id, a.count]));
  const ratingMap = new Map(ratings.map((r) => [r.fiscal_id, r.avg_rating]));

  return fiscais.map((f) => {
    const r = resolvedMap.get(f.id);
    const total = r?.total ?? 0;
    const within = r?.within ?? 0;
    return {
      fiscal_id: f.id,
      fiscal_name: f.nome,
      sla_compliance_pct: total === 0 ? 100 : Math.round((within / total) * 100),
      avg_rating: ratingMap.get(f.id) ?? 4.5,
      total_resolved: total,
      active_assigned: activeMap.get(f.id) ?? 0,
    };
  });
}

export { isOpenStatus };
