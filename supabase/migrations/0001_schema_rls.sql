-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PHASE 1: Create all tables WITHOUT foreign keys
-- ============================================

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cidadao', 'fiscal', 'gestor', 'auditor')),
  nome TEXT NOT NULL,
  telefone TEXT,
  bairro TEXT,
  especialidade TEXT,
  region TEXT,
  cpf_cnpj TEXT,
  push_enabled BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Occurrences table
CREATE TABLE occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  citizen_id UUID,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'triada', 'atribuida', 'em_vistoria', 'resolvida', 'arquivada', 'escalonada')),
  urgency_score INTEGER NOT NULL DEFAULT 2 CHECK (urgency_score BETWEEN 1 AND 4),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  bairro TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_deadline TIMESTAMPTZ NOT NULL,
  duplicate_of UUID,
  archived BOOLEAN DEFAULT false,
  archive_reason TEXT,
  assigned_fiscal_id UUID
);

CREATE INDEX occurrences_citizen_id_idx ON occurrences(citizen_id);
CREATE INDEX occurrences_status_idx ON occurrences(status);
CREATE INDEX occurrences_assigned_fiscal_id_idx ON occurrences(assigned_fiscal_id);

-- Occurrence media table
CREATE TABLE occurrence_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_id UUID NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'foto' CHECK (type IN ('foto', 'video')),
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX occurrence_media_occurrence_id_idx ON occurrence_media(occurrence_id);

-- Occurrence status log (immutable audit trail)
CREATE TABLE occurrence_status_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  geo TEXT,
  note TEXT
);

CREATE INDEX occurrence_status_log_occurrence_id_idx ON occurrence_status_log(occurrence_id);
CREATE INDEX occurrence_status_log_changed_by_idx ON occurrence_status_log(changed_by);

-- Inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_id UUID,
  fiscal_id UUID NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  arrival_lat DOUBLE PRECISION,
  arrival_lng DOUBLE PRECISION,
  report_json JSONB NOT NULL DEFAULT '{}',
  action_taken TEXT NOT NULL CHECK (action_taken IN ('notificacao', 'multa', 'encaminhamento', 'orientacao', 'sem_acao')),
  fine_amount TEXT,
  fine_process_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX inspections_occurrence_id_idx ON inspections(occurrence_id);
CREATE INDEX inspections_fiscal_id_idx ON inspections(fiscal_id);

-- Ordens de Serviço table
CREATE TABLE ordens_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_os TEXT NOT NULL UNIQUE,
  origem_os TEXT NOT NULL CHECK (origem_os IN ('preventiva', 'denuncia', 'oficio', 'ci', 'gestao')),
  denuncia_id UUID,
  requerente TEXT NOT NULL,
  gerente_id UUID NOT NULL,
  fiscal_id UUID,
  apoio_operacional BOOLEAN DEFAULT false,
  orgao_apoio TEXT CHECK (orgao_apoio IN ('policia_militar', 'guarda_municipal', 'outro')),
  orgao_apoio_outro TEXT,
  servico_descricao TEXT NOT NULL,
  legislacao_aplicavel JSONB NOT NULL DEFAULT '[]',
  endereco TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prazo_resposta TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_vistoria', 'concluida', 'cancelada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ordens_servico_denuncia_id_idx ON ordens_servico(denuncia_id);
CREATE INDEX ordens_servico_gerente_id_idx ON ordens_servico(gerente_id);
CREATE INDEX ordens_servico_fiscal_id_idx ON ordens_servico(fiscal_id);

-- Vistorias table
CREATE TABLE vistorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL,
  fiscal_id UUID NOT NULL,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizada_em TIMESTAMPTZ,
  geo_inicio_lat DOUBLE PRECISION,
  geo_inicio_lng DOUBLE PRECISION,
  geo_inicio_precisao_m DOUBLE PRECISION,
  relatorio TEXT,
  fotos JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vistorias_os_id_idx ON vistorias(os_id);
CREATE INDEX vistorias_fiscal_id_idx ON vistorias(fiscal_id);

-- Tipos de Infração table
CREATE TABLE tipos_infracao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  artigo_legal TEXT,
  valor_base TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Autos de Infração table
