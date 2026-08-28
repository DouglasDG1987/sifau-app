// ============================================================
// SIFAU — Configuração do Capacitor (APK Android)
// ------------------------------------------------------------
// ⚠️ LEIA ANTES DE GERAR O APK:
// Este projeto é um app Next.js com rotas de API server-side
// (src/app/api/*) que fazem consultas diretas ao Postgres via
// Drizzle, autenticação por cookie httpOnly e sessão no banco.
// Isso NÃO é um SPA estático — `next build` com `output: 'export'`
// quebra o app inteiro, porque remove as rotas /api/* das quais
// TODAS as telas dependem (login, ocorrências, vistorias, etc.).
//
// Por isso o Capacitor aqui funciona como um "wrapper nativo":
// o WebView carrega o app já publicado num servidor real (ex.:
// Vercel, Railway, um VPS), em vez de arquivos estáticos embutidos
// no APK. Isso é um padrão válido e comum (ex.: apps que são
// essencialmente PWAs "nativizados"), mas tem duas implicações
// importantes:
//   1. O app exige conexão com a internet para tudo, exceto o
//      envio de vistorias em campo, que já tem fila offline própria
//      (src/services/offline.ts) e sincroniza quando a rede volta.
//   2. Você precisa publicar o backend Next.js em uma URL pública
//      com HTTPS antes de gerar o APK — o app não roda "sozinho".
//
// Se no futuro você quiser um app 100% standalone (funciona sem
// nenhuma rede, exceto para sincronizar), a alternativa é reescrever
// o front-end como SPA (Vite) que fala com o Postgres/Supabase via
// SDK client-side, no lugar de rotas /api do Next — mais trabalho,
// mas o único caminho para um app verdadeiramente offline-first.
//
// USO (com backend já publicado):
//   1. Ajuste PROD_URL abaixo para a URL pública do seu deploy.
//   2. npx cap add android
//   3. npx cap sync android
//   4. npx cap open android  (build final via Android Studio/Gradle)
//
// USO em desenvolvimento local (emulador Android + `next dev` na máquina):
//   Troque a url abaixo por "http://10.0.2.2:3000" (10.0.2.2 é o
//   alias do emulador para o localhost da máquina host) e habilite
//   `cleartext: true` temporariamente — nunca em produção.
// ============================================================
import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL = "https://SEU-PROJETO-VERCEL.vercel.app"; // Substitua pela URL do seu deploy no Vercel

const config: CapacitorConfig = {
  appId: "com.sifau.app",
  appName: "SIFAU",
  webDir: "public", // pasta neutra: o conteúdo real vem de `server.url`, não daqui
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      launchAutoHide: false,
    },
  },
  server: {
    androidScheme: "https",
    url: PROD_URL,
    cleartext: false, // sempre false em produção
  },
};

export default config;
