# PROMPT DETALHADO PARA RECREAÇÃO COMPLETA DO SIFAU
# Sistema Municipal de Fiscalização e Atendimento Urbano

## DESCRIÇÃO GERAL DO PROJETO

Crie um sistema municipal completo chamado SIFAU (Sistema Municipal de Fiscalização e Atendimento Urbano) que conecta 4 perfis de usuários em uma única plataforma web com funcionalidades avançadas de geolocalização, classificação por IA, ordens de serviço formais, trilha de auditoria imutável e funcionalidade offline-first para fiscais em campo.

### Objetivos Principais:
- Plataforma institucional municipal que permite cidadãos reportar problemas urbanos
- Sistema de atribuição automática de ocorrências para fiscais (evitando cherry-picking)
- Classificação automática por IA generativa com fallback heurístico local
- Sistema de ordens de serviço formais com geofencing e autos de infração
- Trilha de auditoria imutável com hash SHA-256 para cadeia de custódia
- Funcionalidade offline-first para vistorias em campo
- Dashboard administrativo completo para gestores e auditores

## ARQUITETURA E TECNOLOGIAS

### Stack Tecnológico Principal:
- **Frontend**: Next.js 16+ com App Router
- **Linguagem**: TypeScript (strict mode)
- **Banco de Dados**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Autenticação**: Supabase Auth com cookies httpOnly
- **UI Framework**: React 19
- **Componentes UI**: Radix UI (base) + Tailwind CSS 4
- **Gráficos**: Recharts
- **Mapas**: Leaflet + React Leaflet
- **Forms**: React Hook Form + Zod
- **Notificações**: Sonner (toast)
- **PDF**: jsPDF
- **Mobile**: Capacitor 8+ (wrapper nativo)

### Estrutura de Pastas:
```
app-src/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # Rotas da API server-side
│   │   ├── app/               # Telas principais do app autenticado
│   │   ├── auth/              # Telas de autenticação
│   │   └── layout.tsx         # Layout raiz
│   ├── components/            # Componentes reutilizáveis
│   │   ├── ui/               # Componentes UI base (Radix UI)
│   │   └── *.tsx             # Componentes de negócio
│   ├── screens/              # Telas por perfil de usuário
│   │   ├── citizen/          # Telas do cidadão
│   │   ├── fiscal/           # Telas do fiscal
│   │   ├── gestor/           # Telas do gestor
│   │   └── auditor/          # Telas do auditor
│   ├── lib/                  # Bibliotecas e utilitários
│   ├── services/             # Serviços externos
│   └── db/                   # Configuração do banco (Drizzle)
├── supabase/
│   └── migrations/           # Migrations SQL do Supabase
├── scripts/                 # Scripts de manutenção
└── public/                  # Arquivos estáticos
```

## MODELO DE DADOS COMPLETO

### Tabelas Principais:

#### 1. profiles (Usuários do sistema)
```typescript
{
  id: uuid (primary key)
  email: text (unique, not null)
  password_hash: text (not null)
  role: text (not null) // 'cidadao' | 'fiscal' | 'gestor' | 'auditor'
  nome: text (not null)
  telefone: text (optional)
  bairro: text (optional)
  especialidade: text (optional)
  region: text (optional)
  cpf_cnpj: text (optional)
  push_enabled: boolean (default true)
  ativo: boolean (default true)
  created_at: timestamptz (default now)
}
```

#### 2. occurrences (Ocorrências reportadas)
```typescript
{
  id: uuid (primary key)
  citizen_id: uuid (references profiles.id)
  category: text (not null) // Categoria do problema
  subcategory: text (optional)
  description: text (not null)
  status: text (not null, default 'aberta') // 'aberta' | 'triada' | 'atribuida' | 'em_vistoria' | 'resolvida' | 'arquivada' | 'escalonada'
  urgency_score: integer (not null, default 2) // 1-4 (Baixa, Média, Alta, Crítica)
  lat: double precision (not null)
  lng: double precision (not null)
  bairro: text (optional)
  address: text (optional)
  created_at: timestamptz (not null, default now)
  sla_deadline: timestamptz (not null)
  duplicate_of: uuid (references occurrences.id, optional)
  archived: boolean (default false)
  archive_reason: text (optional)
  assigned_fiscal_id: uuid (references profiles.id, optional)
}
```

