// ============================================================
// SIFAU — Schema do banco (Drizzle ORM / PostgreSQL)
// ============================================================
import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    role: text("role").notNull(), // cidadao | fiscal | gestor | auditor
    nome: text("nome").notNull(),
    telefone: text("telefone"),
    bairro: text("bairro"),
    especialidade: text("especialidade"),
    region: text("region"),
    cpf_cnpj: text("cpf_cnpj"),
    push_enabled: boolean("push_enabled").notNull().default(true),
    ativo: boolean("ativo").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("profiles_role_idx").on(t.role)]
);

export const occurrences = pgTable(
  "occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    citizen_id: uuid("citizen_id")
      .notNull()
      .references(() => profiles.id),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    description: text("description").notNull(),
    status: text("status").notNull().default("aberta"),
    urgency_score: integer("urgency_score").notNull().default(2),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    bairro: text("bairro"),
    address: text("address"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sla_deadline: timestamp("sla_deadline", { withTimezone: true }).notNull(),
    duplicate_of: uuid("duplicate_of"),
    archived: boolean("archived").notNull().default(false),
    archive_reason: text("archive_reason"),
    assigned_fiscal_id: uuid("assigned_fiscal_id").references(() => profiles.id),
  },
  (t) => [
    index("occ_status_idx").on(t.status),
    index("occ_assigned_idx").on(t.assigned_fiscal_id),
    index("occ_citizen_idx").on(t.citizen_id),
  ]
);

export const occurrenceMedia = pgTable(
  "occurrence_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurrence_id: uuid("occurrence_id").references(() => occurrences.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    type: text("type").notNull().default("foto"),
    uploaded_by: uuid("uploaded_by").references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const statusLogs = pgTable(
  "occurrence_status_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurrence_id: uuid("occurrence_id")
      .notNull()
      .references(() => occurrences.id, { onDelete: "cascade" }),
    from_status: text("from_status"),
    to_status: text("to_status").notNull(),
    changed_by: uuid("changed_by")
      .notNull()
      .references(() => profiles.id),
    changed_by_name: text("changed_by_name"),
    changed_at: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    ip_address: text("ip_address"),
    geo: text("geo"),
    note: text("note"),
  },
  (t) => []
);

export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurrence_id: uuid("occurrence_id")
      .notNull()
      .references(() => occurrences.id, { onDelete: "cascade" }),
    fiscal_id: uuid("fiscal_id")
      .notNull()
      .references(() => profiles.id),
    arrival_at: timestamp("arrival_at", { withTimezone: true }).notNull(),
    arrival_lat: doublePrecision("arrival_lat"),
    arrival_lng: doublePrecision("arrival_lng"),
    report_json: jsonb("report_json").$type<Record<string, unknown>>().notNull().default({}),
    action_taken: text("action_taken").notNull(),
    fine_amount: numeric("fine_amount", { precision: 12, scale: 2 }),
    fine_process_number: text("fine_process_number"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurrence_id: uuid("occurrence_id")
      .notNull()
      .references(() => occurrences.id, { onDelete: "cascade" }),
    author_id: uuid("author_id")
      .notNull()
      .references(() => profiles.id),
    author_name: text("author_name"),
    visibility: text("visibility").notNull().default("public"),
    text: text("text").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const slaRules = pgTable("sla_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull().unique(),
  max_hours: integer("max_hours").notNull().default(72),
});

