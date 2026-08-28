CREATE TABLE "acoes_fiscalizacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	CONSTRAINT "acoes_fiscalizacao_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "audit_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"description" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autos_infracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"tipo_infracao_id" uuid NOT NULL,
	"valor_multa" numeric(12, 2) NOT NULL,
	"motivo" text,
	"autuado_nome" text,
	"autuado_documento" text,
	"ciencia_status" text DEFAULT 'ausente' NOT NULL,
	"testemunha_nome" text,
	"status_pagamento" text DEFAULT 'pendente' NOT NULL,
	"data_vencimento" timestamp with time zone,
	"recidiva_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"device_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_stats" (
	"fiscal_id" uuid PRIMARY KEY NOT NULL,
	"avg_rating" double precision DEFAULT 4.5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"fiscal_id" uuid NOT NULL,
	"arrival_at" timestamp with time zone NOT NULL,
	"arrival_lat" double precision,
	"arrival_lng" double precision,
	"report_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"action_taken" text NOT NULL,
	"fine_amount" numeric(12, 2),
	"fine_process_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurrence_id" uuid
);
--> statement-breakpoint
CREATE TABLE "occurrence_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid,
	"url" text NOT NULL,
	"type" text DEFAULT 'foto' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"citizen_id" uuid NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"description" text NOT NULL,
	"status" text DEFAULT 'aberta' NOT NULL,
	"urgency_score" integer DEFAULT 2 NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"bairro" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sla_deadline" timestamp with time zone NOT NULL,
	"duplicate_of" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"archive_reason" text,
	"assigned_fiscal_id" uuid,
	"notified_gestor" boolean DEFAULT false NOT NULL,
	"notified_fiscal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ordens_servico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_os" text NOT NULL,
	"origem_os" text NOT NULL,
	"denuncia_id" uuid,
	"requerente" text NOT NULL,
	"gerente_id" uuid NOT NULL,
	"fiscal_id" uuid,
	"apoio_operacional" boolean DEFAULT false NOT NULL,
	"orgao_apoio" text,
	"orgao_apoio_outro" text,
	"servico_descricao" text NOT NULL,
	"legislacao_aplicavel" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"endereco" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"data_emissao" timestamp with time zone DEFAULT now() NOT NULL,
	"prazo_resposta" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'aberta' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordens_servico_numero_os_unique" UNIQUE("numero_os")
);
--> statement-breakpoint
CREATE TABLE "prefeitura_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_prefeitura" text NOT NULL,
	"legislacao_aplicavel" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"bairro" text,
	"especialidade" text,
	"region" text,
	"cpf_cnpj" text,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "recidivas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auto_infracao_id" uuid NOT NULL,
	"documento_responsavel" text NOT NULL,
	"ocorrencia_original_id" uuid NOT NULL,
	"nivel_reincidencia" integer DEFAULT 1 NOT NULL,
	"fator_multiplicacao" numeric(5, 2) DEFAULT 1.5 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sla_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"max_hours" integer DEFAULT 72 NOT NULL,
	CONSTRAINT "sla_rules_category_unique" UNIQUE("category")
);
--> statement-breakpoint
CREATE TABLE "occurrence_status_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_by_name" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"geo" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "tipos_infracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artigo_legal" text NOT NULL,
	"descricao" text NOT NULL,
	"valor_base" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vistorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"fiscal_id" uuid NOT NULL,
	"iniciada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizada_em" timestamp with time zone,
	"geo_inicio_lat" double precision,
	"geo_inicio_lng" double precision,
	"geo_inicio_precisao_m" double precision,
	"relatorio" text,
	"fotos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'em_andamento' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autos_infracao" ADD CONSTRAINT "autos_infracao_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autos_infracao" ADD CONSTRAINT "autos_infracao_tipo_infracao_id_tipos_infracao_id_fk" FOREIGN KEY ("tipo_infracao_id") REFERENCES "public"."tipos_infracao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autos_infracao" ADD CONSTRAINT "autos_infracao_recidiva_id_recidivas_id_fk" FOREIGN KEY ("recidiva_id") REFERENCES "public"."recidivas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_stats" ADD CONSTRAINT "fiscal_stats_fiscal_id_profiles_id_fk" FOREIGN KEY ("fiscal_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_fiscal_id_profiles_id_fk" FOREIGN KEY ("fiscal_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_media" ADD CONSTRAINT "occurrence_media_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_media" ADD CONSTRAINT "occurrence_media_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_citizen_id_profiles_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_assigned_fiscal_id_profiles_id_fk" FOREIGN KEY ("assigned_fiscal_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_denuncia_id_occurrences_id_fk" FOREIGN KEY ("denuncia_id") REFERENCES "public"."occurrences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_gerente_id_profiles_id_fk" FOREIGN KEY ("gerente_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_fiscal_id_profiles_id_fk" FOREIGN KEY ("fiscal_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recidivas" ADD CONSTRAINT "recidivas_auto_infracao_id_autos_infracao_id_fk" FOREIGN KEY ("auto_infracao_id") REFERENCES "public"."autos_infracao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recidivas" ADD CONSTRAINT "recidivas_ocorrencia_original_id_occurrences_id_fk" FOREIGN KEY ("ocorrencia_original_id") REFERENCES "public"."occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_status_log" ADD CONSTRAINT "occurrence_status_log_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_status_log" ADD CONSTRAINT "occurrence_status_log_changed_by_profiles_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_fiscal_id_profiles_id_fk" FOREIGN KEY ("fiscal_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auto_os_idx" ON "autos_infracao" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "auto_documento_idx" ON "autos_infracao" USING btree ("autuado_documento");--> statement-breakpoint
CREATE INDEX "comment_occ_idx" ON "comments" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "device_profile_idx" ON "device_tokens" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "device_token_idx" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "inspection_occ_idx" ON "inspections" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "notif_profile_idx" ON "notifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "notif_read_idx" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "notif_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_occ_idx" ON "occurrence_media" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "occ_status_idx" ON "occurrences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "occ_assigned_idx" ON "occurrences" USING btree ("assigned_fiscal_id");--> statement-breakpoint
CREATE INDEX "occ_citizen_idx" ON "occurrences" USING btree ("citizen_id");--> statement-breakpoint
CREATE INDEX "occ_created_idx" ON "occurrences" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "os_fiscal_idx" ON "ordens_servico" USING btree ("fiscal_id");--> statement-breakpoint
CREATE INDEX "os_status_idx" ON "ordens_servico" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "profiles_cpf_idx" ON "profiles" USING btree ("cpf_cnpj");--> statement-breakpoint
CREATE INDEX "recidiva_documento_idx" ON "recidivas" USING btree ("documento_responsavel");--> statement-breakpoint
CREATE INDEX "recidiva_auto_idx" ON "recidivas" USING btree ("auto_infracao_id");--> statement-breakpoint
CREATE INDEX "log_occ_idx" ON "occurrence_status_log" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "log_changed_at_idx" ON "occurrence_status_log" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "vistoria_os_idx" ON "vistorias" USING btree ("os_id");