CREATE TABLE autos_infracao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL,
  tipo_infracao_id UUID NOT NULL,
  valor_multa TEXT NOT NULL,
  motivo TEXT,
  autuado_nome TEXT,
  autuado_documento TEXT,
  ciencia_status TEXT NOT NULL DEFAULT 'ausente' CHECK (ciencia_status IN ('assinou', 'recusou', 'ausente')),
  testemunha_nome TEXT,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
  data_vencimento TIMESTAMPTZ,
  recidiva_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX autos_infracao_os_id_idx ON autos_infracao(os_id);
CREATE INDEX autos_infracao_tipo_infracao_id_idx ON autos_infracao(tipo_infracao_id);

-- Recidivas table
CREATE TABLE recidivas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_infracao_id UUID NOT NULL,
  documento_responsavel TEXT NOT NULL,
  ocorrencia_original_id UUID NOT NULL,
  nivel_reincidencia INTEGER NOT NULL DEFAULT 1,
  fator_multiplicacao TEXT NOT NULL DEFAULT '1.5',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recidivas_auto_infracao_id_idx ON recidivas(auto_infracao_id);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('occurrence_status', 'sla_alert', 'assignment', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_id UUID
);

CREATE INDEX notifications_profile_id_idx ON notifications(profile_id);
CREATE INDEX notifications_occurrence_id_idx ON notifications(occurrence_id);

-- Device tokens table
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_info JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX device_tokens_profile_id_idx ON device_tokens(profile_id);

-- Audit exports table
CREATE TABLE audit_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL,
  sha256 TEXT NOT NULL,
  description TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_exports_profile_id_idx ON audit_exports(profile_id);

-- SLA rules table
CREATE TABLE sla_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL UNIQUE,
  hours INTEGER NOT NULL DEFAULT 72,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fiscal stats table
CREATE TABLE fiscal_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_id UUID NOT NULL UNIQUE,
  total_assigned INTEGER NOT NULL DEFAULT 0,
  total_resolved INTEGER NOT NULL DEFAULT 0,
  avg_resolution_hours TEXT NOT NULL DEFAULT '0',
  sla_compliance_rate TEXT NOT NULL DEFAULT '0',
  last_assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX fiscal_stats_fiscal_id_idx ON fiscal_stats(fiscal_id);

-- Prefeitura config table
CREATE TABLE prefeitura_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ações de fiscalização table
CREATE TABLE acoes_fiscalizacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX comments_occurrence_id_idx ON comments(occurrence_id);
CREATE INDEX comments_profile_id_idx ON comments(profile_id);

-- ============================================
-- PHASE 2: Add foreign key constraints
-- ============================================

-- Occurrences foreign keys
ALTER TABLE occurrences 
  ADD CONSTRAINT occurrences_citizen_id_fkey 
  FOREIGN KEY (citizen_id) REFERENCES profiles(id);

ALTER TABLE occurrences 
  ADD CONSTRAINT occurrences_duplicate_of_fkey 
  FOREIGN KEY (duplicate_of) REFERENCES occurrences(id);

ALTER TABLE occurrences 
  ADD CONSTRAINT occurrences_assigned_fiscal_id_fkey 
  FOREIGN KEY (assigned_fiscal_id) REFERENCES profiles(id);

-- Occurrence media foreign keys
ALTER TABLE occurrence_media 
  ADD CONSTRAINT occurrence_media_occurrence_id_fkey 
  FOREIGN KEY (occurrence_id) REFERENCES occurrences(id) ON DELETE CASCADE;

ALTER TABLE occurrence_media 
  ADD CONSTRAINT occurrence_media_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id);

-- Occurrence status log foreign keys
ALTER TABLE occurrence_status_log 
  ADD CONSTRAINT occurrence_status_log_occurrence_id_fkey 
  FOREIGN KEY (occurrence_id) REFERENCES occurrences(id) ON DELETE CASCADE;

ALTER TABLE occurrence_status_log 
  ADD CONSTRAINT occurrence_status_log_changed_by_fkey 
  FOREIGN KEY (changed_by) REFERENCES profiles(id);

-- Inspections foreign keys
ALTER TABLE inspections 
  ADD CONSTRAINT inspections_occurrence_id_fkey 
  FOREIGN KEY (occurrence_id) REFERENCES occurrences(id) ON DELETE CASCADE;

