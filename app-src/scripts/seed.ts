// ============================================================
// SIFAU — Seed de dados demo
// Executar: npx tsx scripts/seed.ts
// ============================================================
import "dotenv/config";
import { sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "../src/db/index";
import {
  profiles,
  occurrences,
  statusLogs,
  inspections,
  slaRules,
  prefeituraConfig,
  acoesFiscalizacao,
  tiposInfracao,
  fiscalStats,
  ordensServico,
  vistorias,
  autosInfracao,
  auditExports,
  comments,
  occurrenceMedia,
  sessions,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const U = {
  maria: "10000000-0000-4000-8000-000000000001",
  pedro: "10000000-0000-4000-8000-000000000002",
  joao: "10000000-0000-4000-8000-000000000003",
  ana: "10000000-0000-4000-8000-000000000004",
  carla: "10000000-0000-4000-8000-000000000005",
  roberto: "10000000-0000-4000-8000-000000000006",
  sistema: "10000000-0000-4000-8000-000000000007",
};

const O = {
  m1: "20000000-0000-4000-8000-000000000001",
  m2: "20000000-0000-4000-8000-000000000002",
  m3: "20000000-0000-4000-8000-000000000003",
  m4: "20000000-0000-4000-8000-000000000004",
  m5: "20000000-0000-4000-8000-000000000005",
  m6: "20000000-0000-4000-8000-000000000006",
  m7: "20000000-0000-4000-8000-000000000007",
  m8: "20000000-0000-4000-8000-000000000008",
  m9: "20000000-0000-4000-8000-000000000009",
  p1: "20000000-0000-4000-8000-000000000010",
  p2: "20000000-0000-4000-8000-000000000011",
  p3: "20000000-0000-4000-8000-000000000012",
  p4: "20000000-0000-4000-8000-000000000013",
  p5: "20000000-0000-4000-8000-000000000014",
  p6: "20000000-0000-4000-8000-000000000015",
};

const IP = "177.85.32.10";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para o seed.\n" +
      "   O login do app usa Supabase Auth (ver src/app/api/auth/route.ts), então o seed\n" +
      "   precisa criar os usuários no Auth (não só a row em `profiles`) para que as\n" +
      "   contas demo consigam logar de verdade. Veja .env.example."
  );
  process.exit(1);
}
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Cria (ou recria) o usuário no Supabase Auth com o `id` fixo do seed.
 * Sem isso, a row em `profiles` existe mas o login via
 * `supabase.auth.signInWithPassword` falha, porque o Supabase Auth não
 * reconhece esse e-mail/senha — ele não sabe de nada que só foi inserido
 * direto na tabela `profiles` via Drizzle.
 */
async function ensureAuthUser(id: string, email: string, password: string): Promise<void> {
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (deleteError && deleteError.status !== 404) {
    console.warn(`   ⚠️ Não foi possível remover usuário Auth existente (${email}): ${deleteError.message}`);
  }
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    throw new Error(`Falha ao criar usuário Auth para ${email}: ${createError.message}`);
  }
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600 * 1000);
}

type OccSeed = {
  id: string;
  citizen: string;
  category: string;
  sub: string;
  desc: string;
  status: string;
  urg: number;
  bairro: string;
  lat: number;
  lng: number;
  createdH: number;
  slaH: number;
  fiscal?: string;
  duplicateOf?: string | null;
  archived?: boolean;
  archiveReason?: string | null;
};

