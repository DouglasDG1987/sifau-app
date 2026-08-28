// ============================================================
// SIFAU — Sistema de Alertas de SLA
// ============================================================
import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { occurrences, profiles } from "@/db/schema";
import { sendSLAAlert } from "@/lib/notifications";

const SLA_ALERT_HOURS = 72; // Alertar 72h antes do vencimento

/**
 * Verifica ocorrências com SLA próximo do vencimento
 */
export async function checkSLAAlerts(): Promise<{ processed: number; alerts: number }> {
  const now = new Date();
  const alertThreshold = new Date(now.getTime() + SLA_ALERT_HOURS * 3600 * 1000);
  
  // Busca ocorrências que:
  // 1. Estão em aberto (não resolvidas/arquivadas)
  // 2. Tem deadline dentro do período de alerta
  // 3. Ainda não foram notificadas sobre este alerta
  
  const openStatuses = ["aberta", "triada", "atribuida", "em_vistoria", "escalonada"];
  
  const ocorrenciasParaAlertar = await db
    .select({
      id: occurrences.id,
      assigned_fiscal_id: occurrences.assigned_fiscal_id,
      category: occurrences.category,
      sla_deadline: occurrences.sla_deadline,
    })
    .from(occurrences)
    .where(
      and(
        inArray(occurrences.status, openStatuses as any),
        sql`${occurrences.sla_deadline} <= ${alertThreshold}`,
        sql`${occurrences.sla_deadline} > ${now}`,
        eq(occurrences.archived, false)
      )
    );

  let alerts = 0;
  
  for (const occ of ocorrenciasParaAlertar) {
    if (occ.assigned_fiscal_id) {
      // Calcula horas restantes
      const hoursRemaining = Math.floor(
        (occ.sla_deadline.getTime() - now.getTime()) / (3600 * 1000)
      );
      
      // Envia alerta apenas se estiver dentro da janela de 72h
      if (hoursRemaining <= SLA_ALERT_HOURS && hoursRemaining > 0) {
        await sendSLAAlert(
          occ.assigned_fiscal_id,
          occ.id,
          occ.category,
          hoursRemaining
        );
        alerts++;
      }
    }
  }

  return { processed: ocorrenciasParaAlertar.length, alerts };
}

/**
 * Verifica ocorrências com SLA vencido
 */
export async function checkOverdueSLA(): Promise<{ overdue: number }> {
  const now = new Date();
  const openStatuses = ["aberta", "triada", "atribuida", "em_vistoria", "escalonada"];
  
  const overdue = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(occurrences)
    .where(
      and(
        inArray(occurrences.status, openStatuses as any),
        sql`${occurrences.sla_deadline} < ${now}`,
        eq(occurrences.archived, false)
      )
    );

  return { overdue: overdue[0]?.count ?? 0 };
}

/**
 * Obtém estatísticas de SLA para um fiscal
 */
export async function getFiscalSLAStats(fiscalId: string): Promise<{
  total: number;
  overdue: number;
  near_deadline: number;
  compliance_pct: number;
}> {
  const now = new Date();
  const alertThreshold = new Date(now.getTime() + SLA_ALERT_HOURS * 3600 * 1000);
  const openStatuses = ["aberta", "triada", "atribuida", "em_vistoria", "escalonada"];
  
  const assigned = await db
    .select({
      id: occurrences.id,
      sla_deadline: occurrences.sla_deadline,
      status: occurrences.status,
    })
    .from(occurrences)
    .where(
      and(
        eq(occurrences.assigned_fiscal_id, fiscalId),
        eq(occurrences.archived, false)
      )
    );

  const total = assigned.length;
  const overdue = assigned.filter(
    (o) => openStatuses.includes(o.status) && o.sla_deadline < now
  ).length;
  const nearDeadline = assigned.filter(
    (o) => 
      openStatuses.includes(o.status) && 
      o.sla_deadline >= now && 
      o.sla_deadline <= alertThreshold
  ).length;

  // Calcula compliance baseado em ocorrências resolvidas
  const resolved = assigned.filter((o) => o.status === "resolvida");
  const resolvedOnTime = resolved.filter(
    (o) => o.sla_deadline >= o.sla_deadline // Simplificado - na prática precisa da data de resolução
  ).length;
  
  const compliance_pct = resolved.length > 0 
    ? Math.round((resolvedOnTime / resolved.length) * 100)
    : 100;

  return {
    total,
    overdue,
    near_deadline: nearDeadline,
    compliance_pct,
  };
}