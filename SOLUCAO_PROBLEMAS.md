# Solução de Problemas - SIFAU

Este documento ajuda a resolver problemas comuns no SIFAU.

## Problemas de Instalação

### Erro: "Cannot find module '@supabase/supabase-js'"

**Solução:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Erro: "Type error: Cannot find name 'process'"

**Solução:**
Adicione ao `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

### Erro: "Module not found: Can't resolve '@/components/ui/button'"

**Solução:**
Verifique se o arquivo existe em `src/components/ui/button.tsx`

## Problemas de Autenticação

### Erro: "Unauthorized" ao acessar rotas protegidas

**Causas possíveis:**
1. Sessão expirada
2. Cookie não configurado corretamente
3. Problema com Supabase Auth

**Solução:**
1. Faça logout e login novamente
2. Verifique as variáveis de ambiente do Supabase
3. Limpe cookies do navegador
4. Verifique se o middleware está configurado corretamente

### Erro: "Profile not found"

**Causa:** O usuário existe no Supabase Auth mas não na tabela `profiles`

**Solução:**
Crie o perfil manualmente no banco:
```sql
INSERT INTO profiles (id, email, password_hash, role, nome)
VALUES (
  'user-id-from-supabase',
  'user@email.com',
  'hashed-password',
  'cidadao',
  'Nome do Usuário'
);
```

### Erro: "Account not found or inactive"

**Causa:** O perfil existe mas está marcado como inativo

**Solução:**
```sql
UPDATE profiles SET ativo = true WHERE id = 'user-id';
```

## Problemas de Banco de Dados

### Erro: "Relation does not exist"

**Causa:** A migration não foi executada

**Solução:**
1. Execute a migration no painel do Supabase
2. Ou use a CLI do Supabase:
```bash
supabase db push
```

### Erro: "Permission denied for table"

**Causa:** RLS (Row Level Security) bloqueando o acesso

**Solução:**
1. Verifique se as políticas RLS estão configuradas
2. Verifique se o usuário tem as permissões corretas
3. Desative RLS temporariamente para teste:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Erro: "null value in column violates not-null constraint"

**Causa:** Tentando inserir NULL em campo obrigatório

**Solução:**
Verifique se todos os campos obrigatórios estão sendo preenchidos:
- `occurrences`: category, description, lat, lng
- `inspections`: occurrence_id, fiscal_id, arrival_at, report, action_taken
- `ordens_servico`: numero_os, origem_os, requerente, servico_descricao, endereco, prazo_resposta

## Problemas de Permissões RLS

### Usuário não consegue ver seus próprios dados

**Causa:** Política RLS muito restrita

**Solução:**
Verifique a política RLS da tabela:
```sql
SELECT * FROM pg_policies WHERE tablename = 'occurrences';
```

Ajuste a política se necessário:
```sql
DROP POLICY IF EXISTS "Users can view own occurrences" ON occurrences;
CREATE POLICY "Users can view own occurrences" ON occurrences
  FOR SELECT USING (citizen_id = auth.uid()::text::uuid);
```

### Fiscal não consegue ver ocorrências atribuídas

**Causa:** Política RLS não considerando assigned_fiscal_id

**Solução:**
Adicione OR à política existente:
```sql
CREATE POLICY "Fiscais can view assigned occurrences" ON occurrences
  FOR SELECT USING (assigned_fiscal_id = auth.uid()::text::uuid);
```

## Problemas de Classificação por IA

### Erro: "No LLM API key configured"

**Solução:**
Configure a variável de ambiente:
```env
SIFAU_LLM_API_KEY=your-api-key
```

### Classificação sempre retorna "Outros"

**Causa:** Classificador heurístico não encontrando keywords

**Solução:**
1. Verifique se a descrição tem detalhes suficientes
2. Ajuste as keywords em `src/app/api/classify/route.ts`
3. Configure uma API key para usar LLM

### Timeout na classificação

**Causa:** LLM demorando mais que 12 segundos

**Solução:**
1. Use um modelo mais rápido (Gemini Flash, Groq)
2. Aumente o timeout em `src/app/api/classify/route.ts`
3. O fallback heurístico será ativado automaticamente

## Problemas de Offline-First

### Vistorias não sincronizam

**Causa:** Problema com localStorage ou API

**Solução:**
1. Verifique se há dados no localStorage:
```javascript
console.log(localStorage.getItem('pendingInspections'));
```
2. Verifique o console para erros de rede
3. Teste a API de inspections manualmente

### Erro: "Cannot read property of null (reading 'photos')"

**Causa:** Dados corrompidos no localStorage

**Solução:**
Limpe o localStorage:
```javascript
localStorage.removeItem('pendingInspections');
```

## Problemas de SLA

### SLA não está sendo calculado

**Causa:** Trigger não configurado ou migration não executada

**Solução:**
Verifique se o trigger existe:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_apply_sla_deadline';
```

