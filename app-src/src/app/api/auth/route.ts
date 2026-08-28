import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
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
    
    // Criar usuário no Supabase Auth (sem confirmação por email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          email_confirm: true,
        },
      },
    });
    
    if (authError) {
      return err(authError.message, 400);
    }
    
    if (!authData.user) {
      return err("Erro ao criar usuário.", 500);
    }
    
    // Criar perfil na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        password_hash: '', // Supabase Auth gerencia a senha
        role,
        nome,
        telefone: body.telephone ? String(body.telephone) : null,
        bairro: body.bairro ? String(body.bairro) : null,
        especialidade: body.especialidade ? String(body.especialidade) : null,
        region: body.region ? String(body.region) : null,
        ativo: true,
      });
      
    if (profileError) {
      return err("Erro ao criar perfil.", 500);
    }
    
    return NextResponse.json({ profile: { id: authData.user.id, email, role, nome } }, { status: 201 });
  }

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  return err("Ação inválida.", 400);
}