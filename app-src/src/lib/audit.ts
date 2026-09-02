// ============================================================
// SIFAU — Trilha de auditoria (server)
// Toda mudança de status gera registro imutável com IP/geo/timestamp.
// ============================================================
import { db } from "@/db";
import { profiles, statusLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { OccurrenceStatus } from "@/lib/types";

const SYSTEM_EMAIL = "sistema@sifau.local";

let systemUserCache: { id: string; nome: string } | null = null;

export async function getSystemUser(): Promise<{ id: string; nome: string }> {
  if (systemUserCache) return systemUserCache;
  const existing = await db
    .select({ id: profiles.id, nome: profiles.nome })
    .from(profiles)
    .where(eq(profiles.email, SYSTEM_EMAIL))
    .limit(1);
  if (existing[0]) {
    systemUserCache = existing[0];
    return existing[0];
  }

  try {
    const [created] = await db
      .insert(profiles)
      .values({
        email: SYSTEM_EMAIL,
        password_hash: "!managed-by-system!",
        role: "auditor",
        nome: "Sistema SIFAU",
        ativo: true,
      })
      .returning({ id: profiles.id, nome: profiles.nome });
    if (created) {
      systemUserCache = created;
      return created;
    }
  } catch {
    // Concorrência: outro request pode ter criado o usuário entre SELECT e INSERT.
    const retry = await db
      .select({ id: profiles.id, nome: profiles.nome })
      .from(profiles)
      .where(eq(profiles.email, SYSTEM_EMAIL))
      .limit(1);
    if (retry[0]) {
      systemUserCache = retry[0];
      return retry[0];
    }
  }

  throw new Error("Não foi possível obter o usuário de sistema para a auditoria.");
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
  await db.insert(statusLogs).values({
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