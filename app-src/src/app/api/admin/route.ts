import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, auditExports } from "@/db/schema";
import { getSessionProfile, requireRole, toProfile } from "@/lib/auth";
import { sha256Hex } from "@/lib/password";
import type { UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const ROLES: UserRole[] = ["cidadao", "fiscal", "gestor", "auditor"];

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["auditor"])) return err("Acesso restrito à auditoria.", 403);
  const sp = req.nextUrl.searchParams;

  if (sp.get("users") === "1") {
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        role: profiles.role,
        nome: profiles.nome,
        telefone: profiles.telefone,
        bairro: profiles.bairro,
        especialidade: profiles.especialidade,
        region: profiles.region,
        ativo: profiles.ativo,
        created_at: profiles.created_at,
      })
      .from(profiles)
      .orderBy(profiles.created_at);
    return NextResponse.json({
      users: rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })),
    });
  }

  if (sp.get("exports") === "1") {
    const rows = await db
      .select({
        e: auditExports,
        nome: profiles.nome,
      })
      .from(auditExports)
      .innerJoin(profiles, eq(auditExports.profile_id, profiles.id))
      .orderBy(desc(auditExports.created_at))
      .limit(100);
    return NextResponse.json({
      exports: rows.map((r) => ({
        id: r.e.id,
        sha256: r.e.sha256,
        description: r.e.description,
        row_count: r.e.row_count,
        created_at: r.e.created_at.toISOString(),
        exported_by: r.nome,
      })),
    });
  }

  return err("Parâmetro inválido.", 400);
}

export async function PATCH(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["auditor"])) return err("Acesso restrito à auditoria.", 403);

  const body = (await req.json().catch(() => ({}))) as {
    profile_id?: string;
    role?: UserRole;
    ativo?: boolean;
  };
  const targetId = String(body.profile_id ?? "");
  if (!targetId) return err("Perfil não informado.", 400);
  if (targetId === profile.id) return err("Você não pode alterar a própria conta.", 400);

  const rows = await db.select().from(profiles).where(eq(profiles.id, targetId)).limit(1);
  if (!rows[0]) return err("Perfil não encontrado.", 404);

  const set: { role?: UserRole; ativo?: boolean } = {};
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) return err("Papel inválido.", 400);
    set.role = body.role;
  }
  if (body.ativo !== undefined) set.ativo = Boolean(body.ativo);

  const [updated] = await db.update(profiles).set(set).where(eq(profiles.id, targetId)).returning();
  return NextResponse.json({ profile: toProfile(updated) });
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["auditor"])) return err("Acesso restrito à auditoria.", 403);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    rows?: unknown[];
    description?: string;
  };
  if (body.action !== "export") return err("Ação inválida.", 400);

  // Hash SHA-256 do conteúdo exportado — cadeia de custódia
  const canonical = JSON.stringify(body.rows ?? []);
  const hash = sha256Hex(canonical);
  const rowCount = Array.isArray(body.rows) ? body.rows.length : 0;

  await db.insert(auditExports).values({
    profile_id: profile.id,
    sha256: hash,
    description: String(body.description ?? `Exportação da trilha (${new Date().toLocaleString("pt-BR")})`),
    row_count: rowCount,
  });

  return NextResponse.json({ sha256: hash, row_count: rowCount });
}

export { ROLE_LABELS };
