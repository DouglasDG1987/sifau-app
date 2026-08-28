// ============================================================
// SIFAU — Trilha de auditoria (server)
// Toda mudança de status gera registro imutável com IP/geo/timestamp.
// ============================================================
import { getSupabaseClient } from "@/db";
import type { OccurrenceStatus } from "@/lib/types";

const SYSTEM_EMAIL = "sistema@sifau.local";

let systemUserCache: { id: string; nome: string } | null = null;

export async function getSystemUser(): Promise<{ id: string; nome: string }> {
  if (systemUserCache) return systemUserCache;
  const supabase = await getSupabaseClient();
  const { data: rows } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('email', SYSTEM_EMAIL)
    .limit(1);
  if (rows && rows[0]) {
    systemUserCache = rows[0];
    return rows[0];
  }
  const { data: created } = await supabase
    .from('profiles')
    .insert({
      email: SYSTEM_EMAIL,
      password_hash: "!", // sem acesso
      role: "auditor",
      nome: "Sistema SIFAU",
      ativo: true,
    })
    .select('id, nome')
    .single();
  if (created) {
    systemUserCache = created;
    return created;
  }
  // Fallback se algo der errado
  return { id: "system", nome: "Sistema SIFAU" };
}

export interface LogStatusOptions {
  note?: string | null;
  ip?: string | null;
  geo?: string | null;
}

export async function logStatusChange(
  occurrenceId: string,
  from: OccurrenceStatus | null,
  to: OccurrenceStatus,
  changedBy: string,
  changedByName: string,
  opts: LogStatusOptions = {}
): Promise<void> {
  const supabase = await getSupabaseClient();
  await supabase.from('occurrence_status_log').insert({
    occurrence_id: occurrenceId,
    from_status: from,
    to_status: to,
    changed_by: changedBy,
    changed_by_name: changedByName,
    ip_address: opts.ip ?? null,
    geo: opts.geo ?? null,
    note: opts.note ?? null,
  });
}