async function main() {
  console.log("🧹 Limpando dados existentes…");
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
  await db.delete(profiles);
  console.log("✅ Dados limpos com sucesso!");

  console.log("👤 Criando usuários no Supabase Auth…");
  const DEMO_PASSWORD = "123456";
  const authAccounts: { id: string; email: string }[] = [
    { id: U.maria, email: "cidadao@demo.sifau" },
    { id: U.pedro, email: "pedro@demo.sifau" },
    { id: U.joao, email: "fiscal@demo.sifau" },
    { id: U.ana, email: "fiscal2@demo.sifau" },
    { id: U.carla, email: "gestor@demo.sifau" },
    { id: U.roberto, email: "auditor@demo.sifau" },
    // U.sistema fica de fora de propósito: é uma conta interna (autor de
    // logs automáticos), não deve conseguir logar no app.
  ];
  for (const { id, email } of authAccounts) {
    await ensureAuthUser(id, email, DEMO_PASSWORD);
  }
  console.log(`✅ ${authAccounts.length} usuários criados no Auth.`);

  console.log("👤 Criando perfis demo…");
  const pw = hashPassword(DEMO_PASSWORD);
  await db.insert(profiles).values([
    { id: U.maria, email: "cidadao@demo.sifau", password_hash: pw, role: "cidadao", nome: "Maria Oliveira", telefone: "(11) 98888-1234", bairro: "Centro" },
    { id: U.pedro, email: "pedro@demo.sifau", password_hash: pw, role: "cidadao", nome: "Pedro Santos", telefone: "(11) 97777-4321", bairro: "Jardim América" },
    { id: U.joao, email: "fiscal@demo.sifau", password_hash: pw, role: "fiscal", nome: "João Pereira", telefone: "(11) 96666-2211", bairro: "Vila Nova", especialidade: "Fiscalização de Obras e Posturas", region: "Zona Norte" },
    { id: U.ana, email: "fiscal2@demo.sifau", password_hash: pw, role: "fiscal", nome: "Ana Souza", telefone: "(11) 95555-8899", bairro: "Industrial", especialidade: "Fiscalização Ambiental", region: "Zona Sul" },
    { id: U.carla, email: "gestor@demo.sifau", password_hash: pw, role: "gestor", nome: "Carla Mendes", telefone: "(11) 94444-5566", bairro: "Santa Luzia" },
    { id: U.roberto, email: "auditor@demo.sifau", password_hash: pw, role: "auditor", nome: "Roberto Lima", telefone: "(11) 93333-7788", bairro: "Centro" },
    { id: U.sistema, email: "sistema@sifau.local", password_hash: "!", role: "auditor", nome: "Sistema SIFAU", ativo: true },
  ]);

  console.log("⚙️ Configurações (SLA, prefeitura, ações, infrações)…");
  await db.insert(slaRules).values([
    { category: "Buraco na via", max_hours: 72 },
    { category: "Poluição sonora", max_hours: 48 },
    { category: "Comércio irregular", max_hours: 72 },
    { category: "Descarte irregular de lixo", max_hours: 48 },
    { category: "Obra sem alvará", max_hours: 120 },
    { category: "Iluminação pública", max_hours: 72 },
    { category: "Sinalização", max_hours: 120 },
    { category: "Esgoto / Drenagem", max_hours: 48 },
    { category: "Outro", max_hours: 168 },
  ]);
  await db.insert(prefeituraConfig).values({
    nome_prefeitura: "Prefeitura Municipal de São José do Vale",
    legislacao_aplicavel: [
      "Lei Municipal nº 1.234/2019 — Código de Posturas",
      "Lei Complementar nº 87/2018 — Uso e Ocupação do Solo",
      "Lei Municipal nº 2.001/2022 — Ruídos Urbanos",
      "Código de Obras e Edificações — Lei nº 765/2015",
      "Lei Federal nº 9.605/1998 — Crimes Ambientais",
    ],
  });
  await db.insert(acoesFiscalizacao).values([
    { codigo: "NOTIF", nome: "Notificação", descricao: "Notificação formal ao responsável para regularização em prazo determinado." },
    { codigo: "MULTA", nome: "Auto de infração", descricao: "Lavratura de auto de infração com multa." },
    { codigo: "ENCAM", nome: "Encaminhamento", descricao: "Encaminhamento a outro órgão competente." },
    { codigo: "ORIENT", nome: "Orientação", descricao: "Orientação técnica ao cidadão/responsável." },
    { codigo: "SEMACAO", nome: "Sem ação", descricao: "Nenhuma ação cabível após vistoria." },
  ]);
  await db.insert(tiposInfracao).values([
    { artigo_legal: "Art. 154 — Código de Posturas", descricao: "Poluição sonora acima do limite legal", valor_base: "1200" },
    { artigo_legal: "Art. 201 — Código de Posturas", descricao: "Exercício de comércio sem alvará", valor_base: "2500" },
    { artigo_legal: "Art. 88 — Código de Posturas", descricao: "Descarte irregular de resíduos", valor_base: "850" },
    { artigo_legal: "Art. 112 — Código de Obras", descricao: "Execução de obra sem alvará/licença", valor_base: "5000" },
  ]);

  console.log("📋 Criando ocorrências demo…");
  const occ = async (o: OccSeed) => {
    const created = hoursAgo(o.createdH);
    const deadline = new Date(created.getTime() + o.slaH * 3600 * 1000);
    await db.insert(occurrences).values({
      id: o.id,
      citizen_id: o.citizen,
      category: o.category,
      subcategory: o.sub,
      description: o.desc,
      status: o.status,
      urgency_score: o.urg,
      lat: o.lat,
      lng: o.lng,
      bairro: o.bairro,
      created_at: created,
      sla_deadline: deadline,
      duplicate_of: o.duplicateOf ?? null,
      archived: o.archived ?? false,
      archive_reason: o.archiveReason ?? null,
      assigned_fiscal_id: o.fiscal ?? null,
    });
  };

  const log = async (
    occId: string,
    from: string | null,
    to: string,
    by: string,
    byName: string,
    when: Date,
    note?: string
  ) => {
    await db.insert(statusLogs).values({
      occurrence_id: occId,
      from_status: from,
      to_status: to,
      changed_by: by,
      changed_by_name: byName,
      changed_at: when,
      ip_address: IP,
      geo: "-23.5505,-46.6333",
      note: note ?? null,
    });
  };

  const insp = async (
    occId: string,
    fiscal: string,
    arrivalH: number,
    action: string,
    laudo: string,
    fine?: { amount: string; process: string }
  ) => {
    await db.insert(inspections).values({
      occurrence_id: occId,
      fiscal_id: fiscal,
      arrival_at: hoursAgo(arrivalH),
      arrival_lat: -23.5505,
      arrival_lng: -46.6333,
      report_json: { laudo, recomendacoes: "Manter acompanhamento por 30 dias." },
      action_taken: action,
      fine_amount: fine?.amount ?? null,
      fine_process_number: fine?.process ?? null,
    });
  };

  // ---- Maria: 6 resolvidas (gamificação) ----
  await occ({ id: O.m1, citizen: U.maria, category: "Buraco na via", sub: "Via local", desc: "Buraco de aproximadamente 40cm na Rua das Flores, altura do nº 120, no Centro. Veículos desviando e risco para motociclistas.", status: "resolvida", urg: 2, bairro: "Centro", lat: -23.5475, lng: -46.6361, createdH: 150, slaH: 72, fiscal: U.joao });
  await log(O.m1, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(150), "Registro pelo aplicativo");
  await log(O.m1, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(149), "Classificação IA confiança 0.91");
  await log(O.m1, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(149), "Atribuição automática — fila equilibrada");
  await log(O.m1, "atribuida", "em_vistoria", U.joao, "João Pereira", hoursAgo(148));
  await log(O.m1, "em_vistoria", "resolvida", U.joao, "João Pereira", hoursAgo(146), "Notificação emitida à concessionária");
  await insp(O.m1, U.joao, 147, "notificacao", "Buraco confirmado. Concessionária notificada para reparo emergencial.");

  await occ({ id: O.m2, citizen: U.maria, category: "Iluminação pública", sub: "Lâmpada queimada", desc: "Lâmpada do poste 45 na Praça Central queimada há mais de uma semana. Região escura à noite, moradores preocupados.", status: "resolvida", urg: 2, bairro: "Centro", lat: -23.5469, lng: -46.6348, createdH: 125, slaH: 72, fiscal: U.ana });
  await log(O.m2, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(125));
  await log(O.m2, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(124), "Classificação IA confiança 0.88");
  await log(O.m2, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(124));
  await log(O.m2, "atribuida", "resolvida", U.ana, "Ana Souza", hoursAgo(121), "Troca realizada pela equipe de iluminação");
  await insp(O.m2, U.ana, 122, "orientacao", "Lâmpada substituída no local. Sem irregularidades adicionais.");

  await occ({ id: O.m3, citizen: U.maria, category: "Descarte irregular de lixo", sub: "Entulho", desc: "Entulho de obra descartado na calçada da Rua das Acácias, esquina com Av. Brasil. Ocupa metade da calçada há 3 dias.", status: "resolvida", urg: 3, bairro: "Jardim América", lat: -23.556, lng: -46.671, createdH: 100, slaH: 48, fiscal: U.joao });
  await log(O.m3, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(100));
  await log(O.m3, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(99), "Classificação IA confiança 0.95");
  await log(O.m3, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(99));
  await log(O.m3, "atribuida", "em_vistoria", U.joao, "João Pereira", hoursAgo(97));
  await log(O.m3, "em_vistoria", "resolvida", U.joao, "João Pereira", hoursAgo(96), "Multa aplicada — descarte irregular");
  await insp(O.m3, U.joao, 97, "multa", "Entulho identificado como proveniente de obra da Rua das Acácias 350. Auto lavrado.", { amount: "850", process: "2025.04.00123" });

  await occ({ id: O.m4, citizen: U.maria, category: "Esgoto / Drenagem", sub: "Vazamento", desc: "Vazamento de esgoto na Rua Ipiranga, próximo ao nº 87. Odor forte e risco à saúde dos moradores.", status: "resolvida", urg: 3, bairro: "Vila Nova", lat: -23.533, lng: -46.615, createdH: 80, slaH: 48, fiscal: U.joao });
  await log(O.m4, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(80));
  await log(O.m4, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(79));
  await log(O.m4, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(79));
  await log(O.m4, "atribuida", "em_vistoria", U.joao, "João Pereira", hoursAgo(77));
  await log(O.m4, "em_vistoria", "resolvida", U.joao, "João Pereira", hoursAgo(75), "Encaminhado à concessionária de saneamento");
  await insp(O.m4, U.joao, 77, "encaminhamento", "Vazamento confirmado. Encaminhado à concessionária via protocolo 88412.");

  await occ({ id: O.m5, citizen: U.maria, category: "Poluição sonora", sub: "Estabelecimento", desc: "Bar na Rua Direita, nº 210, tocando música alta após as 23h. Moradores do entorno não conseguem dormir.", status: "resolvida", urg: 2, bairro: "Centro", lat: -23.5482, lng: -46.6355, createdH: 50, slaH: 48, fiscal: U.ana });
  await log(O.m5, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(50));
  await log(O.m5, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(49));
  await log(O.m5, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(49));
  await log(O.m5, "atribuida", "resolvida", U.ana, "Ana Souza", hoursAgo(46), "Orientação ao responsável — Lei de Ruídos");
  await insp(O.m5, U.ana, 47, "orientacao", "Estabelecimento orientado sobre limites de horário e medição sonora.");

  await occ({ id: O.m6, citizen: U.maria, category: "Sinalização", sub: "Faixa apagada", desc: "Faixa de pedestres da Av. Paulista com a Rua Vergueiro totalmente apagada. Perigoso para travessia, principalmente de idosos.", status: "resolvida", urg: 2, bairro: "Centro", lat: -23.5495, lng: -46.6331, createdH: 30, slaH: 120, fiscal: U.joao });
  await log(O.m6, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(30));
  await log(O.m6, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(29));
  await log(O.m6, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(29));
  await log(O.m6, "atribuida", "resolvida", U.joao, "João Pereira", hoursAgo(26), "Repintura realizada pelo setor de trânsito");
  await insp(O.m6, U.joao, 27, "notificacao", "Repintura da faixa executada. Área liberada.");

  // ---- Maria: ocorrências em aberto ----
  await occ({ id: O.m7, citizen: U.maria, category: "Buraco na via", sub: "Avenida", desc: "Cratera de cerca de 60cm na Av. das Nações, faixa da direita sentido bairro, próximo ao semáforo do nº 4500. Trânsito lento e risco de acidente.", status: "atribuida", urg: 4, bairro: "Industrial", lat: -23.571, lng: -46.6, createdH: 5, slaH: 72, fiscal: U.joao });
  await log(O.m7, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(5));
  await log(O.m7, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(5), "Classificação IA confiança 0.97 — urgência crítica");
  await log(O.m7, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(4), "Atribuição automática — fila equilibrada");

  await occ({ id: O.m8, citizen: U.maria, category: "Poluição sonora", sub: "Evento", desc: "Evento com som alto na praça do bairro Santa Luzia desde sexta à noite, sem alvará. Barulho insuportável para os moradores das ruas próximas.", status: "atribuida", urg: 3, bairro: "Santa Luzia", lat: -23.512, lng: -46.655, createdH: 60, slaH: 48, fiscal: U.joao });
  await log(O.m8, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(60));
  await log(O.m8, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(59));
  await log(O.m8, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(59), "Atribuição automática");

  await occ({ id: O.m9, citizen: U.maria, category: "Esgoto / Drenagem", sub: "Entupimento", desc: "Boca de lobo entupida na Rua XV de Novembro, água acumulada transbordando na via após qualquer chuva.", status: "aberta", urg: 3, bairro: "Centro", lat: -23.5462, lng: -46.6377, createdH: 1, slaH: 48 });
  await log(O.m9, null, "aberta", U.maria, "Maria Oliveira", hoursAgo(1), "Aguardando triagem");

  // ---- Pedro ----
  await occ({ id: O.p1, citizen: U.pedro, category: "Comércio irregular", sub: "Sem alvará", desc: "Loja de eletrônicos funcionando sem alvará na Rua do Comércio, 45, há mais de 2 meses. Venda de produtos sem nota fiscal.", status: "escalonada", urg: 3, bairro: "Centro", lat: -23.5478, lng: -46.6342, createdH: 96, slaH: 72, fiscal: U.joao });
  await log(O.p1, null, "aberta", U.pedro, "Pedro Santos", hoursAgo(96));
  await log(O.p1, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(95));
  await log(O.p1, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(95));
  await log(O.p1, "atribuida", "escalonada", U.carla, "Carla Mendes", hoursAgo(24), "Fiscal sem retorno há 72h — caso escalonado para redistribuição");

  await occ({ id: O.p2, citizen: U.pedro, category: "Obra sem alvará", sub: "Residencial", desc: "Construção de sobrado na Rua das Palmeiras, 88, sem placa de obra e sem alvará visível. Andaime ocupando parte da calçada.", status: "atribuida", urg: 2, bairro: "Jardim América", lat: -23.5572, lng: -46.6701, createdH: 3, slaH: 120, fiscal: U.ana });
  await log(O.p2, null, "aberta", U.pedro, "Pedro Santos", hoursAgo(3));
  await log(O.p2, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(2));
  await log(O.p2, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(2));

  await occ({ id: O.p3, citizen: U.pedro, category: "Descarte irregular de lixo", sub: "Eletrônico", desc: "Geladeiras e eletrônicos abandonados no terreno baldio da Rua dos Ipês. Possível criadouro de dengue.", status: "em_vistoria", urg: 3, bairro: "Vila Nova", lat: -23.534, lng: -46.616, createdH: 20, slaH: 48, fiscal: U.joao });
  await log(O.p3, null, "aberta", U.pedro, "Pedro Santos", hoursAgo(20));
  await log(O.p3, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(19));
  await log(O.p3, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(19));
  await log(O.p3, "atribuida", "em_vistoria", U.joao, "João Pereira", hoursAgo(2), "A caminho do local");

  await occ({ id: O.p4, citizen: U.pedro, category: "Iluminação pública", sub: "Fiação exposta", desc: "Fiação exposta e balançando no poste da Rua da Estação, com risco de choque. Crianças passam pelo local para ir à escola.", status: "triada", urg: 4, bairro: "Industrial", lat: -23.5701, lng: -46.601, createdH: 8, slaH: 72 });
  await log(O.p4, null, "aberta", U.pedro, "Pedro Santos", hoursAgo(8));
  await log(O.p4, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(7), "Classificação IA — urgência crítica, prioridade máxima");

  await occ({ id: O.p5, citizen: U.pedro, category: "Sinalização", sub: "Placa danificada", desc: "Placa de sentido único derrubada na Rua das Hortênsias, após acidente de trânsito.", status: "arquivada", urg: 1, bairro: "Santa Luzia", lat: -23.5131, lng: -46.654, createdH: 200, slaH: 120, duplicateOf: O.p6, archived: true, archiveReason: "Relato duplicado — mantida a ocorrência original." });
  await log(O.p5, null, "aberta", U.pedro, "Pedro Santos", hoursAgo(200));
  await log(O.p5, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(199));
  await log(O.p5, "triada", "arquivada", U.carla, "Carla Mendes", hoursAgo(198), "Duplicata da ocorrência original");

  await occ({ id: O.p6, citizen: U.pedro, category: "Sinalização", sub: "Placa danificada", desc: "Placa de sentido único derrubada na Rua das Hortênsias, esquina com Av. Central, após acidente de trânsito na semana passada.", status: "resolvida", urg: 1, bairro: "Santa Luzia", lat: -23.5131, lng: -46.654, createdH: 205, slaH: 120, fiscal: U.ana });
  await log(O.p6, null, "aberta", U.pedro, "Pedro Santos", hoursAgo(205));
  await log(O.p6, "aberta", "triada", U.carla, "Carla Mendes", hoursAgo(204));
  await log(O.p6, "triada", "atribuida", U.carla, "Carla Mendes", hoursAgo(204));
  await log(O.p6, "atribuida", "resolvida", U.ana, "Ana Souza", hoursAgo(196), "Placa reinstalada");
  await insp(O.p6, U.ana, 200, "orientacao", "Placa reinstalada pela equipe de sinalização.");

  // ---- Comentários ----
  await db.insert(comments).values([
    { occurrence_id: O.m7, author_id: U.carla, author_name: "Carla Mendes", visibility: "public", text: "Equipe já acionada. Prioridade máxima — obra emergencial na Av. das Nações.", created_at: hoursAgo(3) },
    { occurrence_id: O.m7, author_id: U.joao, author_name: "João Pereira", visibility: "internal", text: "Vou ao local amanhã às 8h. Necessário apoio da CET para interdição parcial da faixa.", created_at: hoursAgo(2) },
    { occurrence_id: O.m8, author_id: U.carla, author_name: "Carla Mendes", visibility: "public", text: "Evento identificado. Fiscalização em andamento.", created_at: hoursAgo(40) },
  ]);

  console.log("📊 Estatísticas de fiscais…");
  await db.insert(fiscalStats).values([
    { fiscal_id: U.joao, avg_rating: 4.7 },
    { fiscal_id: U.ana, avg_rating: 4.2 },
  ]);

  console.log("📄 Ordens de Serviço…");
  await db.insert(ordensServico).values([
    {
      id: "30000000-0000-4000-8000-000000000001",
      numero_os: "OS-2025-0001",
      origem_os: "preventiva",
      denuncia_id: null,
      requerente: "Setor de Iluminação Pública",
      gerente_id: U.carla,
      fiscal_id: U.joao,
      apoio_operacional: false,
      orgao_apoio: null,
      orgao_apoio_outro: null,
      servico_descricao: "Vistoria preventiva de iluminação pública na Av. das Nações entre os nºs 1100 e 1400, com verificação de pontos apagados e fiação exposta.",
      legislacao_aplicavel: ["Lei Municipal nº 1.234/2019 — Código de Posturas"],
      endereco: "Av. das Nações, 1200 — Centro",
      latitude: -23.5489,
      longitude: -46.6319,
      prazo_resposta: hoursAgo(-7 * 24),
      status: "em_vistoria",
      criado_em: hoursAgo(30),
      atualizado_em: hoursAgo(3),
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      numero_os: "OS-2025-0002",
      origem_os: "denuncia",
      denuncia_id: O.p1,
      requerente: "Denúncia anônima nº 2025-041",
      gerente_id: U.carla,
      fiscal_id: U.joao,
      apoio_operacional: true,
      orgao_apoio: "guarda_municipal",
      orgao_apoio_outro: null,
      servico_descricao: "Verificação de comércio irregular sem alvará na Rua do Comércio, 45, com apoio da Guarda Municipal para entrada no estabelecimento.",
      legislacao_aplicavel: ["Lei Municipal nº 1.234/2019 — Código de Posturas", "Lei Complementar nº 87/2018 — Uso e Ocupação do Solo"],
      endereco: "Rua do Comércio, 45 — Centro",
      latitude: -23.5478,
      longitude: -46.6342,
      prazo_resposta: hoursAgo(-4 * 24),
      status: "concluida",
      criado_em: hoursAgo(20 * 24),
      atualizado_em: hoursAgo(9 * 24),
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      numero_os: "OS-2025-0003",
      origem_os: "oficio",
      denuncia_id: null,
      requerente: "Ofício nº 88/2025 — Câmara Municipal",
      gerente_id: U.carla,
      fiscal_id: U.ana,
      apoio_operacional: false,
      orgao_apoio: null,
      orgao_apoio_outro: null,
      servico_descricao: "Vistoria de obra em andamento na Rua das Palmeiras, 88, a pedido da Câmara Municipal (reclamação de moradores sobre andaime na calçada).",
      legislacao_aplicavel: ["Código de Obras e Edificações — Lei nº 765/2015"],
      endereco: "Rua das Palmeiras, 88 — Jardim América",
      latitude: -23.5572,
      longitude: -46.6701,
      prazo_resposta: hoursAgo(-10 * 24),
      status: "aberta",
      criado_em: hoursAgo(2 * 24),
      atualizado_em: hoursAgo(2 * 24),
    },
  ]);

  await db.insert(vistorias).values([
    {
      id: "40000000-0000-4000-8000-000000000001",
      os_id: "30000000-0000-4000-8000-000000000001",
      fiscal_id: U.joao,
      iniciada_em: hoursAgo(3),
      finalizada_em: null,
      geo_inicio_lat: -23.5488,
      geo_inicio_lng: -46.632,
      geo_inicio_precisao_m: 12,
      relatorio: null,
      fotos: [],
      status: "em_andamento",
      criado_em: hoursAgo(3),
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      os_id: "30000000-0000-4000-8000-000000000002",
      fiscal_id: U.joao,
      iniciada_em: hoursAgo(9 * 24 + 2),
      finalizada_em: hoursAgo(9 * 24),
      geo_inicio_lat: -23.5478,
      geo_inicio_lng: -46.6343,
      geo_inicio_precisao_m: 8,
      relatorio: "Estabelecimento operando sem alvará de funcionamento. Proprietário apresentou apenas inscrição estadual. Auto de infração lavrado com apoio da Guarda Municipal. Mercadorias sem nota fiscal apreendidas conforme procedimento padrão.",
      fotos: [],
      status: "finalizada",
      criado_em: hoursAgo(9 * 24 + 2),
    },
  ]);

  const [t201] = await db
    .select({ id: tiposInfracao.id })
    .from(tiposInfracao)
    .where(sql`${tiposInfracao.artigo_legal} LIKE ${"Art. 201%"} `);

  await db.insert(autosInfracao).values([
    {
      id: "50000000-0000-4000-8000-000000000001",
      os_id: "30000000-0000-4000-8000-000000000002",
      tipo_infracao_id: t201?.id ?? "",
      valor_multa: "2500",
      motivo: "Exercício de comércio sem alvará de funcionamento — Art. 201 do Código de Posturas.",
      autuado_nome: "Comercial Silva ME",
      autuado_documento: "12.345.678/0001-90",
      ciencia_status: "assinou",
      testemunha_nome: "Marcos Vieira",
      criado_em: hoursAgo(9 * 24),
    },
  ]);

  console.log("🔐 Registro de exportação de auditoria…");
  await db.insert(auditExports).values([
    {
      profile_id: U.roberto,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      description: "Exportação de exemplo — trilha de auditoria (março/2025)",
      row_count: 0,
      created_at: hoursAgo(48),
    },
  ]);

  console.log("✅ Seed concluído com sucesso!");
  console.log("   Contas demo (senha: 123456):");
  console.log("   cidadao@demo.sifau · pedro@demo.sifau · fiscal@demo.sifau · fiscal2@demo.sifau · gestor@demo.sifau · auditor@demo.sifau");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Falha no seed:", err);
  process.exit(1);
});
