# Guia de Deploy - SIFAU

Este guia irá orientá-lo através do processo completo de deploy do projeto SIFAU, incluindo a aplicação web e o APK Android.

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Vercel (para deploy web)
- Conta no PostgreSQL (Supabase recomendado para produção)
- Conta no GitHub (opcional, para distribuição do APK)
- **Para APK Android**: Android Studio OU Gradle CLI OU GitHub Actions (veja opções na seção 2.5)

> **Nota para Chromebooks**: Se você não pode instalar Android Studio, use a **Opção C (GitHub Actions)** na seção 2.5 para compilar o APK remotamente sem precisar instalar nada localmente.

---

## 1. Deploy da Aplicação Web (Vercel)

### 1.1 Preparar o Banco de Dados de Produção

**Opção A: Supabase (Recomendado)**

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No painel do Supabase, vá em Settings > Database
3. Copie a **Connection String** (use o formato URI)
4. A connection string deve estar neste formato:
   ```
   postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres
   ```

**Opção B: PostgreSQL Tradicional**

- Use qualquer provedor PostgreSQL (Railway, Render, AWS RDS, etc.)
- Obtenha a connection string no formato URI

### 1.2 Configurar Variáveis de Ambiente no Vercel

1. Instale a CLI do Vercel:
   ```bash
   npm install -g vercel
   ```

2. Faça login no Vercel:
   ```bash
   vercel login
   ```

3. Configure as variáveis de ambiente:
   ```bash
   cd app-src
   vercel env add DATABASE_URL production
   # Cole a connection string do PostgreSQL
   
   vercel env add SIFAU_LLM_API_KEY production
   # Cole sua chave de API (opcional - app funciona sem ela)
   
   vercel env add SIFAU_LLM_BASE_URL production
   # Valor padrão: https://generativelanguage.googleapis.com/v1beta/openai
   
   vercel env add SIFAU_LLM_MODEL production
   # Valor padrão: gemini-2.0-flash
   ```

### 1.3 Deploy no Vercel

1. Execute o deploy de produção:
   ```bash
   cd app-src
   vercel --prod
   ```

2. Anote a URL gerada (ex: `https://sifau-xyz.vercel.app`)

3. Configure o banco de dados:
   ```bash
   # Execute as migrações do banco
   npx drizzle-kit push
   ```

4. (Opcional) Seed de dados de teste:
   ```bash
   npx tsx scripts/seed.ts
   ```

### 1.4 Configurar Upload de Arquivos

⚠️ **Importante**: O upload de arquivos atualmente usa armazenamento local, que não funciona em ambientes serverless como Vercel. Para produção, você precisa configurar um storage durável:

**Opção A: Supabase Storage**

1. No painel do Supabase, crie um bucket chamado `ocorrencias`
2. Configure as políticas de acesso do bucket
3. Modifique `src/app/api/media/route.ts` para usar Supabase Storage

**Opção B: Vercel Blob**

1. Instale o SDK: `npm install @vercel/blob`
2. Configure as variáveis de ambiente do Vercel Blob
3. Modifique `src/app/api/media/route.ts` para usar Vercel Blob

---

## 2. Gerar APK Android com Capacitor

### 2.1 Preparar o Projeto

1. Verifique se o app web está publicado e funcionando
2. Edite `app-src/capacitor.config.ts`:
   ```typescript
   const PROD_URL = "https://SUA-URL-VERCEL.vercel.app"; // Substitua pela sua URL
   ```

### 2.2 Adicionar Plataforma Android

```bash
cd app-src
npx cap add android
```

### 2.3 Sincronizar Configuração

```bash
npx cap sync android
```

### 2.4 Configurar Permissões Android

Edite `android/app/src/main/AndroidManifest.xml` e adicione:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="28" />
```

### 2.5 Compilar o APK

**Opção A: Via Gradle CLI (Sem Android Studio)**

Esta opção só requer o JDK e o SDK do Android, não o Android Studio completo:

```bash
cd android
./gradlew assembleDebug          # APK de debug
./gradlew assembleRelease        # APK de release (requer assinatura)
```

**Opção B: Via Android Studio**

```bash
npx cap open android
```

No Android Studio:
- Build > Build App Bundle(s) / APK(s) > Build APK(s)
- O APK será gerado em `android/app/build/outputs/apk/`

**Opção C: Via GitHub Actions (Build Remoto - Recomendado para Chromebooks)**

Se você não pode instalar ferramentas localmente, use o GitHub Actions para compilar o APK remotamente:

1. Crie o arquivo `.github/workflows/build-apk.yml`:
   ```yaml
   name: Build Android APK

   on:
     workflow_dispatch:
     push:
       tags:
         - 'v*'

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
         - name: Setup Java
           uses: actions/setup-java@v3
           with:
             distribution: 'temurin'
             java-version: '17'
         - name: Install dependencies
           run: |
             cd app-src
             npm install
         - name: Build Android APK
           run: |
             cd app-src
             npx cap sync android
             cd android
             ./gradlew assembleDebug
         - name: Upload APK
           uses: actions/upload-artifact@v3
           with:
             name: app-debug
             path: app-src/android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. Faça commit e push do arquivo