#### 3. occurrence_media (Fotos das ocorrências)
```typescript
{
  id: uuid (primary key)
  occurrence_id: uuid (references occurrences.id, on delete cascade)
  url: text (not null)
  type: text (not null, default 'foto') // 'foto' | 'video'
  uploaded_by: uuid (references profiles.id)
  created_at: timestamptz (not null, default now)
}
```

#### 4. occurrence_status_log (Trilha de auditoria imutável)
```typescript
{
  id: uuid (primary key)
  occurrence_id: uuid (references occurrences.id, on delete cascade)
  from_status: text (optional)
  to_status: text (not null)
  changed_by: uuid (references profiles.id, not null)
  changed_by_name: text (optional)
  changed_at: timestamptz (not null, default now)
  ip_address: text (optional)
  geo: text (optional)
  note: text (optional)
}
// TRIGGER: Impede UPDATE e DELETE (trilha imutável)
```

#### 5. inspections (Vistorias realizadas)
```typescript
{
  id: uuid (primary key)
  occurrence_id: uuid (references occurrences.id, on delete cascade)
  fiscal_id: uuid (references profiles.id, not null)
  arrival_at: timestamptz (not null)
  arrival_lat: double precision (optional)
  arrival_lng: double precision (optional)
  report_json: jsonb (not null, default '{}')
  action_taken: text (not null) // 'notificacao' | 'multa' | 'encaminhamento' | 'orientacao' | 'sem_acao'
  fine_amount: numeric(12,2) (optional)
  fine_process_number: text (optional)
  created_at: timestamptz (not null, default now)
}
```

#### 6. ordens_servico (Ordens de serviço formais)
```typescript
{
  id: uuid (primary key)
  numero_os: text (unique, not null)
  origem_os: text (not null) // 'preventiva' | 'denuncia' | 'oficio' | 'ci' | 'gestao'
  denuncia_id: uuid (references occurrences.id, on delete set null, optional)
  requerente: text (not null)
  gerente_id: uuid (references profiles.id, not null)
  fiscal_id: uuid (references profiles.id, optional)
  apoio_operacional: boolean (default false)
  orgao_apoio: text (optional) // 'policia_militar' | 'guarda_municipal' | 'outro'
  orgao_apoio_outro: text (optional)
  servico_descricao: text (not null)
  legislacao_aplicavel: jsonb (not null, default '[]')
  endereco: text (not null)
  latitude: double precision (optional)
  longitude: double precision (optional)
  data_emissao: timestamptz (not null, default now)
  prazo_resposta: timestamptz (not null)
  status: text (not null, default 'aberta') // 'aberta' | 'em_vistoria' | 'concluida' | 'cancelada'
  criado_em: timestamptz (not null, default now)
  atualizado_em: timestamptz (not null, default now)
}
```

#### 7. vistorias (Vistorias de OS)
```typescript
{
  id: uuid (primary key)
  os_id: uuid (references ordens_servico.id, on delete cascade, not null)
  fiscal_id: uuid (references profiles.id, not null)
  iniciada_em: timestamptz (not null, default now)
  finalizada_em: timestamptz (optional)
  geo_inicio_lat: double precision (optional)
  geo_inicio_lng: double precision (optional)
  geo_inicio_precisao_m: double precision (optional)
  relatorio: text (optional)
  fotos: jsonb (not null, default '[]')
  status: text (not null, default 'em_andamento') // 'em_andamento' | 'finalizada'
  criado_em: timestamptz (not null, default now)
}
```

