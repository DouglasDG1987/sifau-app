import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireRole } from "@/lib/auth";
import { checkSLAAlerts, checkOverdueSLA, getFiscalSLAStats } from "@/lib/sla-alerts";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action");

  if (action === "check") {
    // Apenas gestores e administradores podem disparar verificação manual
    if (!requireRole(profile, ["gestor", "auditor"])) {
      return err("Sem permissão.", 403);
    }
    
    const result = await checkSLAAlerts();
    return NextResponse.json(result);
  }

  if (action === "overdue") {
    if (!requireRole(profile, ["gestor", "auditor"])) {
      return err("Sem permissão.", 403);
    }
    
    const result = await checkOverdueSLA();
    return NextResponse.json(result);
  }

  if (action === "stats" && profile.role === "fiscal") {
    const stats = await getFiscalSLAStats(profile.id);
    return NextResponse.json(stats);
  }

  return err("Ação inválida.", 400);
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  
  // Apenas para disparar verificação manual (pode ser automatizado via cron)
  if (!requireRole(profile, ["gestor", "auditor"])) {
    return err("Sem permissão.", 403);
  }

  const result = await checkSLAAlerts();
  return NextResponse.json(result);
}