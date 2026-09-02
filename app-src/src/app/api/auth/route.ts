import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { getSessionProfile, destroySession } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["cidadao", "fiscal", "gestor", "auditor"];

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const profile = await getSessionProfile();
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;

  if (action === "login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return err("Informe e-mail e senha.", 400);
    
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return err("E-mail ou senha inválidos.", 401);
    }
    
    // Verificar se o perfil está ativo e tem o papel correto
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profileError || !profile) {
      return err("Perfil não encontrado.", 404);
    }
    
    if (!profile.ativo) {
      return err("Conta desativada. Procure a administração municipal.", 403);
    }
    
    return NextResponse.json({ profile });
  }

  if (action === "register") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nome = String(body.nome ?? "").trim();
    const role = body.role as UserRole;
    
    if (!email || !password || !nome) return err("Preencha nome, e-mail e senha.", 400);
    if (!ROLES.includes(role)) return err("Perfil inválido.", 400);
    if (password.length < 6) return err("A senha precisa ter no mínimo 6 caracteres.", 400);
    
    const supabase = await createClient();
    
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
      
    if (existing && existing.length > 0) {
      return err("Já existe uma conta com este e-mail.", 409);
    }
    
    // Cria e confirma o usuário via Admin API quando a service role estiver
    // configurada. Isso evita depender da confirmação por e-mail no cadastro.
    let authUserId: string;
    let requiresEmailConfirmation = false;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (adminError) return err(adminError.message, 400);
      if (!adminData.user) return err("Erro ao criar usuário.", 500);
      authUserId = adminData.user.id;

      // O Admin API não cria uma sessão no navegador; faça um login normal
      // para que o createServerClient grave os cookies httpOnly da sessão.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return err("Usuário criado, mas não foi possível iniciar a sessão.", 500);
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: undefined },
      });
      if (authError) return err(authError.message, 400);
      if (!authData.user) return err("Erro ao criar usuário.", 500);
      requiresEmailConfirmation = !authData.session;
      authUserId = authData.user.id;
    }
    
    // Criar perfil usando função SQL que contorna RLS
    const { error: rpcError } = await supabase.rpc('create_profile_with_auth', {
      p_id: authUserId,
      p_email: email,
      p_password_hash: "!managed-by-supabase-auth!",
      p_role: role,
      p_nome: nome,
      p_telefone: body.telefone ? String(body.telefone) : null,
      p_bairro: body.bairro ? String(body.bairro) : null,
      p_especialidade: body.especialidade ? String(body.especialidade) : null,
      p_region: body.region ? String(body.region) : null,
      p_ativo: true
    });

    if (rpcError) {
      console.error("Erro ao criar perfil via RPC:", rpcError);
      return err(rpcError.message.includes("duplicate") || rpcError.message.includes("unique")
        ? "Já existe um perfil com este e-mail."
        : "Erro ao criar perfil: " + rpcError.message, 500);
    }

    // Perfil criado com sucesso, retornar os dados básicos
    return NextResponse.json({ profile: { id: authUserId, email, role, nome } }, { status: 201 });
  }

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  return err("Ação inválida.", 400);
}