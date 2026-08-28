// ============================================================
// SIFAU — Edge Function: classificação de ocorrências
// Deploy: supabase functions deploy classify-occurrence
// Env:    SIFAU_LLM_API_KEY (opcional — sem chave usa heurística local)
// ============================================================
import { corsHeaders } from "../_shared/cors.ts";

const CATEGORIES = [
  "Buraco na via",
  "Poluição sonora",
  "Comércio irregular",
  "Descarte irregular de lixo",
  "Obra sem alvará",
  "Iluminação pública",
  "Sinalização",
  "Esgoto / Drenagem",
  "Outro",
];

const SUBCATEGORIES: Record<string, string[]> = {
  "Buraco na via": ["Via local", "Avenida", "Rodovia", "Trecho de obra"],
  "Poluição sonora": ["Estabelecimento", "Obra", "Evento", "Veículo"],
  "Comércio irregular": ["Sem alvará", "Ambulante", "Produto irregular", "Ocupação de calçada"],
  "Descarte irregular de lixo": ["Entulho", "Resíduo orgânico", "Eletrônico", "Volume grande"],
  "Obra sem alvará": ["Residencial", "Comercial", "Reforma", "Demolição"],
  "Iluminação pública": ["Lâmpada queimada", "Poste danificado", "Fiação exposta", "Sem iluminação"],
  Sinalização: ["Placa danificada", "Faixa apagada", "Semáforo", "Pintura de solo"],
  "Esgoto / Drenagem": ["Vazamento", "Entupimento", "Alagamento", "Esgoto a céu aberto"],
  Outro: ["Não especificado"],
};

const KEYWORDS: [RegExp, string][] = [
  [/buraco|cratera|asfalto/, "Buraco na via"],
  [/barulho|ru[ií]do|som alto|m[uú]sica alta/, "Poluição sonora"],
  [/com[eé]rcio|ambulante|vendedor|alvar[aá]/, "Comércio irregular"],
  [/lixo|entulho|descarte|res[ií]duo/, "Descarte irregular de lixo"],
  [/obra|constru[cç][aã]o|reforma|demoli[cç][aã]o/, "Obra sem alvará"],
  [/ilumina[cç][aã]o|l[âa]mpada|poste|fia[cç][aã]o/, "Iluminação pública"],
  [/placa|sinaliza[cç][aã]o|sem[aá]foro|faixa/, "Sinalização"],
  [/esgoto|drenagem|alagamento|entupimento|vazamento/, "Esgoto / Drenagem"],
];

function heuristic(description: string): {
  category: string;
  subcategory: string | null;
  urgency: number;
  confidence: number;
  duplicate_suspected: boolean;
  duplicate_of: string | null;
  rationale: string;
  source: string;
} {
  const text = description.toLowerCase();
  let category = "Outro";
  for (const [re, cat] of KEYWORDS) {
    if (re.test(text)) {
      category = cat;
      break;
    }
  }
  let urgency = 2;
  if (/risco|perigo|acidente|choque|fia[cç][aã]o exposta|escola|crian[cç]a/.test(text)) urgency = 4;
  else if (/alagamento|entupimento|vazamento|barulho|madrugada|esgoto a c[eé]u aberto/.test(text)) urgency = 3;
  return {
    category,
    subcategory: SUBCATEGORIES[category]?.[0] ?? null,
    urgency,
    confidence: 0.7,
    duplicate_suspected: false,
    duplicate_of: null,
    rationale: "Classificação heurística local (LLM indisponível ou sem chave configurada).",
    source: "heuristica",
  };
}

async function withLLM(description: string, nearby: unknown[]): Promise<unknown | null> {
  const apiKey = Deno.env.get("SIFAU_LLM_API_KEY");
  if (!apiKey) return null;
  const base = Deno.env.get("SIFAU_LLM_BASE_URL") ?? "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = Deno.env.get("SIFAU_LLM_MODEL") ?? "gemini-2.0-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "Você classifica ocorrências urbanas do SIFAU. Responda APENAS JSON: " +
              '{"category","subcategory","urgency"(1-4),"confidence"(0-1),"duplicate_suspected","duplicate_of","rationale"}. ' +
              `Categorias: ${CATEGORIES.join(", ")}.`,
          },
          {
            role: "user",
            content: `Descrição: "${description}"\nOcorrências próximas: ${JSON.stringify(nearby)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return { ...JSON.parse(content), source: "ia" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { description, nearby = [] } = await req.json();
    if (!description || String(description).trim().length < 20) {
      return new Response(JSON.stringify({ error: "Descrição muito curta (mín. 20 caracteres)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // IA primeiro; heurística como fallback — a função nunca falha
    const result = (await withLLM(String(description), nearby)) ?? heuristic(String(description));
    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
