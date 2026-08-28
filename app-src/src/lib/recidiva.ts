// ============================================================
// SIFAU — Sistema de Reincidência de Multas
// ============================================================
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { recidivas, autosInfracao, tiposInfracao, occurrences } from "@/db/schema";
import type { Recidiva } from "@/lib/types";

const REINCIDENCIA_TIME_DAYS = 365; // 1 ano para considerar reincidência
const MULTIPLICADORES = [1.0, 1.5, 2.0, 3.0]; // Fatores por nível

/**
 * Verifica se há reincidência para um documento
 */
export async function verificarRecidiva(documento: string, tipoInfracaoId: string): Promise<{
  temRecidiva: boolean;
  nivel: number;
  fator: number;
  recidiva?: Recidiva;
}> {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - REINCIDENCIA_TIME_DAYS);

  // Busca multas anteriores do mesmo documento
  const multasAnteriores = await db
    .select({
      auto: autosInfracao,
      recidiva: recidivas,
    })
    .from(autosInfracao)
    .leftJoin(recidivas, eq(recidivas.auto_infracao_id, autosInfracao.id))
    .where(
      and(
        eq(autosInfracao.autuado_documento, documento),
        eq(autosInfracao.tipo_infracao_id, tipoInfracaoId)
      )
    )
    .orderBy(desc(autosInfracao.criado_em));

  // Filtra multas dentro do período de reincidência
  const multasRecentes = multasAnteriores.filter(
    (m) => m.auto.criado_em >= dataLimite
  );

  if (multasRecentes.length === 0) {
    return { temRecidiva: false, nivel: 0, fator: 1.0 };
  }

  // Conta reincidências anteriores
  const nivel = multasRecentes.length;
  const fator = MULTIPLICADORES[Math.min(nivel, MULTIPLICADORES.length - 1)];

  return {
    temRecidiva: true,
    nivel,
    fator,
    recidiva: multasRecentes[0]?.recidiva ? {
      id: multasRecentes[0].recidiva.id,
      auto_infracao_id: multasRecentes[0].recidiva.auto_infracao_id,
      documento_responsavel: multasRecentes[0].recidiva.documento_responsavel,
      ocorrencia_original_id: multasRecentes[0].recidiva.ocorrencia_original_id,
      nivel_reincidencia: multasRecentes[0].recidiva.nivel_reincidencia,
      fator_multiplicacao: Number(multasRecentes[0].recidiva.fator_multiplicacao),
      criado_em: multasRecentes[0].recidiva.criado_em.toISOString(),
    } : undefined,
  };
}

/**
 * Registra uma reincidência
 */
export async function registrarRecidiva(params: {
  auto_infracao_id: string;
  documento_responsavel: string;
  ocorrencia_original_id: string;
}): Promise<Recidiva> {
  // Verifica reincidência anterior
  const verificacao = await verificarRecidiva(params.documento_responsavel, "");
  const nivel = verificacao.temRecidiva ? verificacao.nivel + 1 : 1;
  const fator = MULTIPLICADORES[Math.min(nivel - 1, MULTIPLICADORES.length - 1)];

  // Busca o tipo de infração da multa atual
  const auto = await db
    .select({ tipo_infracao_id: autosInfracao.tipo_infracao_id })
    .from(autosInfracao)
    .where(eq(autosInfracao.id, params.auto_infracao_id))
    .limit(1);

  if (!auto[0]) {
    throw new Error("Auto de infração não encontrado");
  }

  // Cria registro de reincidência
  const [created] = await db
    .insert(recidivas)
    .values({
      auto_infracao_id: params.auto_infracao_id,
      documento_responsavel: params.documento_responsavel,
      ocorrencia_original_id: params.ocorrencia_original_id,
      nivel_reincidencia: nivel,
      fator_multiplicacao: fator.toString(),
    })
    .returning();

  // Atualiza a multa com a referência de reincidência
  await db
    .update(autosInfracao)
    .set({ recidiva_id: created.id })
    .where(eq(autosInfracao.id, params.auto_infracao_id));

  return {
    id: created.id,
    auto_infracao_id: created.auto_infracao_id,
    documento_responsavel: created.documento_responsavel,
    ocorrencia_original_id: created.ocorrencia_original_id,
    nivel_reincidencia: created.nivel_reincidencia,
    fator_multiplicacao: Number(created.fator_multiplicacao),
    criado_em: created.criado_em.toISOString(),
  };
}

/**
 * Calcula valor da multa com fator de reincidência
 */
export async function calcularMultaComRecidiva(
  valorBase: number,
  documento: string,
  tipoInfracaoId: string
): Promise<{ valor_final: number; fator: number; nivel: number }> {
  const verificacao = await verificarRecidiva(documento, tipoInfracaoId);
  
  return {
    valor_final: valorBase * verificacao.fator,
    fator: verificacao.fator,
    nivel: verificacao.nivel,
  };
}

/**
 * Busca histórico de reincidência por documento
 */
export async function getHistoricoRecidiva(documento: string): Promise<Recidiva[]> {
  const rows = await db
    .select({
      r: recidivas,
      o: occurrences,
    })
    .from(recidivas)
    .innerJoin(occurrences, eq(recidivas.ocorrencia_original_id, occurrences.id))
    .where(eq(recidivas.documento_responsavel, documento))
    .orderBy(desc(recidivas.criado_em))
    .execute();

  return rows.map((row) => ({
    id: row.r.id,
    auto_infracao_id: row.r.auto_infracao_id,
    documento_responsavel: row.r.documento_responsavel,
    ocorrencia_original_id: row.r.ocorrencia_original_id,
    nivel_reincidencia: row.r.nivel_reincidencia,
    fator_multiplicacao: Number(row.r.fator_multiplicacao),
    criado_em: row.r.criado_em.toISOString(),
  }));
}