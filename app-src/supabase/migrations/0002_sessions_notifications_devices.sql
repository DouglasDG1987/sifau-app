-- ============================================================
-- SIFAU — Sessions, Notifications, Device Tokens + colunas de profiles
-- Aplicar em: Supabase SQL Editor ou supabase db push
--
-- Estas 3 tabelas e as 2 colunas de `profiles` já existem em
-- drizzle/0000_good_bloodstrike.sql (aplicada via `drizzle-kit push`,
-- conforme deploy.md) mas nunca tinham sido adicionadas a esta migration
-- de RLS, então nasceram sem nenhuma policy de segurança. Esta migration
-- fecha essa lacuna: cria as tabelas (idempotente, `if not exists`) e
-- aplica RLS.
-- ============================================================

-- ---------- Colunas de profiles ausentes desta migration ----------
alter table public.profiles add column if not exists cpf_cnpj text;
alter table public.profiles add column if not exists push_enabled boolean not null default true;

-- ---------- Sessões (legado — não é mais escrita pelo login atual, que
-- usa Supabase Auth; ver src/app/api/auth/route.ts. A tabela segue
-- existindo pois scripts/seed.ts e scripts/clean.ts a referenciam.) ----------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------- Tokens de dispositivo (push notifications) ----------
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android','web')),
  device_info jsonb not null default '{}',
  active boolean not null default true,
  last_used timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists device_profile_idx on public.device_tokens(profile_id);
create index if not exists device_token_idx on public.device_tokens(token);

-- ---------- Notificações ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('occurrence_status','sla_alert','assignment','system')),
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now(),
  occurrence_id uuid references public.occurrences(id)
);
create index if not exists notif_profile_idx on public.notifications(profile_id);
create index if not exists notif_read_idx on public.notifications(read);
create index if not exists notif_created_idx on public.notifications(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.sessions enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notifications enable row level security;

-- Sessões: cada perfil só enxerga (e apaga) a própria sessão. Nenhum papel
-- tem acesso administrativo aqui de propósito — é uma tabela legada, sem
-- necessidade de visão ampla por gestor/auditor.
create policy "sessions_self" on public.sessions
  for all using (auth.uid() = profile_id);

-- Tokens de dispositivo: cada perfil gerencia os próprios tokens.
create policy "device_tokens_self" on public.device_tokens
  for all using (auth.uid() = profile_id);

-- Notificações: cada perfil só lê/atualiza as próprias. A criação é feita
-- pelo backend com a service role (bypassa RLS), então não é necessária
-- uma policy de insert para o usuário final.
create policy "notifications_self_read" on public.notifications
  for select using (auth.uid() = profile_id);
create policy "notifications_self_update" on public.notifications
  for update using (auth.uid() = profile_id);