#### 8. autos_infracao (Autos de infração)
```typescript
{
  id: uuid (primary key)
  os_id: uuid (references ordens_servico.id, on delete cascade, not null)
  tipo_infracao_id: uuid (references tipos_infracao.id, not null)
  valor_multa: numeric(12,2) (not null)
  motivo: text (optional)
  autuado_nome: text (optional)
  autuado_documento: text (optional)
  ciencia_status: text (not null, default 'ausente') // 'assinou' | 'recusou' | 'ausente'
  testemunha_nome: text (optional)
  status_pagamento: text (not null, default 'pendente') // 'pendente' | 'pago' | 'cancelado'
  data_vencimento: timestamptz (optional)
  recidiva_id: uuid (references recidivas.id, optional)
  criado_em: timestamptz (not null, default now)
}
```

#### 9. recidivas (Controle de reincidência)
```typescript
{
  id: uuid (primary key)
  auto_infracao_id: uuid (references autos_infracao.id, not null)
  documento_responsavel: text (not null)
  ocorrencia_original_id: uuid (references occurrences.id, not null)
  nivel_reincidencia: integer (not null, default 1)
  fator_multiplicacao: numeric(5,2) (not null, default 1.5)
  criado_em: timestamptz (not null, default now)
}
```

#### 10. notifications (Sistema de notificações)
```typescript
{
  id: uuid (primary key)
  profile_id: uuid (references profiles.id, on delete cascade, not null)
  type: text (not null) // 'occurrence_status' | 'sla_alert' | 'assignment' | 'system'
  title: text (not null)
  body: text (not null)
  data: jsonb (not null, default '{}')
  read: boolean (default false)
  created_at: timestamptz (not null, default now)
  occurrence_id: uuid (references occurrences.id, optional)
}
```

#### 11. device_tokens (Tokens de push notification)
```typescript
{
  id: uuid (primary key)
  profile_id: uuid (references profiles.id, on delete cascade, not null)
  token: text (not null)
  platform: text (not null) // 'ios' | 'android' | 'web'
  device_info: jsonb (not null, default '{}')
  active: boolean (default true)
  last_used: timestamptz (not null, default now)
  created_at: timestamptz (not null, default now)
}
```

#### 12. audit_exports (Exportações com hash SHA-256)
```typescript
{
  id: uuid (primary key)
  profile_id: uuid (references profiles.id, not null)
  sha256: text (not null)
  description: text (not null)
  row_count: integer (not null, default 0)
  created_at: timestamptz (not null, default now)
}
```

#### 13. Tabelas de Configuração:
- **sla_rules**: Regras de SLA por categoria
- **fiscal_stats**: Estatísticas de fiscais
- **prefeitura_config**: Configuração da prefeitura
- **acoes_fiscalizacao**: Ações de fiscalização disponíveis
- **tipos_infracao**: Tipos de infração com artigos legais
- **comments**: Comentários em ocorrências

## SISTEMA DE AUTENTICAÇÃO E PERMISSÕES

### Perfis de Usuário:
1. **Cidadão**: Pode reportar ocorrências, ver suas próprias ocorrências, comentar
2. **Fiscal**: Recebe ocorrências atribuídas automaticamente, realiza vistorias offline-first
3. **Gestor Municipal**: Gerencia todas ocorrências, redistribui casos, cria OS, vê dashboards
4. **Auditor/Admin**: Acesso somente-leitura à trilha de auditoria, gerencia usuários, exporta relatórios

### Sistema de Row Level Security (RLS):
- Cada usuário só vê seus próprios dados
- Gestores e auditores veem todos os dados
- Políticas implementadas via SECURITY DEFINER para evitar recursão
- Trilha de auditoria imutável (append-only)

## FUNCIONALIDADES POR PERFIL

### 1. CIDADÃO