Recrie o trigger se necessário:
```sql
CREATE TRIGGER trigger_apply_sla_deadline
  BEFORE INSERT ON occurrences
  FOR EACH ROW EXECUTE FUNCTION apply_sla_deadline();
```

### SLA estourado incorretamente

**Causa:** Regra de SLA configurada com horas insuficientes

**Solução:**
Ajuste as regras de SLA no painel do gestor ou diretamente no banco:
```sql
UPDATE sla_rules SET hours = 96 WHERE category = 'Buraco na via';
```

## Problemas de Upload de Mídia

### Erro: "File too large"

**Causa:** Imagem muito grande

**Solução:**
O sistema comprime imagens automaticamente, mas você pode ajustar:
```typescript
// Em src/lib/utils.ts
compressImage(file, maxWidth = 800, quality = 0.7)
```

### Upload falha silenciosamente

**Causa:** Problema com Supabase Storage

**Solução:**
1. Verifique se o bucket existe no Supabase
2. Verifique as permissões do bucket
3. Use armazenamento local para teste:
```env
SIFAU_ALLOW_LOCAL_DISK_STORAGE=true
```

## Problemas de Deploy

### Erro: "Build failed" no Vercel

**Causa:** Variáveis de ambiente não configuradas

**Solução:**
1. Configure todas as variáveis no painel do Vercel
2. Verifique se o build roda localmente
3. Verifique os logs de build no Vercel

### Erro: "Database connection failed"

**Causa:** DATABASE_URL incorreta ou firewall bloqueando

**Solução:**
1. Verifique a URL do banco de dados
2. Verifique se o IP do Vercel está permitido no Supabase
3. Use connection pooling se necessário

## Problemas de Mobile (Capacitor)

### App não abre no dispositivo

**Causa:** URL incorreta ou problema de SSL

**Solução:**
1. Verifique a URL em `capacitor.config.json`
2. Use HTTPS em produção
3. Verifique os logs do dispositivo

### Geolocalização não funciona no mobile

**Causa:** Permissões de GPS não concedidas

**Solução:**
1. Adicione permissões no `AndroidManifest.xml` e `Info.plist`
2. Solicite permissão em runtime
3. Verifique se o GPS está ativado no dispositivo

## Problemas de Performance

### Aplicação lenta ao carregar

**Causa:** Muitos dados sendo carregados

**Solução:**
1. Implemente paginação nas listas
2. Use lazy loading para componentes
3. Otimize as queries do banco
4. Adicione índices nas tabelas

### Mapa de calor lento com muitos pontos

**Causa:** Renderização de muitos pontos no Leaflet

**Solução:**
1. Use clustering de pontos
2. Limite o número de pontos exibidos
3. Use web workers para processamento

## Debugging

### Ativar logs detalhados

Adicione ao seu código:
```typescript
console.log('Debug:', data);
```

### Verificar requisições de rede

Use o DevTools do navegador:
1. Abra a aba Network
2. Filtre por fetch/XHR
3. Verifique request/response

### Verificar estado do banco

Use o SQL Editor do Supabase:
```sql
SELECT * FROM occurrences LIMIT 10;
SELECT * FROM profiles WHERE email = 'user@email.com';
```

## Suporte Adicional

Se o problema persistir:
1. Consulte a documentação do Supabase
2. Consulte a documentação do Next.js
3. Abra uma issue no repositório com:
   - Descrição detalhada do problema
   - Passos para reproduzir
   - Logs de erro
   - Versão do Node.js e dependências

---

Última atualização: 2026-09-12