ALTER TABLE inspections 
  ADD CONSTRAINT inspections_fiscal_id_fkey 
  FOREIGN KEY (fiscal_id) REFERENCES profiles(id);

-- Ordens de Serviço foreign keys
ALTER TABLE ordens_servico 
  ADD CONSTRAINT ordens_servico_denuncia_id_fkey 
  FOREIGN KEY (denuncia_id) REFERENCES occurrences(id) ON DELETE SET NULL;

ALTER TABLE ordens_servico 
  ADD CONSTRAINT ordens_servico_gerente_id_fkey 
  FOREIGN KEY (gerente_id) REFERENCES profiles(id);

ALTER TABLE ordens_servico 
  ADD CONSTRAINT ordens_servico_fiscal_id_fkey 
  FOREIGN KEY (fiscal_id) REFERENCES profiles(id);

-- Vistorias foreign keys
ALTER TABLE vistorias 
  ADD CONSTRAINT vistorias_os_id_fkey 
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE;

ALTER TABLE vistorias 
  ADD CONSTRAINT vistorias_fiscal_id_fkey 
  FOREIGN KEY (fiscal_id) REFERENCES profiles(id);

-- Autos de Infração foreign keys
ALTER TABLE autos_infracao 
  ADD CONSTRAINT autos_infracao_os_id_fkey 
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE;

ALTER TABLE autos_infracao 
  ADD CONSTRAINT autos_infracao_tipo_infracao_id_fkey 
  FOREIGN KEY (tipo_infracao_id) REFERENCES tipos_infracao(id);

ALTER TABLE autos_infracao 
  ADD CONSTRAINT autos_infracao_recidiva_id_fkey 
  FOREIGN KEY (recidiva_id) REFERENCES recidivas(id);

-- Recidivas foreign keys
ALTER TABLE recidivas 
  ADD CONSTRAINT recidivas_auto_infracao_id_fkey 
  FOREIGN KEY (auto_infracao_id) REFERENCES autos_infracao(id);

ALTER TABLE recidivas 
  ADD CONSTRAINT recidivas_ocorrencia_original_id_fkey 
  FOREIGN KEY (ocorrencia_original_id) REFERENCES occurrences(id);

-- Notifications foreign keys
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_occurrence_id_fkey 
  FOREIGN KEY (occurrence_id) REFERENCES occurrences(id);

-- Device tokens foreign keys
ALTER TABLE device_tokens 
  ADD CONSTRAINT device_tokens_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Audit exports foreign keys
ALTER TABLE audit_exports 
  ADD CONSTRAINT audit_exports_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id);

-- Fiscal stats foreign keys
ALTER TABLE fiscal_stats 
  ADD CONSTRAINT fiscal_stats_fiscal_id_fkey 
  FOREIGN KEY (fiscal_id) REFERENCES profiles(id);

-- Comments foreign keys
ALTER TABLE comments 
  ADD CONSTRAINT comments_occurrence_id_fkey 
  FOREIGN KEY (occurrence_id) REFERENCES occurrences(id) ON DELETE CASCADE;

ALTER TABLE comments 
  ADD CONSTRAINT comments_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id);

-- ============================================
-- PHASE 3: Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE vistorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_infracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE autos_infracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE recidivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE prefeitura_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoes_fiscalizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Gestores and auditores can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Gestores and auditores can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

-- RLS Policies for occurrences
CREATE POLICY "Citizens can view own occurrences" ON occurrences
  FOR SELECT USING (citizen_id = auth.uid()::text::uuid);

CREATE POLICY "Fiscais can view assigned occurrences" ON occurrences
  FOR SELECT USING (assigned_fiscal_id = auth.uid()::text::uuid);

CREATE POLICY "Gestores and auditores can view all occurrences" ON occurrences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Citizens can create occurrences" ON occurrences
  FOR INSERT WITH CHECK (citizen_id = auth.uid()::text::uuid);

CREATE POLICY "Gestores can update occurrences" ON occurrences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for occurrence_media
CREATE POLICY "Users can view media of accessible occurrences" ON occurrence_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM occurrences 
      WHERE occurrences.id = occurrence_media.occurrence_id
      AND (
        occurrences.citizen_id = auth.uid()::text::uuid
        OR occurrences.assigned_fiscal_id = auth.uid()::text::uuid
        OR EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
        )
      )
    )
  );