#### Tela: Home do Cidadão (`/app/citizen/home`)
- Lista de ocorrências próprias com cards
- Mapa público anonimizado de todas ocorrências
- Badge de "Colaborador Ativo" ao resolver 5+ ocorrências
- Filtro por status e categorias
- SLA timer para cada ocorrência

#### Tela: Nova Ocorrência (`/app/citizen/new-occurrence`)
- Formulário com:
  - Seleção de categoria (9 categorias fixas)
  - Subcategoria dinâmica por categoria
  - Descrição (mínimo 20 caracteres)
  - Captura de GPS com precisão
  - Upload de até 5 fotos (comprimidas no cliente)
  - Bairro (opcional)
- Botão "Analisar com IA" para classificação automática
- Detecção de duplicatas por similaridade textual e geográfica
- Resultado da IA mostra: categoria, subcategoria, urgência, confiança, rationale

#### Funcionalidades:
- Upload de fotos com compressão no cliente
- Geolocalização automática com fallback manual
- Classificação por IA generativa (Gemini/OpenAI) com fallback heurístico
- Detecção de duplicatas com Jaccard similarity
- Notificação push ao criar ocorrência

### 2. FISCAL

#### Tela: Home do Fiscal (`/app/fiscal/home`)
- Dashboard com estatísticas:
  - Ocorrências na fila
  - Ocorrências resolvidas
  - Nota média de avaliação
  - % de cumprimento de SLA
- Lista de ocorrências atribuídas ordenadas por urgência e tempo
- Aviso: "Você não escolhe livremente — o sistema atribui para evitar cherry-picking"
- Seção de ocorrências resolvidas recentemente

#### Tela: Vistoria em Campo (`/app/fiscal/field-inspection`)
- Modo offline-first com indicador de conectividade
- Fila de ocorrências pendentes com sincronização automática
- Processo de vistoria:
  1. Seleção da ocorrência da fila
  2. Registro de chegada (GPS + timestamp obrigatório)
  3. Laudo estruturado em textarea
  4. Seleção de ação tomada (5 opções)
  5. Campos de multa (valor + número do processo) se aplicável
  6. Upload de fotos "depois" (mínimo 1 obrigatório)
- Persistência local quando offline (localStorage)
- Sincronização automática quando conexão volta
- Validações obrigatórias antes de submissão

#### Funcionalidades:
- Atribuição automática de ocorrências (fila equilibrada)
- Geolocalização obrigatória para registro de chegada
- Sistema offline-first com fila local
- Cálculo de SLA e reputação interna
- Notificações de novas atribuições

### 3. GESTOR MUNICIPAL

#### Tela: Dashboard (`/app/gestor/dashboard`)
- KPIs principais:
  - Total de ocorrências
  - Ocorrências resolvidas
  - SLA estourado
  - % de cumprimento de SLA
- Abas:
  1. **Panorama**: Mapa de calor + gráficos por categoria e status
  2. **Fiscais**: Ranking com estatísticas de cada fiscal
  3. **SLA**: Configuração de regras por categoria
  4. **Escalonadas**: Casos travados para redistribuição
  5. **OS e Multas**: Gerenciamento de ordens de serviço

#### Funcionalidades:
- Mapa de calor interativo com Leaflet
- Gráficos com Recharts (bar/pie charts)
- Redistribuição manual de ocorrências
- Configuração de SLA por categoria (em horas)
- Criação de ordens de serviço formais
- Exportação CSV de ocorrências
- Atribuição automática de fiscais a OS

#### Tela: Lista de OS (`/app/gestor/os/list`)
- Lista de todas ordens de serviço
- Filtros por status, origem, data
- Cards com informações resumidas
- Ações: ver detalhe, editar, cancelar

#### Tela: Nova OS (`/app/gestor/os/new`)
- Formulário completo:
  - Número da OS (único)
  - Origem (preventiva/denúncia/ofício/CI/gestão)
  - Denúncia relacionada (opcional)
  - Requerente
  - Gerente responsável
  - Fiscal atribuído (opcional)
  - Apoio operacional (PM/Guarda Municipal/Outro)
  - Descrição do serviço
  - Legislação aplicável (array)
  - Endereço com geolocalização
  - Prazo de resposta
