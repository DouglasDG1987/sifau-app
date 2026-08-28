import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getSessionProfile, requireRole } from "@/lib/auth";
import {
  verificarRecidiva,
  registrarRecidiva,
  calcularMultaComRecidiva,
  getHistoricoRecidiva,
} from "@/lib/recidiva";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["gestor", "auditor", "fiscal"])) {
    return err("Sem permissão.", 403);
  }

  const sp = req.nextUrl.searchParams;
  const documento = sp.get("documento");

  if (documento) {
    const historico = await getHistoricoRecidiva(documento);
    return NextResponse.json({ historico });
  }

  return err("Parâmetro documento é obrigatório.", 400);
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);
  if (!requireRole(profile, ["gestor", "auditor", "fiscal"])) {
    return err("Sem permissão.", 403);
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    documento?: string;
    tipo_infracao_id?: string;
    valor_base?: number;
    auto_infracao_id?: string;
    ocorrencia_original_id?: string;
  };

  if (body.action === "verificar" && body.documento && body.tipo_infracao_id) {
    const verificacao = await verificarRecidiva(body.documento, body.tipo_infracao_id);
    return NextResponse.json(verificacao);
  }

  if (body.action === "calcular" && body.documento && body.tipo_infracao_id && body.valor_base) {
    const calculo = await calcularMultaComRecidiva(
      Number(body.valor_base),
      body.documento,
      body.tipo_infracao_id
    );
    return NextResponse.json(calculo);
  }

  if (body.action === "registrar" && body.auto_infracao_id && body.documento && body.ocorrencia_original_id) {
    try {
      const recidiva = await registrarRecidiva({
        auto_infracao_id: body.auto_infracao_id,
        documento_responsavel: body.documento,
        ocorrencia_original_id: body.ocorrencia_original_id,
      });
      return NextResponse.json({ recidiva }, { status: 201 });
    } catch (error) {
      return err("Erro ao registrar reincidência.", 500);
    }
  }

  return err("Ação ou parâmetros inválidos.", 400);
}