// ============================================================
// SIFAU — Script de verificação de SLA (para ser executado periodicamente)
// Executar: npx tsx scripts/check-sla.ts
// Pode ser automatizado via cron job
// ============================================================
import "dotenv/config";
import { checkSLAAlerts, checkOverdueSLA } from "../src/lib/sla-alerts";

async function main() {
  console.log("🔍 Verificando alertas de SLA...");
  
  try {
    const result = await checkSLAAlerts();
    console.log(`✅ Verificação concluída: ${result.processed} ocorrências processadas, ${result.alerts} alertas enviados`);
    
    const overdue = await checkOverdueSLA();
    console.log(`⚠️ Ocorrências com SLA vencido: ${overdue.overdue}`);
    
  } catch (error) {
    console.error("❌ Erro na verificação de SLA:", error);
    process.exit(1);
  }
}

main();