export const fiscalStats = pgTable("fiscal_stats", {
  fiscal_id: uuid("fiscal_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  avg_rating: doublePrecision("avg_rating").notNull().default(4.5),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Legado: sessões próprias (pré-Supabase Auth). Não é mais escrita pelo
// fluxo de login/registro atual (ver src/app/api/auth/route.ts, que usa
// supabase.auth.*), mas a tabela segue existindo no banco (migration 0000)
// e scripts/seed.ts e scripts/clean.ts ainda a referenciam na limpeza.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profile_id: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profile_id: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").notNull(), // ios | android | web
    device_info: jsonb("device_info").$type<Record<string, unknown>>().notNull().default({}),
    active: boolean("active").notNull().default(true),
    last_used: timestamp("last_used", { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("device_profile_idx").on(t.profile_id),
    index("device_token_idx").on(t.token),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profile_id: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // occurrence_status | sla_alert | assignment | system
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    read: boolean("read").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    occurrence_id: uuid("occurrence_id").references(() => occurrences.id),
  },
  (t) => [
    index("notif_profile_idx").on(t.profile_id),
    index("notif_read_idx").on(t.read),
    index("notif_created_idx").on(t.created_at),
  ]
);

export const prefeituraConfig = pgTable("prefeitura_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome_prefeitura: text("nome_prefeitura").notNull(),
  legislacao_aplicavel: jsonb("legislacao_aplicavel").$type<string[]>().notNull().default([]),
});

export const ordensServico = pgTable(
  "ordens_servico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero_os: text("numero_os").notNull().unique(),
    origem_os: text("origem_os").notNull(),
    denuncia_id: uuid("denuncia_id").references(() => occurrences.id, {
      onDelete: "set null",
    }),
    requerente: text("requerente").notNull(),
    gerente_id: uuid("gerente_id")
      .notNull()
      .references(() => profiles.id),
    fiscal_id: uuid("fiscal_id").references(() => profiles.id),
    apoio_operacional: boolean("apoio_operacional").notNull().default(false),
    orgao_apoio: text("orgao_apoio"),
    orgao_apoio_outro: text("orgao_apoio_outro"),
    servico_descricao: text("servico_descricao").notNull(),
    legislacao_aplicavel: jsonb("legislacao_aplicavel").$type<string[]>().notNull().default([]),
    endereco: text("endereco").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    data_emissao: timestamp("data_emissao", { withTimezone: true }).notNull().defaultNow(),
    prazo_resposta: timestamp("prazo_resposta", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("aberta"),
    criado_em: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const acoesFiscalizacao = pgTable("acoes_fiscalizacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
});

export const tiposInfracao = pgTable("tipos_infracao", {
  id: uuid("id").primaryKey().defaultRandom(),
  artigo_legal: text("artigo_legal").notNull(),
  descricao: text("descricao").notNull(),
  valor_base: numeric("valor_base", { precision: 12, scale: 2 }).notNull(),
});

export const vistorias = pgTable(
  "vistorias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    os_id: uuid("os_id")
      .notNull()
      .references(() => ordensServico.id, { onDelete: "cascade" }),
    fiscal_id: uuid("fiscal_id")
      .notNull()
      .references(() => profiles.id),
    iniciada_em: timestamp("iniciada_em", { withTimezone: true }).notNull().defaultNow(),
    finalizada_em: timestamp("finalizada_em", { withTimezone: true }),
    geo_inicio_lat: doublePrecision("geo_inicio_lat"),
    geo_inicio_lng: doublePrecision("geo_inicio_lng"),
    geo_inicio_precisao_m: doublePrecision("geo_inicio_precisao_m"),
    relatorio: text("relatorio"),
    fotos: jsonb("fotos").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("em_andamento"),
    criado_em: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const autosInfracao = pgTable(
  "autos_infracao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    os_id: uuid("os_id")
      .notNull()
      .references(() => ordensServico.id, { onDelete: "cascade" }),
    tipo_infracao_id: uuid("tipo_infracao_id")
      .notNull()
      .references(() => tiposInfracao.id),
    valor_multa: numeric("valor_multa", { precision: 12, scale: 2 }).notNull(),
    motivo: text("motivo"),
    autuado_nome: text("autuado_nome"),
    autuado_documento: text("autuado_documento"),
    ciencia_status: text("ciencia_status").notNull().default("ausente"),
    testemunha_nome: text("testemunha_nome"),
    status_pagamento: text("status_pagamento").notNull().default("pendente"), // pendente | pago | cancelado
    data_vencimento: timestamp("data_vencimento", { withTimezone: true }),
    recidiva_id: uuid("recidiva_id"),
    criado_em: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const recidivas = pgTable(
  "recidivas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    auto_infracao_id: uuid("auto_infracao_id")
      .notNull()
      .references(() => autosInfracao.id),
    documento_responsavel: text("documento_responsavel").notNull(),
    ocorrencia_original_id: uuid("ocorrencia_original_id")
      .notNull()
      .references(() => occurrences.id),
    nivel_reincidencia: integer("nivel_reincidencia").notNull().default(1),
    fator_multiplicacao: numeric("fator_multiplicacao", { precision: 5, scale: 2 }).notNull().default("1.5"),
    criado_em: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => []
);

export const auditExports = pgTable("audit_exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  profile_id: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  sha256: text("sha256").notNull(),
  description: text("description").notNull(),
  row_count: integer("row_count").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
