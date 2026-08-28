// ============================================================
// SIFAU — Limpeza de dados de teste
// Executar: npx tsx scripts/clean.ts
// ============================================================
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { db } from "../src/db/index";
import {
  profiles,
  occurrences,
  statusLogs,
  inspections,
  occurrenceMedia,
  comments,
  slaRules,
  prefeituraConfig,
  acoesFiscalizacao,
  tiposInfracao,
  fiscalStats,
  ordensServico,
  vistorias,
  autosInfracao,
  auditExports,
  sessions,
} from "../src/db/schema";

async function main() {
  console.log("🧹 Limpando todos os dados de teste…");

  await db.delete(autosInfracao);
  await db.delete(vistorias);
  await db.delete(ordensServico);
  await db.delete(inspections);
  await db.delete(comments);
  await db.delete(statusLogs);
  await db.delete(occurrenceMedia);
  await db.delete(occurrences);
  await db.delete(slaRules);
  await db.delete(fiscalStats);
  await db.delete(acoesFiscalizacao);
  await db.delete(tiposInfracao);
  await db.delete(auditExports);
  await db.delete(prefeituraConfig);
  await db.delete(sessions);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    console.log("🧹 Removendo usuários correspondentes no Supabase Auth…");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const existingProfiles = await db.select({ id: profiles.id }).from(profiles);
    for (const { id } of existingProfiles) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error && error.status !== 404) {
        console.warn(`   ⚠️ Não foi possível remover usuário Auth ${id}: ${error.message}`);
      }
    }
  } else {
    console.warn(
      "   ⚠️ SUPABASE_SERVICE_ROLE_KEY não configurada — os usuários correspondentes\n" +
        "      no Supabase Auth NÃO serão removidos e ficarão órfãos (sem profile)."
    );
  }

  await db.delete(profiles);

  console.log("✅ Limpeza concluída com sucesso!");
  console.log("📝 Banco de dados pronto para produção.");
}

main().catch((err) => {
  console.error("❌ Erro na limpeza:", err);
  process.exit(1);
});