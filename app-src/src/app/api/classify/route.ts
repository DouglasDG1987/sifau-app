import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { occurrences } from "@/db/schema";
import { getSessionProfile } from "@/lib/auth";
import { classifyOccurrence, filterNearby } from "@/lib/classify";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  const body = (await req.json().catch(() => ({}))) as {
    description?: string;
    categoryHint?: string;
    lat?: number;
    lng?: number;
  };
  const description = String(body.description ?? "").trim();
  if (description.length < 20) {
    return err("A descrição precisa ter no mínimo 20 caracteres.", 400);
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  let nearby: ReturnType<typeof filterNearby> = [];
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const recent = await db.select().from(occurrences).where(eq(occurrences.archived, false));
    nearby = filterNearby(recent, lat, lng);
  }

  // IA com fallback heurístico — nunca falha
  const result = await classifyOccurrence(description, {
    nearby,
    categoryHint: body.categoryHint,
  });

  return NextResponse.json({ result });
}
