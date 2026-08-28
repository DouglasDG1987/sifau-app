import { NextResponse } from "next/server";
import { db } from "@/db";
import { prefeituraConfig, acoesFiscalizacao, tiposInfracao } from "@/db/schema";
import { getSessionProfile } from "@/lib/auth";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  const [configs, acoes, tipos] = await Promise.all([
    db.select().from(prefeituraConfig).limit(1),
    db.select().from(acoesFiscalizacao),
    db.select().from(tiposInfracao),
  ]);

  const config = configs[0];
  return NextResponse.json({
    config: config
      ? {
          id: config.id,
          nome_prefeitura: config.nome_prefeitura,
          legislacao_aplicavel: config.legislacao_aplicavel,
        }
      : null,
    acoes: acoes.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      nome: a.nome,
      descricao: a.descricao,
    })),
    tipos: tipos.map((t) => ({
      id: t.id,
      artigo_legal: t.artigo_legal,
      descricao: t.descricao,
      valor_base: Number(t.valor_base),
    })),
  });
}
