# Configuração da IA Generativa - SIFAU

Este guia explica como configurar e usar o sistema de classificação por IA generativa no SIFAU.

## Visão Geral

O SIFAU possui um sistema de classificação híbrido:
1. **Primário**: LLM OpenAI-compatible (Gemini Flash, OpenAI, Groq)
2. **Fallback**: Classificador heurístico local (nunca falha)

## Provedores Suportados

### 1. Google Gemini (Recomendado)

```env
SIFAU_LLM_API_KEY=your-gemini-api-key
SIFAU_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
SIFAU_LLM_MODEL=gemini-2.0-flash
```

**Como obter a chave:**
1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crie um novo projeto ou selecione um existente
3. Gere uma API key
4. Copie para o arquivo `.env.local`

**Vantagens:**
- Modelo rápido e eficiente (Flash)
- Custo acessível
- Timeout configurável
- Suporte a JSON estrito

### 2. OpenAI

```env
SIFAU_LLM_API_KEY=your-openai-api-key
SIFAU_LLM_BASE_URL=https://api.openai.com/v1
SIFAU_LLM_MODEL=gpt-4o-mini
```

**Como obter a chave:**
1. Acesse [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crie uma nova API key
3. Copie para o arquivo `.env.local`

**Vantagens:**
- Modelos de alta qualidade
- Documentação extensa
- Comunidade ativa

### 3. Groq

```env
SIFAU_LLM_API_KEY=your-groq-api-key
SIFAU_LLM_BASE_URL=https://api.groq.com/openai/v1
SIFAU_LLM_MODEL=llama-3.3-70b-versatile
```

**Como obter a chave:**
1. Acesse [Groq Console](https://console.groq.com/keys)
2. Crie uma nova API key
3. Copie para o arquivo `.env.local`

**Vantagens:**
- Modelos open-source muito rápidos
- Custo muito baixo
- Latência extremamente baixa

## Configuração

### Variáveis de Ambiente

```env
# Obrigatório para usar IA
SIFAU_LLM_API_KEY=your-api-key

# URL base da API (padrão: OpenAI)
SIFAU_LLM_BASE_URL=https://api.openai.com/v1

# Modelo a ser usado
SIFAU_LLM_MODEL=gpt-4o-mini
```

### Testando a Configuração

Crie um script de teste:

```typescript
// scripts/test-ai.ts
async function testAI() {
  const response = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Buraco grande na rua principal',
    }),
  });

  const data = await response.json();
  console.log('Resultado:', data);
}

testAI();
```

Execute com:
```bash
npx tsx scripts/test-ai.ts
```

## Classificador Heurístico (Fallback)

O classificador heurístico é ativado automaticamente quando:
- Não há chave de API configurada
- A API de IA falha (timeout, erro, etc.)
- A resposta da IA é inválida

### Como Funciona

O classificador heurístico usa:
- **Keywords por categoria**: Lista de palavras-chave para cada categoria
- **Detecção de urgência**: Palavras-chave específicas para níveis de urgência
- **Cálculo de confiança**: Baseado no número de matches de keywords
- **Subcategorias**: Análise de tokens na descrição

### Categories e Keywords

As categorias e keywords estão definidas em `src/app/api/classify/route.ts`:

```typescript
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Buraco na via': ['buraco', 'furo', 'solo', 'asfalto', ...],
  'Poluição sonora': ['barulho', 'ruído', 'som', 'alto', ...],
  // ... outras categorias
};
```

### Personalizando o Classificador

Para adicionar novas categorias ou keywords:

1. Edite `src/app/api/classify/route.ts`
2. Adicione a categoria ao array `CATEGORIES`
3. Adicione keywords ao objeto `CATEGORY_KEYWORDS`
4. Adicione subcategorias ao objeto `SUBCATEGORIES`

## Troubleshooting

### Erro: "No LLM API key configured"

**Solução**: Configure a variável `SIFAU_LLM_API_KEY` no `.env.local`

### Erro: "LLM API error: 401"

**Solução**: Verifique se a API key está correta e ativa

### Erro: "LLM API error: 429"

**Solução**: Você atingiu o limite de taxa da API. Aguarde ou use outro provedor

### Timeout da IA

**Solução**: O sistema tem timeout de 12 segundos. Se a IA demorar mais, o fallback heurístico é ativado automaticamente

### Classificação incorreta

**Solução**: 
1. Verifique se a descrição tem detalhes suficientes
2. Ajuste as keywords no classificador heurístico
3. Use o hint de categoria ao criar ocorrência

## Monitoramento

### Logs de Classificação

O sistema loga automaticamente:
- Método usado (LLM ou heurístico)
- Confiança da classificação
- Tempo de resposta
- Erros (se houver)

### Métricas

Você pode monitorar:
- Taxa de uso do LLM vs heurístico
- Confiança média das classificações
- Tempo médio de resposta
- Erros por provedor

## Melhores Práticas

1. **Sempre forneça contexto**: Descrições detalhadas melhoram a classificação
2. **Use hints de categoria**: Ajuda a IA a focar na categoria correta
3. **Configure timeout apropriado**: 12 segundos é um bom equilíbrio
4. **Monitore custos**: Diferentes provedores têm custos diferentes
5. **Teste regularmente**: Verifique se a classificação está funcionando como esperado

## Migração entre Provedores

Para mudar de provedor:

1. Atualize as variáveis de ambiente
2. Teste com o script de teste
3. Monitore os resultados por alguns dias
4. Ajuste o prompt se necessário

## Custo Estimado

Com base em uso médio:
- **Gemini Flash**: ~$0.50 por 1000 classificações
- **OpenAI GPT-4o-mini**: ~$0.15 por 1000 classificações
- **Groq Llama**: ~$0.05 por 1000 classificações

O fallback heurístico é gratuito.

## Suporte

Para problemas com configuração de IA:
1. Verifique este documento
2. Consulte `SOLUCAO_PROBLEMAS.md`
3. Abra uma issue no repositório

---

Última atualização: 2026-09-12
