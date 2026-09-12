# SIFAU - Sistema Municipal de Fiscalização e Atendimento Urbano

Sistema completo para gestão municipal que conecta cidadãos, fiscais, gestores e auditores em uma plataforma unificada com funcionalidades avançadas de geolocalização, classificação por IA, ordens de serviço formais e trilha de auditoria imutável.

## 🚀 Características Principais

### Para Cidadãos
- Reporte de problemas urbanos com fotos e geolocalização
- Classificação automática por IA generativa
- Acompanhamento em tempo real do status das ocorrências
- Mapa público anonimizado de problemas na cidade

### Para Fiscais
- Atribuição automática de ocorrências (evita cherry-picking)
- Sistema offline-first para vistorias em campo
- Registro de chegada com GPS obrigatório
- Sistema de filas para sincronização quando online

### Para Gestores Municipais
- Dashboard completo com KPIs e analytics
- Gestão de ordens de serviço formais
- Configuração de SLA por categoria
- Redistribuição manual de casos
- Ranking de desempenho de fiscais

### Para Auditores
- Trilha de auditoria imutável
- Exportações com hash SHA-256 (cadeia de custódia)
- Gestão de usuários e permissões
- Visualização somente-leitura de todo o sistema

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16+ com App Router
- **Linguagem**: TypeScript (strict mode)
- **Banco de Dados**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Autenticação**: Supabase Auth com cookies httpOnly
- **UI Framework**: React 19
- **Componentes UI**: Radix UI + Tailwind CSS 4
- **Gráficos**: Recharts
- **Mapas**: Leaflet + React Leaflet
- **Forms**: React Hook Form + Zod
- **Notificações**: Sonner (toast)
- **PDF**: jsPDF
- **Mobile**: Capacitor 8+ (wrapper nativo)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- (Opcional) Chave de API para IA (Gemini, OpenAI, Groq)

## 🔧 Configuração Rápida

### 1. Clone o repositório

```bash
git clone <repository-url>
cd sifau-app
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

Crie um projeto no [Supabase](https://supabase.com) e execute a migration:

```bash
# Execute a migration no painel do Supabase ou via CLI
# O arquivo está em: supabase/migrations/0001_schema_rls.sql
```

### 4. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha as variáveis:

```env
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

### 5. Execute o servidor de desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador.

## 📁 Estrutura do Projeto

```
app-src/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # Rotas da API server-side
│   │   ├── citizen/           # Telas do cidadão
│   │   ├── fiscal/            # Telas do fiscal
│   │   ├── gestor/            # Telas do gestor
│   │   ├── auditor/           # Telas do auditor
│   │   ├── auth/              # Telas de autenticação
│   │   └── layout.tsx         # Layout raiz
│   ├── components/            # Componentes reutilizáveis
│   │   ├── ui/               # Componentes UI base (Radix UI)
│   │   └── *.tsx             # Componentes de negócio
│   ├── screens/              # Telas por perfil de usuário
│   ├── lib/                  # Bibliotecas e utilitários
│   ├── services/             # Serviços externos
│   └── db/                   # Configuração do banco (Drizzle)
├── supabase/
│   └── migrations/           # Migrations SQL do Supabase
├── scripts/                 # Scripts de manutenção
└── public/                  # Arquivos estáticos
```

## 👥 Perfis de Usuário

### Cidadão
- Reporta ocorrências urbanas
- Acompanha status de suas denúncias
- Visualiza mapa público de problemas

### Fiscal
- Recebe atribuições automáticas
- Realiza vistorias offline-first
- Registra ações tomadas no campo

### Gestor Municipal
- Gerencia todas ocorrências
- Configura SLA por categoria
- Cria ordens de serviço formais
- Visualiza dashboards e relatórios

### Auditor/Admin
- Acesso à trilha de auditoria imutável
- Gerencia usuários e permissões
- Exporta dados com hash SHA-256

## 🔐 Segurança

- **Autenticação**: Supabase Auth com cookies httpOnly
- **Autorização**: Row Level Security (RLS) em todas as tabelas
- **Auditoria**: Trilha imutável de todas as ações
- **Dados**: Criptografia em repouso e em trânsito
- **Cadeia de Custódia**: Hash SHA-256 para exportações

## 🧪 Testes

```bash
# Executar testes
npm test

# Verificar tipos
npm run typecheck

# Lint
npm run lint
```

## 📱 Deploy

### Vercel

```bash
npm run build
vercel deploy
```

### Capacitor (Mobile)

```bash
npm run build
npx cap sync
npx cap open android
npx cap open ios
```

Consulte [deploy.md](deploy.md) para instruções detalhadas.

## 📖 Documentação Adicional

- [IA_CONFIGURACAO.md](IA_CONFIGURACAO.md) - Guia de configuração da IA
- [SOLUCAO_PROBLEMAS.md](SOLUCAO_PROBLEMAS.md) - Solução de problemas
- [deploy.md](deploy.md) - Instruções de deploy

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença municipal. Consulte os termos de uso específicos da sua prefeitura.

## 🆘 Suporte

Para suporte, envie um email para suporte@sifau.municipio.gov.br ou abra uma issue no repositório.

---

Desenvolvido com ❤️ para melhorar a gestão urbana municipal