- Geofencing (raio de 200m para início de vistoria)

#### Tela: Detalhe OS (`/app/gestor/os/[id]`)
- Informações completas da OS
- Lista de vistorias realizadas
- Autos de infração vinculados
- Status de pagamento de multas
- Ações: criar vistoria, lavrar auto, cancelar

### 4. AUDITOR/ADMIN

#### Tela: Painel do Auditor (`/app/auditor/panel`)
- Abas:
  1. **Trilha**: Log imutável de mudanças de status
  2. **Usuários**: Gestão de usuários (única ação de escrita permitida)
  3. **OS**: Visualização de ordens de serviço e autos

#### Funcionalidades:
- Trilha de auditoria com:
  - Filtros por status, busca textual
  - Colunas: quando, ocorrência, transição, por, IP, geo, nota
  - Exportação com hash SHA-256 (cadeia de custódia)
  - Histórico de exportações registradas
- Gestão de usuários:
  - Alteração de papel (role)
  - Ativação/desativação de contas
  - Lista com email, papel, bairro, status
- Visualização de OS e autos (somente leitura)

## SISTEMA DE CLASSIFICAÇÃO POR IA

### Arquitetura:
1. **Primário**: LLM OpenAI-compatible (Gemini Flash, OpenAI, Groq)
2. **Fallback**: Classificador heurístico local (nunca falha)

### Classificador Heurístico:
- Keywords por categoria com regex
- Detecção de urgência por palavras-chave (crítico, alto, médio)
- Cálculo de confiança baseado em match de keywords
- Subcategorias por análise de tokens
- Detecção de duplicatas por Jaccard similarity

### Classificador por LLM:
- Timeout de 12 segundos
- JSON estrito com response_format
- System prompt específico para classificação urbana
- Análise de ocorrências próximas para duplicidade
- Suporte a APIs OpenAI-compatible e nativas do Gemini

### Constantes de Classificação:
- 9 categorias fixas (Buraco na via, Poluição sonora, etc.)
- Subcategorias por categoria
- Níveis de urgência: 1-4
- Raio de busca de duplicatas: ~3km
- Período de busca: 30 dias

## SISTEMA OFFLINE-FIRST

### Implementação:
- Persistência local via localStorage (hoje)
- Migração futura para @capacitor/preferences ou SQLite
- Fila de vistorias pendentes
- Sincronização automática quando conexão volta
- Indicador visual de status de conectividade

### Estrutura de PendingInspection:
```typescript
{
  id: string
  occurrence_id: string
  occurrence_snapshot: { category, description, bairro, urgency_score, status }
  arrival_at: string
  arrival_lat: number | null
  arrival_lng: number | null
  report: string
  action_taken: InspectionAction
  fine_amount: string
  fine_process_number: string
  photos: string[] // dataURLs
  created_at: string
}
```

### Fluxo de Sincronização:
1. Usuário submete vistoria offline
2. Dados salvos no localStorage
3. Indicador mostra "vistorias pendentes"
4. Quando online, botão "Sincronizar" aparece
5. Upload de fotos + envio de dados
6. Remoção da fila local após sucesso
7. Retry automático em falhas

## SISTEMA DE NOTIFICAÇÕES

### Tipos de Notificação:
- `occurrence_status`: Mudança de status de ocorrência
- `sla_alert`: Alerta de SLA estourado
- `assignment`: Nova atribuição de ocorrência
- `system`: Mensagens do sistema

### Implementação:
- Tabela notifications com profile_id
- Integração com push notifications (futura)
- Notificações lidas/não lidas
- Centro de notificações por usuário
- Filtros por tipo e data

## TRILHA DE AUDITORIA IMUTÁVEL

