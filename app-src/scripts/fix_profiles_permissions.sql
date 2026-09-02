-- Função para criar perfil com privilégios elevados
-- Execute isso no SQL Editor do Supabase

-- 1. Criar função que contorna RLS
CREATE OR REPLACE FUNCTION public.create_profile_with_auth(
  p_id uuid,
  p_email text,
  p_password_hash text,
  p_role text,
  p_nome text,
  p_telefone text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_especialidade text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_ativo boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do dono da função
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, password_hash, role, nome, 
    telefone, bairro, especialidade, region, ativo
  ) VALUES (
    p_id, p_email, p_password_hash, p_role, p_nome,
    p_telefone, p_bairro, p_especialidade, p_region, p_ativo
  );
END;
$$;

-- 2. Dar permissão para execução
GRANT EXECUTE ON FUNCTION public.create_profile_with_auth TO anon, authenticated;

-- 3. Desabilitar RLS temporariamente para testes (opcional)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Alternativa: Dar permissão direta ao service_role
-- GRANT INSERT ON public.profiles TO service_role;
