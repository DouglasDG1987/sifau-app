# Deploy - SIFAU

Este guia cobre o deploy do SIFAU em diferentes plataformas.

## Deploy no Vercel (Recomendado)

### Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Projeto configurado no Supabase
- Variáveis de ambiente configuradas

### Passos

1. **Instale a CLI do Vercel**
```bash
npm install -g vercel
```

2. **Login no Vercel**
```bash
vercel login
```

3. **Configure as variáveis de ambiente**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SIFAU_LLM_API_KEY
vercel env add DATABASE_URL
```

4. **Deploy**
```bash
vercel
```

5. **Configure domínio personalizado (opcional)**
```bash
vercel domains add sifau.sua-prefeitura.gov.br
```

### Configuração de Produção

No painel do Vercel:
1. Vá em Settings > Environment Variables
2. Adicione todas as variáveis do `.env.local`
3. Configure o domínio customizado
4. Ative SSL automático

### Deploy Automático (Git)

Conecte seu repositório ao Vercel:
1. Vá em "Import Project" no Vercel
2. Conecte seu repositório (GitHub, GitLab, Bitbucket)
3. Configure as variáveis de ambiente
4. O deploy será automático a cada push

## Deploy no Railway

### Pré-requisitos

- Conta no [Railway](https://railway.app)
- Projeto configurado no Supabase

### Passos

1. **Crie um novo projeto**
```bash
railway init
```

2. **Configure as variáveis**
```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL=your-url
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
# ... outras variáveis
```

3. **Deploy**
```bash
railway up
```

## Deploy em Servidor Próprio

### Usando Docker

1. **Crie o Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Build e run**
```bash
docker build -t sifau .
docker run -p 3000:3000 --env-file .env.local sifau
```

### Usando PM2

1. **Instale PM2**
```bash
npm install -g pm2
```

2. **Build**
```bash
npm run build
```

3. **Start com PM2**
```bash
pm2 start npm --name "sifau" -- start
pm2 save
pm2 startup
```

## Deploy Mobile com Capacitor

### Pré-requisitos

- Android Studio (para Android)
- Xcode (para iOS)
- Projeto web já deployed

### Configuração

1. **Inicialize o Capacitor**
```bash
npm install -D @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init
```

2. **Configure o capacitor.config.json**
```json
{
  "appId": "com.sifau.app",
  "appName": "SIFAU",
  "webDir": "out",
  "server": {
    "url": "https://sifau.sua-prefeitura.gov.br",
    "cleartext": true
  }
}
```

3. **Build do projeto web**
```bash
npm run build
```

4. **Sincronize com plataformas nativas**
```bash
npx cap sync android
npx cap sync ios
```

### Android

1. **Abra o projeto**
```bash
npx cap open android
```

2. **Configure permissões no AndroidManifest.xml**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```

3. **Build do APK**
```bash
cd android
./gradlew assembleDebug
```

4. **Build do APK de produção**
```bash
./gradlew assembleRelease
```

### iOS

1. **Abra o projeto**
```bash
npx cap open ios
```

2. **Configure permissões no Info.plist**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Precisamos de sua localização para registrar vistorias</string>
<key>NSCameraUsageDescription</key>
<string>Precisamos da câmera para adicionar fotos às ocorrências</string>
```

3. **Build**
```bash
cd ios
pod install
```

4. **Abra no Xcode e build**
- Selecione o target
- Clique em Product > Archive
- Siga o processo de distribuição

## Configuração de Domínio e SSL

### Vercel

SSL é automático no Vercel. Configure o domínio no painel.

### Servidor Próprio

1. **Use Nginx como proxy**
```nginx
server {
    listen 80;
    server_name sifau.sua-prefeitura.gov.br;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. **Configure SSL com Let's Encrypt**
```bash
sudo certbot --nginx -d sifau.sua-prefeitura.gov.br
```

## Monitoramento e Logs

### Vercel

- Logs disponíveis no painel
- Métricas de performance automáticas
- Alertas configuráveis

### Servidor Próprio

1. **Use PM2 Plus para monitoramento**
```bash
pm2 plus
```

2. **Configure log rotation**
```bash
pm2 install pm2-logrotate
```

3. **Use Nginx logs**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Backup e Restore

### Supabase

O Supabase faz backup automático, mas você pode:

1. **Backup manual**
```bash
supabase db dump -f backup.sql
```

2. **Restore**
```bash
supabase db reset -f backup.sql
```

### Banco de Dados Próprio

1. **Backup com pg_dump**
```bash
pg_dump -U postgres -d sifau_db > backup.sql
```

2. **Restore**
```bash
psql -U postgres -d sifau_db < backup.sql
```

## Atualizações

### Vercel

Automático com git push ou:
```bash
vercel --prod
```

### Servidor Próprio

1. **Pull das mudanças**
```bash
git pull origin main
```

2. **Instale dependências**
```bash
npm install
```

3. **Build**
```bash
npm run build
```

4. **Restart**
```bash
pm2 restart sifau
```

## Escalabilidade

### Vercel

- Escalamento automático
- Edge functions global
- No configuração necessária

### Servidor Próprio

1. **Use load balancer (Nginx)**
2. **Configure múltiplas instâncias com PM2 cluster**
```bash
pm2 start npm --name "sifau" -i max -- start
```
3. **Use Redis para cache/sessões**

## Segurança em Produção

### Variáveis de Ambiente

- Nunca commitar `.env.local`
- Usar secrets do serviço de deploy
- Rotacionar chaves regularmente

### Headers de Segurança

Adicione ao `next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

### Rate Limiting

Implemente rate limiting na API:
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

## Troubleshooting de Deploy

### Build falha no Vercel

1. Verifique os logs de build
2. Verifique se todas as dependências estão instaladas
3. Verifique se TypeScript não tem erros

### Aplicação não roda após deploy

1. Verifique as variáveis de ambiente
2. Verifique a conexão com o banco
3. Verifique os logs do servidor

### Mobile app não conecta

1. Verifique a URL no capacitor.config.json
2. Verifique se o servidor web está acessível
3. Verifique as permissões de rede

---

Última atualização: 2026-09-12
