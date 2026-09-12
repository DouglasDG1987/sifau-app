import { pgTable, uuid, text, timestamp, boolean, integer, doublePrecision, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull(), // 'cidadao' | 'fiscal' | 'gestor' | 'auditor'
  nome: text('nome').notNull(),
  telefone: text('telefone'),
  bairro: text('bairro'),
  especialidade: text('especialidade'),
  region: text('region'),
  cpf_cnpj: text('cpf_cnpj'),
  push_enabled: boolean('push_enabled').default(true),
  ativo: boolean('ativo').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

export const occurrences = pgTable('occurrences', {
  id: uuid('id').primaryKey().defaultRandom(),
  citizen_id: uuid('citizen_id').references(() => profiles.id),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  description: text('description').notNull(),
  status: text('status').notNull().default('aberta'), // 'aberta' | 'triada' | 'atribuida' | 'em_vistoria' | 'resolvida' | 'arquivada' | 'escalonada'
  urgency_score: integer('urgency_score').notNull().default(2), // 1-4
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  bairro: text('bairro'),
  address: text('address'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  sla_deadline: timestamp('sla_deadline').notNull(),
  duplicate_of: uuid('duplicate_of'),
  archived: boolean('archived').default(false),
  archive_reason: text('archive_reason'),
  assigned_fiscal_id: uuid('assigned_fiscal_id').references(() => profiles.id),
}, (table) => ({
  citizenIdx: index('occurrences_citizen_id_idx').on(table.citizen_id),
  statusIdx: index('occurrences_status_idx').on(table.status),
  assignedFiscalIdx: index('occurrences_assigned_fiscal_id_idx').on(table.assigned_fiscal_id),
}));

export const occurrenceMedia = pgTable('occurrence_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurrence_id: uuid('occurrence_id').references(() => occurrences.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: text('type').notNull().default('foto'), // 'foto' | 'video'
  uploaded_by: uuid('uploaded_by').references(() => profiles.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  occurrenceIdx: index('occurrence_media_occurrence_id_idx').on(table.occurrence_id),
}));

export const occurrenceStatusLog = pgTable('occurrence_status_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurrence_id: uuid('occurrence_id').references(() => occurrences.id, { onDelete: 'cascade' }),
  from_status: text('from_status'),
  to_status: text('to_status').notNull(),
  changed_by: uuid('changed_by').references(() => profiles.id).notNull(),
  changed_by_name: text('changed_by_name'),
  changed_at: timestamp('changed_at').notNull().defaultNow(),
  ip_address: text('ip_address'),
  geo: text('geo'),
  note: text('note'),
}, (table) => ({
  occurrenceIdx: index('occurrence_status_log_occurrence_id_idx').on(table.occurrence_id),
  changedByIdx: index('occurrence_status_log_changed_by_idx').on(table.changed_by),
}));

export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurrence_id: uuid('occurrence_id').references(() => occurrences.id, { onDelete: 'cascade' }),
  fiscal_id: uuid('fiscal_id').references(() => profiles.id).notNull(),
  arrival_at: timestamp('arrival_at').notNull(),
  arrival_lat: doublePrecision('arrival_lat'),
  arrival_lng: doublePrecision('arrival_lng'),
  report_json: jsonb('report_json').notNull().default('{}'),
  action_taken: text('action_taken').notNull(), // 'notificacao' | 'multa' | 'encaminhamento' | 'orientacao' | 'sem_acao'
  fine_amount: text('fine_amount'),
  fine_process_number: text('fine_process_number'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  occurrenceIdx: index('inspections_occurrence_id_idx').on(table.occurrence_id),
  fiscalIdx: index('inspections_fiscal_id_idx').on(table.fiscal_id),
}));

export const ordensServico = pgTable('ordens_servico', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero_os: text('numero_os').notNull().unique(),
  origem_os: text('origem_os').notNull(), // 'preventiva' | 'denuncia' | 'oficio' | 'ci' | 'gestao'
  denuncia_id: uuid('denuncia_id').references(() => occurrences.id, { onDelete: 'set null' }),
  requerente: text('requerente').notNull(),
  gerente_id: uuid('gerente_id').references(() => profiles.id).notNull(),
  fiscal_id: uuid('fiscal_id').references(() => profiles.id),
  apoio_operacional: boolean('apoio_operacional').default(false),
  orgao_apoio: text('orgao_apoio'), // 'policia_militar' | 'guarda_municipal' | 'outro'
  orgao_apoio_outro: text('orgao_apoio_outro'),
  servico_descricao: text('servico_descricao').notNull(),
  legislacao_aplicavel: jsonb('legislacao_aplicavel').notNull().default('[]'),
  endereco: text('endereco').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  data_emissao: timestamp('data_emissao').notNull().defaultNow(),
  prazo_resposta: timestamp('prazo_resposta').notNull(),
  status: text('status').notNull().default('aberta'), // 'aberta' | 'em_vistoria' | 'concluida' | 'cancelada'
  criado_em: timestamp('criado_em').notNull().defaultNow(),
  atualizado_em: timestamp('atualizado_em').notNull().defaultNow(),
}, (table) => ({
  denunciaIdx: index('ordens_servico_denuncia_id_idx').on(table.denuncia_id),
  gerenteIdx: index('ordens_servico_gerente_id_idx').on(table.gerente_id),
  fiscalIdx: index('ordens_servico_fiscal_id_idx').on(table.fiscal_id),
}));

