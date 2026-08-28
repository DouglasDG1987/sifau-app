import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseClient } from "@/db";
import { getSessionProfile } from "@/lib/auth";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================
// ⚠️ ARMAZENAMENTO DE MÍDIA — LEIA ANTES DE IR PARA PRODUÇÃO
// ------------------------------------------------------------
// Esta rota grava fotos no disco local do processo Next.js
// (public/uploads). Isso funciona em desenvolvimento, mas é
// **inseguro em produção** em qualquer host serverless (Vercel,
// Netlify, etc.): o sistema de arquivos é efêmero — os arquivos
// desaparecem a cada novo deploy/instância e não são compartilhados
// entre réplicas. Como as fotos são a evidência de uma vistoria
// (antes/depois, auto de infração), perder isso silenciosamente é
// um risco sério, não só um detalhe técnico.
//
// Por isso, em produção (fora de localhost, sem uma flag explícita
// de "eu sei o que estou fazendo"), a rota recusa o upload com um
// erro claro em vez de fingir sucesso e perder o arquivo depois.
//
// PARA CORRIGIR DE VERDADE: troque este bloco por upload a um
// object storage durável — Supabase Storage, Vercel Blob ou S3 —
// e salve a URL pública retornada por ele em `occurrenceMedia.url`.
// O resto do app (client, tipos, exibição das fotos) não muda nada.
// ============================================================
const ALLOW_LOCAL_DISK_STORAGE = process.env.SIFAU_ALLOW_LOCAL_DISK_STORAGE === "true";

function isLikelyEphemeralHost(): boolean {
  // Sinais comuns de host serverless com filesystem efêmero.
  return Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  if (isLikelyEphemeralHost() && !ALLOW_LOCAL_DISK_STORAGE) {
    return err(
      "Upload de mídia não configurado para este ambiente: o storage local em disco não " +
        "persiste em hospedagem serverless e as fotos seriam perdidas. Configure um object " +
        "storage durável (Supabase Storage, Vercel Blob ou S3) em src/app/api/media/route.ts " +
        "antes de publicar — ver comentário no topo do arquivo.",
      501
    );
  }

  const body = (await req.json().catch(() => ({}))) as { dataUrl?: string; kind?: string };
  const dataUrl = String(body.dataUrl ?? "");
  if (!dataUrl.startsWith("data:image/")) return err("Imagem inválida.", 400);
  if (dataUrl.length > MAX_SIZE) return err("Imagem muito grande (máx. 10MB).", 413);

  const mime = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/)?.[1];
  if (!mime) return err("Formato não suportado (use JPEG, PNG ou WEBP).", 400);
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const base64 = dataUrl.split(",")[1];

  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(base64, "base64"));

  const url = `/uploads/${filename}`;
  const supabase = await getSupabaseClient();
  const { data: media, error } = await supabase
    .from('occurrence_media')
    .insert({
      url,
      type: body.kind === "video" ? "video" : "foto",
      uploaded_by: profile.id,
      occurrence_id: null,
    })
    .select()
    .single();

  if (error || !media) {
    return err("Erro ao salvar mídia no banco.", 500);
  }

  return NextResponse.json({ url, media_id: media.id }, { status: 201 });
}