### Características:
- Tabela occurrence_status_log append-only
- Trigger que impede UPDATE e DELETE
- Registro de: IP, geolocalização, timestamp, usuário
- Hash SHA-256 para exportações (cadeia de custódia)
- Exportações registradas em audit_exports

### Campos da Trilha:
- occurrence_id
- from_status / to_status
- changed_by (ID do usuário)
- changed_by_name
- changed_at
- ip_address
- geo (lat,lng)
- note (opcional)

## ORDENS DE SERVIÇO E AUTOS DE INFRAÇÃO

### Fluxo de OS:
1. Gestor cria OS via denúncia ou preventiva
2. Define fiscal responsável (opcional)
3. Sistema de geofencing (200m de raio)
4. Fiscal inicia vistoria dentro da área
5. Fiscal pode lavrar auto de infração
6. Sistema calcula multa baseada em reincidência
7. Autuado assina/recusa/é ausente
8. Controle de pagamento da multa

### Cálculo de Reincidência:
- Busca por documento do responsável
- Verifica ocorrências anteriores
- Aplica fator multiplicador (1.5x padrão)
- Registra nível de reincidência
- Vincula à ocorrência original

### Campos do Auto de Infração:
- tipo_infracao_id (referência a tabela de tipos)
- valor_multa (pode ser multiplicado por reincidência)
- motivo da infração
- autuado_nome e documento
- ciencia_status (assinou/recusou/ausente)
- testemunha_nome
- status_pagamento (pendente/pago/cancelado)
- data_vencimento

## SISTEMA DE SLA

### Implementação:
- Tabela sla_rules com regras por categoria
- Trigger apply_sla_deadline ao criar ocorrência
- SLA padrão: 72 horas
- Configurável por categoria (1-720 horas)
- Timer visual nas telas (SLATimer component)

### Cálculo de Cumprimento:
- Tempo real entre criação e resolução
- Comparação com SLA definido
- % de cumprimento por fiscal
- KPIs no dashboard do gestor

## INTERFACE DO USUÁRIO

### Design System:
- Baseado em Radix UI + Tailwind CSS 4
- Tema claro/escuro com next-themes
- Cores semânticas (primary, success, warning, danger)
- Tipografia consistente
- Espaçamentos padronizados
- Mobile-first responsive

### Componentes UI Base:
- Button (variantes: default, outline, ghost, destructive)
- Input, Textarea, Select
- Card, CardHeader, CardContent, CardTitle
- Dialog, Sheet (modal)
- Tabs, TabsList, TabsTrigger, TabsContent
- Table, TableHeader, TableBody, TableRow, TableCell
- Badge, Avatar, Separator
- Switch, Checkbox
- Alert, AlertTitle, AlertDescription
- Tooltip

### Componentes de Negócio:
- OccurrenceCard: Card de ocorrência com informações principais
- MapHeatmap: Mapa de calor com Leaflet
- SLATimer: Timer visual de SLA
- StatCard/KpiCard: Cards de estatísticas
- StatusBadge, UrgencyBadge: Badges coloridos
- EmptyState, LoadingState: Estados de loading/vazio
- SplashScreen: Tela de splash do app

### Telas Principais:
- Layout raiz com AppShell (sidebar + header)
- Layout por perfil (citizen, fiscal, gestor, auditor)
- Tela de login/registro unificada
- Tela de redirecionamento por perfil
- Página 404 customizada

## ROTAS DA API

### Autenticação (`/api/auth`)
- GET: Retorna perfil do usuário logado
- POST:
  - action=login: Login com email/senha
  - action=register: Registro de novo usuário
  - action=logout: Logout

### Ocorrências (`/api/occurrences`)
- GET: Lista ocorrências (filtrado por perfil)
- POST: Cria nova ocorrência
- GET /api/occurrences/[id]: Detalhe de ocorrência
- PATCH /api/occurrences/[id]: Atualiza ocorrência
- Query params:
  - map=1: Retorna pontos para mapa
  - view=overview: Retorna estatísticas
  - view=ranking: Retorna ranking de fiscais
  - logs=1: Retorna trilha de auditoria