export const vistorias = pgTable('vistorias', {
  id: uuid('id').primaryKey().defaultRandom(),
  os_id: uuid('os_id').references(() => ordensServico.id, { onDelete: 'cascade' }).notNull(),
  fiscal_id: uuid('fiscal_id').references(() => profiles.id).notNull(),
  iniciada_em: timestamp('iniciada_em').notNull().defaultNow(),
  finalizada_em: timestamp('finalizada_em'),
  geo_inicio_lat: doublePrecision('geo_inicio_lat'),
  geo_inicio_lng: doublePrecision('geo_inicio_lng'),
  geo_inicio_precisao_m: doublePrecision('geo_inicio_precisao_m'),
  relatorio: text('relatorio'),
  fotos: jsonb('fotos').notNull().default('[]'),
  status: text('status').notNull().default('em_andamento'), // 'em_andamento' | 'finalizada'
  criado_em: timestamp('criado_em').notNull().defaultNow(),
}, (table) => ({
  osIdx: index('vistorias_os_id_idx').on(table.os_id),
  fiscalIdx: index('vistorias_fiscal_id_idx').on(table.fiscal_id),
}));

export const tiposInfracao = pgTable('tipos_infracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  artigo_legal: text('artigo_legal'),
  valor_base: text('valor_base').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const autosInfracao = pgTable('autos_infracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  os_id: uuid('os_id').notNull(),
  tipo_infracao_id: uuid('tipo_infracao_id').notNull(),
  valor_multa: text('valor_multa').notNull(),
  motivo: text('motivo'),
  autuado_nome: text('autuado_nome'),
  autuado_documento: text('autuado_documento'),
  ciencia_status: text('ciencia_status').notNull().default('ausente'), // 'assinou' | 'recusou' | 'ausente'
  testemunha_nome: text('testemunha_nome'),
  status_pagamento: text('status_pagamento').notNull().default('pendente'), // 'pendente' | 'pago' | 'cancelado'
  data_vencimento: timestamp('data_vencimento'),
  recidiva_id: uuid('recidiva_id'),
  criado_em: timestamp('criado_em').notNull().defaultNow(),
}, (table) => ({
  osIdx: index('autos_infracao_os_id_idx').on(table.os_id),
  tipoInfracaoIdx: index('autos_infracao_tipo_infracao_id_idx').on(table.tipo_infracao_id),
}));

export const recidivas = pgTable('recidivas', {
  id: uuid('id').primaryKey().defaultRandom(),
  auto_infracao_id: uuid('auto_infracao_id').notNull(),
  documento_responsavel: text('documento_responsavel').notNull(),
  ocorrencia_original_id: uuid('ocorrencia_original_id').notNull(),
  nivel_reincidencia: integer('nivel_reincidencia').notNull().default(1),
  fator_multiplicacao: text('fator_multiplicacao').notNull().default('1.5'),
  criado_em: timestamp('criado_em').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'occurrence_status' | 'sla_alert' | 'assignment' | 'system'
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: jsonb('data').notNull().default('{}'),
  read: boolean('read').default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  occurrence_id: uuid('occurrence_id').references(() => occurrences.id),
}, (table) => ({
  profileIdx: index('notifications_profile_id_idx').on(table.profile_id),
  occurrenceIdx: index('notifications_occurrence_id_idx').on(table.occurrence_id),
}));

export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull(),
  platform: text('platform').notNull(), // 'ios' | 'android' | 'web'
  device_info: jsonb('device_info').notNull().default('{}'),
  active: boolean('active').default(true),
  last_used: timestamp('last_used').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('device_tokens_profile_id_idx').on(table.profile_id),
}));

export const auditExports = pgTable('audit_exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').references(() => profiles.id).notNull(),
  sha256: text('sha256').notNull(),
  description: text('description').notNull(),
  row_count: integer('row_count').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('audit_exports_profile_id_idx').on(table.profile_id),
}));

export const slaRules = pgTable('sla_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull().unique(),
  hours: integer('hours').notNull().default(72),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const fiscalStats = pgTable('fiscal_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  fiscal_id: uuid('fiscal_id').references(() => profiles.id).notNull().unique(),
  total_assigned: integer('total_assigned').notNull().default(0),
  total_resolved: integer('total_resolved').notNull().default(0),
  avg_resolution_hours: text('avg_resolution_hours').notNull().default('0'),
  sla_compliance_rate: text('sla_compliance_rate').notNull().default('0'),
  last_assigned_at: timestamp('last_assigned_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  fiscalIdx: index('fiscal_stats_fiscal_id_idx').on(table.fiscal_id),
}));

export const prefeituraConfig = pgTable('prefeitura_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const acoesFiscalizacao = pgTable('acoes_fiscalizacao', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  ordem: integer('ordem').notNull().default(0),
  ativo: boolean('ativo').default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurrence_id: uuid('occurrence_id').references(() => occurrences.id, { onDelete: 'cascade' }).notNull(),
  profile_id: uuid('profile_id').references(() => profiles.id).notNull(),
  content: text('content').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  occurrenceIdx: index('comments_occurrence_id_idx').on(table.occurrence_id),
  profileIdx: index('comments_profile_id_idx').on(table.profile_id),
}));
