-- ============================================================
-- SIFAU — Schema + RLS (Supabase / Postgres)
-- Aplicar em: Supabase SQL Editor ou supabase db push
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('cidadao','fiscal','gestor','auditor')),
  nome text not null,
  telefone text,
  bairro text,
  especialidade text,
  region text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Occurrences ----------
create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references public.profiles(id),
  category text not null,
  subcategory text,
  description text not null,
  status text not null default 'aberta'
    check (status in ('aberta','triada','atribuida','em_vistoria','resolvida','arquivada','escalonada')),
  urgency_score int not null default 2 check (urgency_score between 1 and 4),
  lat double precision not null,
  lng double precision not null,
  bairro text,
  address text,
  created_at timestamptz not null default now(),
  sla_deadline timestamptz not null,
  duplicate_of uuid references public.occurrences(id),
  archived boolean not null default false,
  archive_reason text,
  assigned_fiscal_id uuid references public.profiles(id)
);
create index if not exists occ_status_idx on public.occurrences(status);
create index if not exists occ_assigned_idx on public.occurrences(assigned_fiscal_id);
create index if not exists occ_citizen_idx on public.occurrences(citizen_id);

-- ---------- Mídia ----------
create table if not exists public.occurrence_media (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid references public.occurrences(id) on delete cascade,
  url text not null,
  type text not null default 'foto' check (type in ('foto','video')),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Trilha de auditoria (imutável) ----------
create table if not exists public.occurrence_status_log (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid not null references public.profiles(id),
  changed_by_name text,
  changed_at timestamptz not null default now(),
  ip_address text,
  geo text,
  note text
);
-- A trilha é append-only: ninguém pode atualizar ou apagar
create or replace function public.prevent_log_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Trilha de auditoria é imutável';
end $$;
drop trigger if exists trg_log_no_update on public.occurrence_status_log;
create trigger trg_log_no_update
  before update or delete on public.occurrence_status_log
  for each row execute function public.prevent_log_mutation();

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete cascade,
  fiscal_id uuid not null references public.profiles(id),
  arrival_at timestamptz not null,
  arrival_lat double precision,
  arrival_lng double precision,
  report_json jsonb not null default '{}',
  action_taken text not null check (action_taken in ('notificacao','multa','encaminhamento','orientacao','sem_acao')),
  fine_amount numeric(12,2),
  fine_process_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  author_name text,
  visibility text not null default 'public' check (visibility in ('public','internal')),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sla_rules (
  id uuid primary key default gen_random_uuid(),
  category text unique not null,
  max_hours int not null default 72
);

create table if not exists public.fiscal_stats (
  fiscal_id uuid primary key references public.profiles(id) on delete cascade,
  avg_rating double precision not null default 4.5,
  updated_at timestamptz not null default now()
);

create table if not exists public.prefeitura_config (
  id uuid primary key default gen_random_uuid(),
  nome_prefeitura text not null,
  legislacao_aplicavel jsonb not null default '[]'
);

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero_os text unique not null,
  origem_os text not null check (origem_os in ('preventiva','denuncia','oficio','ci','gestao')),
  denuncia_id uuid references public.occurrences(id) on delete set null,
  requerente text not null,
  gerente_id uuid not null references public.profiles(id),
  fiscal_id uuid references public.profiles(id),
  apoio_operacional boolean not null default false,
  orgao_apoio text check (orgao_apoio in ('policia_militar','guarda_municipal','outro')),
  orgao_apoio_outro text,
  servico_descricao text not null,
  legislacao_aplicavel jsonb not null default '[]',
  endereco text not null,
  latitude double precision,
  longitude double precision,
  data_emissao timestamptz not null default now(),
  prazo_resposta timestamptz not null,
  status text not null default 'aberta' check (status in ('aberta','em_vistoria','concluida','cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.acoes_fiscalizacao (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  descricao text
);

create table if not exists public.tipos_infracao (
  id uuid primary key default gen_random_uuid(),
  artigo_legal text not null,
  descricao text not null,
  valor_base numeric(12,2) not null
);

create table if not exists public.vistorias (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  fiscal_id uuid not null references public.profiles(id),
  iniciada_em timestamptz not null default now(),
  finalizada_em timestamptz,
  geo_inicio_lat double precision,
  geo_inicio_lng double precision,
  geo_inicio_precisao_m double precision,
  relatorio text,
  fotos jsonb not null default '[]',
  status text not null default 'em_andamento' check (status in ('em_andamento','finalizada')),
  criado_em timestamptz not null default now()
);

create table if not exists public.autos_infracao (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo_infracao_id uuid not null references public.tipos_infracao(id),
  valor_multa numeric(12,2) not null,
  motivo text,
  autuado_nome text,
  autuado_documento text,
  ciencia_status text not null default 'ausente' check (ciencia_status in ('assinou','recusou','ausente')),
  testemunha_nome text,
  criado_em timestamptz not null default now()
);

create table if not exists public.audit_exports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  sha256 text not null,
  description text not null,
  row_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- View anonimizada para o mapa público ----------
create or replace view public.occurrences_public_map as
select id, category, urgency_score as urgency, status, bairro, lat, lng, created_at
from public.occurrences
where archived = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.occurrences enable row level security;
alter table public.occurrence_media enable row level security;
alter table public.occurrence_status_log enable row level security;
alter table public.inspections enable row level security;
alter table public.comments enable row level security;
alter table public.sla_rules enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.vistorias enable row level security;
alter table public.autos_infracao enable row level security;
alter table public.audit_exports enable row level security;

-- Perfis: cada um vê o próprio; gestor/auditor veem todos (auditor sem escrita)
create policy "profile_self" on public.profiles
  for select using (auth.uid() = id);
create policy "profile_admin_read" on public.profiles
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('gestor','auditor')));
create policy "profile_admin_write" on public.profiles
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'auditor'))
  with check (true);