### Classificação (`/api/classify`)
- POST: Classifica ocorrência por IA/heurística
- Body: { description, categoryHint?, lat?, lng? }

### Mídia (`/api/media`)
- POST: Upload de foto (com dataURL)
- Body: { dataUrl, kind }
- Retorna: { url }

### Inspeções (`/api/inspections`)
- POST: Cria registro de vistoria
- Body: { occurrence_id, arrival_at, arrival_lat, arrival_lng, report, action_taken, fine_amount?, fine_process_number?, mediaUrls, geo? }

### Ordens de Serviço (`/api/os`)
- GET: Lista OS (com filtros)
- POST: Cria nova OS
- GET /api/os/[id]: Detalhe de OS
- PATCH /api/os/[id]: Atualiza OS
- Query params:
  - autos=1: Inclui autos de infração
  - fiscais=1: Lista fiscais disponíveis

### Notificações (`/api/notifications`)
- GET: Lista notificações do usuário
- POST: Marca notificação como lida

### SLA (`/api/sla`)
- GET: Lista regras de SLA
- PUT: Atualiza regras de SLA

### Admin (`/api/admin`)
- GET: Lista usuários ou exportações
- PATCH: Atualiza usuário (role, ativo)
- POST: Exporta dados com hash SHA-256

### SLA Alerts (`/api/sla-alerts`)
- GET: Lista alertas de SLA
- POST: Cria alerta de SLA

### Recidivas (`/api/recidivas`)
- POST: Calcula reincidência e retorna fator

### Prefeitura (`/api/prefeitura`)
- GET: Configuração da prefeitura
- PUT: Atualiza configuração

## CONFIGURAÇÃO E DEPLOY

### Variáveis de Ambiente:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# IA Generativa (opcional)
SIFAU_LLM_API_KEY=your-api-key
SIFAU_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
SIFAU_LLM_MODEL=gemini-2.0-flash

# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# Storage
SIFAU_ALLOW_LOCAL_DISK_STORAGE=false
SIFAU_MEDIA_BUCKET=sifau-media
```

### Scripts do package.json:
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

### Configuração do Capacitor:
- Wrapper nativo para Android/iOS
- WebView carrega app publicado em servidor
- Requer backend publicado antes de gerar APK
- URL configurável (produção/desenvolvimento)
- Splash screen configurável

### Migrations do Supabase:
- 0001_schema_rls.sql: Schema completo + RLS
- 0002_sessions_notifications_devices.sql: Tabelas adicionais
- Scripts de correção em scripts/

## TESTES E VALIDAÇÃO

### Testes Funcionais:
- Registro de usuário com todos os perfis
- Login/logout com Supabase Auth
- Criação de ocorrência com fotos e GPS
- Classificação por IA e heurística
- Atribuição automática de fiscais
- Vistoria offline-first
- Sincronização de dados offline
- Criação de ordens de serviço
- Lavratura de auto de infração
- Cálculo de reincidência
- Trilha de auditoria imutável
- Exportação com hash SHA-256

### Testes de Permissões:
- RLS funciona corretamente por perfil
- Cidadão só vê suas ocorrências
- Fiscal só vê suas atribuições
- Gestor vê tudo
- Auditor só vê trilha (somente leitura)

### Testes de Performance:
- Compressão de fotos no cliente
- Timeout de IA com fallback
- Fila offline sem bloquear UI
- Mapa de calor com muitos pontos
- Dashboard com gráficos complexos

## MELHORIAS FUTURAS

### Curto Prazo:
- Integração real com push notifications
- Migração para @capacitor/preferences
- Sistema de avaliação de fiscais por cidadãos
- Relatórios PDF mais detalhados
- Integração com sistemas municipais externos

### Médio Prazo:
- App nativo 100% standalone (sem dependência de servidor)
- Offline-first completo (todas as funcionalidades)
- Integração com IoT (sensores urbanos)
- Previsão de demanda por IA
- Gamificação para cidadãos

### Longo Prazo:
- Blockchain para trilha de auditoria
- Reconhecimento de imagem para classificação
- Integração com sistemas estaduais/nacionais
- Dashboard público com transparência
- API aberta para desenvolvedores

## DOCUMENTAÇÃO NECESSÁRIA

### README.md:
- Descrição do projeto
- Configuração rápida
- Fluxo do sistema
- Instruções de deploy

### IA_CONFIGURACAO.md:
- Guia completo de configuração da IA
- Provedores suportados (Gemini, OpenAI, Groq)
- Testes de configuração
- Troubleshooting

### SOLUCAO_PROBLEMAS.md:
- Solução de problemas comuns
- Correção de permissões RLS
- Troubleshooting de banco de dados

### deploy.md:
- Instruções detalhadas de deploy
- Configuração de Vercel/Railway
- Geração de APK com Capacitor
- Configuração de domínio e SSL

## REQUISITOS DE SEGURANÇA

### Autenticação:
- Supabase Auth com cookies httpOnly
- Sessões gerenciadas pelo servidor
- Refresh tokens automáticos
- Proteção contra CSRF

### Autorização:
- Row Level Security (RLS) em todas as tabelas
- Políticas por perfil de usuário
- Funções SECURITY DEFINER para evitar recursão
- Validação de permissões em todas as rotas

### Dados:
- Criptografia em repouso (Supabase)
- Criptografia em trânsito (HTTPS)
- Anonimização de dados sensíveis
- Conformidade com LGPD

### Auditoria:
- Trilha imutável de todas ações
- Hash SHA-256 para exportações
- Registro de IP e geolocalização
- Cadeia de custódia documentada

## CONSIDERAÇÕES DE PERFORMANCE

### Frontend:
- Code splitting por rota
- Lazy loading de componentes
- Otimização de imagens
- Cache de dados com SWR/React Query
- Virtual scrolling para listas longas

### Backend:
- Índices no banco de dados
- Query otimizadas com joins
- Cache de classificações
- Paginação em listas
- Compressão de respostas

### Mobile:
- Service Worker para PWA
- Cache de recursos estáticos
- Compressão de imagens no cliente
- Geolocalização otimizada
- Background sync para offline

## PADRÕES DE CÓDIGO

### TypeScript:
- Strict mode habilitado
- Tipagem explícita em todos os lugares
- Interfaces para contratos de dados
- Enums para constantes
- Generics para reutilização

### React:
- Functional components com hooks
- Custom hooks para lógica compartilhada
- Context API para estado global
- Error boundaries para tratamento de erros
- Suspense para loading states

### Estilo:
- Tailwind CSS para estilização
- Componentes Radix UI para acessibilidade
- Tema consistente com CSS variables
- Responsivo mobile-first
- Dark mode suportado

### Backend:
- Rotas da API com Next.js
- Drizzle ORM para banco de dados
- Validação com Zod
- Tratamento de erros consistente
- Logging estruturado

## CONCLUSÃO

Este prompt descreve um sistema municipal completo e complexo que deve ser implementado seguindo exatamente as especificações acima. O sistema deve ser funcional, seguro, performático e escalável, com todas as funcionalidades descritas implementadas e testadas.

O sucesso do projeto depende da atenção aos detalhes, especialmente:
- Sistema de permissões RLS correto
- Classificação por IA com fallback robusto
- Sistema offline-first funcional
- Trilha de auditoria verdadeiramente imutável
- Interface responsiva e acessível
- Código bem estruturado e documentado

Comece pela configuração do projeto, depois implemente o modelo de dados, seguido pela autenticação, e depois pelas funcionalidades por perfil de usuário. Teste cada módulo completamente antes de avançar para o próximo.