CREATE POLICY "Users can insert media for own occurrences" ON occurrence_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM occurrences 
      WHERE occurrences.id = occurrence_media.occurrence_id
      AND occurrences.citizen_id = auth.uid()::text::uuid
    )
  );

-- RLS Policies for occurrence_status_log (read-only for auditors and gestores)
CREATE POLICY "Gestores and auditores can view audit trail" ON occurrence_status_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

-- RLS Policies for inspections
CREATE POLICY "Fiscais can view own inspections" ON inspections
  FOR SELECT USING (fiscal_id = auth.uid()::text::uuid);

CREATE POLICY "Gestores and auditores can view all inspections" ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Fiscais can create inspections" ON inspections
  FOR INSERT WITH CHECK (fiscal_id = auth.uid()::text::uuid);

-- RLS Policies for ordens_servico
CREATE POLICY "Gestores and auditores can view all OS" ON ordens_servico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Fiscais can view assigned OS" ON ordens_servico
  FOR SELECT USING (fiscal_id = auth.uid()::text::uuid);

CREATE POLICY "Gestores can create OS" ON ordens_servico
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

CREATE POLICY "Gestores can update OS" ON ordens_servico
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for vistorias
CREATE POLICY "Fiscais can view own vistorias" ON vistorias
  FOR SELECT USING (fiscal_id = auth.uid()::text::uuid);

CREATE POLICY "Gestores and auditores can view all vistorias" ON vistorias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Fiscais can create vistorias" ON vistorias
  FOR INSERT WITH CHECK (fiscal_id = auth.uid()::text::uuid);

CREATE POLICY "Fiscais can update own vistorias" ON vistorias
  FOR UPDATE USING (fiscal_id = auth.uid()::text::uuid);

-- RLS Policies for tipos_infracao (public read, gestor write)
CREATE POLICY "Everyone can view tipos_infracao" ON tipos_infracao
  FOR SELECT USING (true);

CREATE POLICY "Gestores can create tipos_infracao" ON tipos_infracao
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for autos_infracao
CREATE POLICY "Gestores and auditores can view all autos" ON autos_infracao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Gestores can create autos" ON autos_infracao
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for recidivas
CREATE POLICY "Gestores and auditores can view recidivas" ON recidivas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (profile_id = auth.uid()::text::uuid);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (profile_id = auth.uid()::text::uuid);

-- RLS Policies for device_tokens
CREATE POLICY "Users can view own device tokens" ON device_tokens
  FOR SELECT USING (profile_id = auth.uid()::text::uuid);

CREATE POLICY "Users can insert own device tokens" ON device_tokens
  FOR INSERT WITH CHECK (profile_id = auth.uid()::text::uuid);

CREATE POLICY "Users can update own device tokens" ON device_tokens
  FOR UPDATE USING (profile_id = auth.uid()::text::uuid);

-- RLS Policies for audit_exports
CREATE POLICY "Gestores and auditores can view audit exports" ON audit_exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

CREATE POLICY "Gestores and auditores can create audit exports" ON audit_exports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

-- RLS Policies for sla_rules
CREATE POLICY "Everyone can view sla_rules" ON sla_rules
  FOR SELECT USING (true);

CREATE POLICY "Gestores can update sla_rules" ON sla_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

CREATE POLICY "Gestores can insert sla_rules" ON sla_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for fiscal_stats
CREATE POLICY "Fiscais can view own stats" ON fiscal_stats
  FOR SELECT USING (fiscal_id = auth.uid()::text::uuid);

CREATE POLICY "Gestores and auditores can view all stats" ON fiscal_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
    )
  );

-- RLS Policies for prefeitura_config
CREATE POLICY "Everyone can view config" ON prefeitura_config
  FOR SELECT USING (true);

CREATE POLICY "Gestores can update config" ON prefeitura_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for acoes_fiscalizacao
CREATE POLICY "Everyone can view acoes" ON acoes_fiscalizacao
  FOR SELECT USING (true);

CREATE POLICY "Gestores can manage acoes" ON acoes_fiscalizacao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role = 'gestor'
    )
  );