-- Ocorrências: cidadão = próprias; fiscal = atribuídas; gestor/auditor = todas
create policy "occ_citizen" on public.occurrences
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'cidadao' and p.id = citizen_id)
  );
create policy "occ_fiscal" on public.occurrences
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fiscal' and p.id = assigned_fiscal_id)
  );
create policy "occ_fiscal_write" on public.occurrences
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fiscal' and p.id = assigned_fiscal_id)
  );
create policy "occ_gestor" on public.occurrences
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );
create policy "occ_auditor_read" on public.occurrences
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'auditor')
  );

-- Mapa público: view com permissão para autenticados (anonimizada)
grant select on public.occurrences_public_map to authenticated;

-- Trilha: leitura para todos os autenticados; escrita só via trigger/função (imutável)
create policy "log_read" on public.occurrence_status_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

-- Mídia: dono, fiscal atribuído, gestor e auditor
create policy "media_access" on public.occurrence_media
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );
create policy "media_upload" on public.occurrence_media
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

-- Demais tabelas: gestor = tudo; auditor = leitura; fiscal = vistorias da própria OS
create policy "inspections_fiscal" on public.inspections
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fiscal' and p.id = fiscal_id)
  );
create policy "inspections_gestor_auditor" on public.inspections
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('gestor','auditor'))
  );

create policy "comments_read" on public.comments
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );
create policy "comments_write" on public.comments
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

create policy "sla_gestor" on public.sla_rules
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );
create policy "sla_read" on public.sla_rules
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

create policy "os_gestor" on public.ordens_servico
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );
create policy "os_fiscal" on public.ordens_servico
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fiscal' and p.id = fiscal_id)
  );
create policy "os_auditor_read" on public.ordens_servico
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'auditor')
  );

create policy "vistorias_os" on public.vistorias
  for all using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = os_id and (
        os.fiscal_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
      )
    )
  );
create policy "vistorias_auditor_read" on public.vistorias
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'auditor')
  );

create policy "autos_os" on public.autos_infracao
  for all using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = os_id and (
        os.fiscal_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
      )
    )
  );
create policy "autos_auditor_read" on public.autos_infracao
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'auditor')
  );

create policy "exports_auditor" on public.audit_exports
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'auditor')
  );

-- ---------- Trigger: SLA ao criar ocorrência ----------
create or replace function public.apply_sla_deadline()
returns trigger language plpgsql as $$
declare
  h int;
begin
  select max_hours into h from public.sla_rules where category = new.category;
  if h is null then h := 72; end if;
  new.sla_deadline := now() + make_interval(hours => h);
  return new;
end $$;

drop trigger if exists trg_sla on public.occurrences;
create trigger trg_sla
  before insert on public.occurrences
  for each row execute function public.apply_sla_deadline();