3. No GitHub, vá em Actions > "Build Android APK" > "Run workflow"
4. O APK será gerado automaticamente e disponível para download

**Opção D: Serviços Online de Build**

Existem serviços online que geram APKs sem instalação local:
- **Appcircle**: Build gratuito para projetos open source
- **Bitrise**: CI/CD com suporte a Android
- **Codemagic**: Build automático para projetos Capacitor

### 2.6 Testar Antes de Publicar

Para testar localmente com emulador:

1. Rode `npm run dev` na sua máquina
2. Temporariamente, edite `capacitor.config.ts`:
   ```typescript
   const PROD_URL = "http://10.0.2.2:3000"; // Alias do emulador para localhost
   ```
3. Habilite `cleartext: true` temporariamente
4. Gere o APK e teste no emulador
5. **Importante**: Reverta para HTTPS e `cleartext: false` antes do deploy final

---

## 3. Distribuir o APK

### 3.1 Via GitHub Releases (Recomendado)

1. Faça commit e push do código:
   ```bash
   git add -A
   git commit -m "SIFAU v1.0.0 - Release de produção"
   git push origin main
   ```

2. Crie uma tag de versão:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. Crie o release com o APK:
   ```bash
   gh release create v1.0.0 "android/app/build/outputs/apk/debug/app-debug.apk" \
     --title "SIFAU v1.0.0" \
     --notes "APK Android do SIFAU — Sistema de Fiscalização e Atendimento Urbano"
   ```

### 3.2 Via Download Direto

- Compartilhe o arquivo APK diretamente com os usuários
- Instrua-os a habilitar "Instalação de apps de fontes desconhecidas" nas configurações do Android

---

## 4. Checklist de Produção

Antes de considerar o deploy completo, verifique:

- [ ] Banco de dados PostgreSQL configurado e acessível
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Upload de arquivos configurado com storage durável
- [ ] Aplicação web publicada e testada no Vercel
- [ ] `capacitor.config.ts` apontando para a URL correta
- [ ] APK gerado e testado em dispositivo real
- [ ] Permissões Android configuradas corretamente
- [ ] `cleartext: false` no `capacitor.config.ts` (produção)
- [ ] Backup do banco de dados configurado
- [ ] Monitoramento e logs configurados (opcional)

---

## 5. Monitoramento e Manutenção

### 5.1 Logs do Vercel

```bash
vercel logs
```

### 5.2 Backup do Banco de Dados

**Supabase:**
- Configure backups automáticos no painel do Supabase
- Exporte manualmente: Database > Backups > Export

**PostgreSQL tradicional:**
- Configure backups automáticos via cron job
- Use `pg_dump` para backups manuais

### 5.3 Atualizações

**Para atualizar a aplicação web:**
```bash
cd app-src
git pull
npm install
npm run build
vercel --prod
```

**Para atualizar o APK:**
1. Atualize o código
2. Deploy web atualizado
3. Gere novo APK
4. Crie novo release no GitHub

---

## 6. Solução de Problemas

### Aplicação não carrega no APK

- Verifique se `PROD_URL` está correta em `capacitor.config.ts`
- Confirme que a URL está acessível via HTTPS
- Verifique os logs do Android Studio

### Upload de arquivos falha

- Verifique se o storage durável está configurado
- Confirme as variáveis de ambiente do storage
- Verifique os logs do Vercel

### Erros de conexão com banco

- Verifique a `DATABASE_URL` no Vercel
- Confirme que o banco permite conexões externas
- Verifique as regras de firewall do provedor

---

## 7. Contato e Suporte

Para problemas específicos do deploy:
- Verifique os logs do Vercel: `vercel logs`
- Consulte a documentação do [Capacitor](https://capacitorjs.com/docs)
- Consulte a documentação do [Vercel](https://vercel.com/docs)

Para questões sobre o código do projeto:
- Consulte o README principal em `app-src/README.md`
- Revise a documentação inline no código fonte
