// ============================================================
// SIFAU — Autenticação (server-only) usando Supabase Auth
// ============================================================
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

const SESSION_COOKIE = "sb-session";

/**
 * Converte uma row bruta da tabela `profiles` (Drizzle) para o tipo de
 * domínio `Profile`. Os dois campos abaixo (`cpf_cnpj`, `push_enabled`)
 * existem na tabela real (ver drizzle/0000_good_bloodstrike.sql), mas
 * `getSessionProfile` os preenche com valores fixos porque lê o perfil
 * via Supabase (RLS), cujo select "*" pode não expor todas as colunas
 * dependendo da policy. Aqui, a row já vem direto do Drizzle/Postgres,
 * então os valores reais da coluna estão disponíveis.
 */
export function toProfile(row: {
  id: string;
  email: string;
  role: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
  especialidade: string | null;
  region: string | null;
  cpf_cnpj: string | null;
  push_enabled: boolean;
  ativo: boolean;
  created_at: Date;
}): Profile {
  return {
    id: row.id,
    role: row.role as UserRole,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    bairro: row.bairro,
    especialidade: row.especialidade,
    region: row.region,
    cpf_cnpj: row.cpf_cnpj,
    push_enabled: row.push_enabled,
    ativo: row.ativo,
    created_at: row.created_at.toISOString(),
  };
}

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  
  // Buscar dados adicionais do perfil na tabela profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError || !profile) return null;
  if (!profile.ativo) return null;
  
  return {
    id: profile.id,
    role: profile.role as UserRole,
    nome: profile.nome,
    email: profile.email,
    telefone: profile.telefone,
    bairro: profile.bairro,
    especialidade: profile.especialidade,
    region: profile.region,
    cpf_cnpj: null, // Removido do schema Supabase
    push_enabled: true, // Removido do schema Supabase
    ativo: profile.ativo,
    created_at: profile.created_at,
  };
}

export async function createSession(
  profileId: string,
  opts: { secure?: boolean } = {}
): Promise<void> {
  // Supabase Auth gerencia sessões automaticamente
  // Esta função é mantida para compatibilidade
}

export async function destroySession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export function requireRole(profile: Profile | null, roles: UserRole[]): Profile | null {
  if (!profile) return null;
  if (!roles.includes(profile.role)) return null;
  return profile;
}

export function roleHome(role: UserRole): string {
  switch (role) {
    case "cidadao":
      return "/app/minhas-ocorrencias";
    case "fiscal":
      return "/app/fiscal";
    case "gestor":
      return "/app/gestor";
    case "auditor":
      return "/app/auditor";
  }
}

/** Gate server-side: exige sessão e papel; redireciona caso contrário. */
export async function requireProfile(roles: UserRole[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/auth");
  if (!roles.includes(profile.role)) redirect(roleHome(profile.role));
  return profile;
}

/** IP aproximado do cliente para a trilha de auditoria. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}