-- RLS Policies for comments
CREATE POLICY "Users can view comments of accessible occurrences" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM occurrences 
      WHERE occurrences.id = comments.occurrence_id
      AND (
        occurrences.citizen_id = auth.uid()::text::uuid
        OR occurrences.assigned_fiscal_id = auth.uid()::text::uuid
        OR EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid()::text::uuid AND role IN ('gestor', 'auditor')
        )
      )
    )
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (profile_id = auth.uid()::text::uuid);

-- ============================================
-- PHASE 4: Functions and Triggers
-- ============================================

-- Prevent updates and deletes on audit trail
CREATE OR REPLACE FUNCTION prevent_audit_trail_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot modify audit trail entries';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_trail_update
  BEFORE UPDATE ON occurrence_status_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_trail_modification();

CREATE TRIGGER prevent_audit_trail_delete
  BEFORE DELETE ON occurrence_status_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_trail_modification();

-- Function to apply SLA deadline
CREATE OR REPLACE FUNCTION apply_sla_deadline()
RETURNS TRIGGER AS $$
DECLARE
  sla_hours INTEGER;
BEGIN
  SELECT hours INTO sla_hours FROM sla_rules WHERE category = NEW.category;
  
  IF sla_hours IS NULL THEN
    sla_hours := 72; -- Default SLA
  END IF;
  
  NEW.sla_deadline := NEW.created_at + (sla_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_apply_sla_deadline
  BEFORE INSERT ON occurrences
  FOR EACH ROW EXECUTE FUNCTION apply_sla_deadline();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO occurrence_status_log (
      occurrence_id,
      from_status,
      to_status,
      changed_by,
      changed_by_name,
      ip_address,
      geo,
      note
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      (SELECT nome FROM profiles WHERE id = auth.uid()::text::uuid),
      NULL,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_status_change
  AFTER UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Function to update ordens_servico atualizado_em
CREATE OR REPLACE FUNCTION update_os_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_os_timestamp
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION update_os_timestamp();

-- Function to update fiscal_stats
CREATE OR REPLACE FUNCTION update_fiscal_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fiscal_stats (fiscal_id, total_assigned, last_assigned_at)
    VALUES (NEW.fiscal_id, 1, NOW())
    ON CONFLICT (fiscal_id) DO UPDATE SET
      total_assigned = fiscal_stats.total_assigned + 1,
      last_assigned_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiscal_stats
  AFTER INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_stats();

-- Insert default SLA rules
INSERT INTO sla_rules (category, hours) VALUES
  ('Buraco na via', 24),
  ('Poluição sonora', 48),
  ('Iluminação pública', 72),
  ('Entulho/lixo', 48),
  ('Calçada danificada', 72),
  ('Árvores', 120),
  ('Vias públicas', 48),
  ('Edificações', 96),
  ('Outros', 72)
ON CONFLICT (category) DO NOTHING;

-- Insert default acoes_fiscalizacao
INSERT INTO acoes_fiscalizacao (nome, descricao, ordem) VALUES
  ('Notificação', 'Emitir notificação ao responsável', 1),
  ('Multa', 'Lavratura de auto de infração com multa', 2),
  ('Encaminhamento', 'Encaminhar para outro órgão', 3),
  ('Orientação', 'Orientação verbal ao responsável', 4),
  ('Sem ação', 'Nenhuma ação necessária', 5)
ON CONFLICT DO NOTHING;

-- Insert default tipos_infracao
INSERT INTO tipos_infracao (nome, descricao, artigo_legal, valor_base) VALUES
  ('Descarte irregular de entulho', 'Descarte de entulho em via pública', 'Lei Municipal 123/2020 Art. 45', '500.00'),
  ('Ocupação de calçada', 'Ocupação indevida de calçada', 'Lei Municipal 123/2020 Art. 32', '200.00'),
  ('Poluição sonora', 'Ruído acima do permitido', 'Lei Municipal 98/2019 Art. 12', '1000.00'),
  ('Obra sem licença', 'Construção sem alvará', 'Lei Municipal 87/2018 Art. 28', '2000.00'),
  ('Danos à via pública', 'Danos a pavimentação', 'Lei Municipal 123/2020 Art. 50', '1500.00')
ON CONFLICT DO NOTHING;
