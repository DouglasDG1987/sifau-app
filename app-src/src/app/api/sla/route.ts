import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { slaRules } from "@/db/schema";
import { getSessionProfile, requireRole } from "@/lib/auth";
import { CATEGORIES } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  const rules = await db.select().from(slaRules);
  return NextResponse.json({
    rules: rules.map((r) => ({ id: r.id, category: r.category, max_hours: r.max_hours })),
  });
}

export async function PUT(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["gestor"])) return err("Apenas a gestão pode alterar SLAs.", 403);

  const body = (await req.json().catch(() => ({}))) as {
    rules?: { category: string; max_hours: number }[];
  };
  const rules = body.rules ?? [];
  if (rules.length === 0) return err("Nenhuma regra enviada.", 400);

  for (const r of rules) {
    const category = String(r.category ?? "");
    const hours = Math.max(1, Math.min(720, Math.round(Number(r.max_hours) || 72)));
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) continue;
    const existing = await db
      .select({ id: slaRules.id })
      .from(slaRules)
      .where(eq(slaRules.category, category))
      .limit(1);
    if (existing[0]) {
      await db.update(slaRules).set({ max_hours: hours }).where(eq(slaRules.id, existing[0].id));
    } else {
      await db.insert(slaRules).values({ category, max_hours: hours });
    }
  }

  const updated = await db.select().from(slaRules);
  return NextResponse.json({
    rules: updated.map((r) => ({ id: r.id, category: r.category, max_hours: r.max_hours })),
  });
}
