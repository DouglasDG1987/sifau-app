// ============================================================
// SIFAU — Classificador de ocorrências
// 1) Tenta LLM (OpenAI-compatible; ex.: Gemini Flash) com JSON estrito.
// 2) Fallback heurístico local por palavras-chave + similaridade textual.
// O app NUNCA trava se a IA estiver indisponível.
// ============================================================
import type {
  AIClassificationResult,
  UrgencyLevel,
} from "@/lib/types";
import { CATEGORIES, SUBCATEGORIES, DUPLICATE_SEARCH_RADIUS_DEG } from "@/lib/types";

interface NearbyOccurrence {
  id: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
}

const LLM_TIMEOUT_MS = 12000;

function normalizeTokens(text: string): Set<string> {
  const stopwords = new Set([
    "a", "o", "e", "de", "da", "do", "em", "na", "no", "um", "uma", "para",
    "por", "com", "que", "tem", "está", "esta", "faz", "já", "mais", "muito",
    "desde", "há", "ser", "foi", "sendo", "preciso", "município", "rua", "avenida",
  ]);
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ------------------------------------------------------------
// Classificador heurístico
// ------------------------------------------------------------
const KEYWORDS: { re: RegExp; category: string }[] = [
  { re: /buraco|cratera|depressao na via|asfalto|pista esburacada/, category: "Buraco na via" },
  { re: /barulho|ruido|som alto|poluicao sonora|batuque|musica alta|festa|buzina/, category: "Poluição sonora" },
  { re: /comercio irregular|ambulante|vendedor|sem alvara|produto irregular|ocupacao de calcada|banca/, category: "Comércio irregular" },
  { re: /lixo|entulho|descarte|residuo|sujeira|detrito|calçada suja/, category: "Descarte irregular de lixo" },
  { re: /obra|construcao|reforma|demolicao|andaime|reformando|obras sem/, category: "Obra sem alvará" },
  { re: /iluminacao|lampada|poste|fiacao|luz|apagao|escuridao/, category: "Iluminação pública" },
  { re: /placa|sinalizacao|semafaro|faixa|pintura de solo|transito|sinal/, category: "Sinalização" },
  { re: /esgoto|drenagem|alagamento|entupimento|vazamento|bueiro|esgoto a ceu aberto|cano/, category: "Esgoto / Drenagem" },
];

const CRITICAL_RE =
  /risco|perigo|acidente|choque|fiacao exposta|crianca|escola|urgente|grave|desabamento|queda|desabou|colapso/;
const HIGH_RE =
  /alagamento|entupimento|vazamento|barulho|madrugada|obstrucao|transito|fumaça|cheiro|odor|esgoto a ceu aberto/;

function pickSubcategory(category: string, tokens: Set<string>): string | null {
  const options = SUBCATEGORIES[category] ?? ["Não especificado"];
  if (options.length <= 1) return options[0];
  const map: Record<string, [string, string][]> = {
    "Buraco na via": [["avenida", "Avenida"], ["rodovia", "Rodovia"], ["obra", "Trecho de obra"]],
    "Poluição sonora": [["estabelecimento|bar|restaurante|mercado", "Estabelecimento"], ["obra", "Obra"], ["evento|festa|show", "Evento"], ["veiculo|carro|moto", "Veículo"]],
    "Comércio irregular": [["alvara", "Sem alvará"], ["ambulante|vendedor", "Ambulante"], ["produto", "Produto irregular"], ["calcada", "Ocupação de calçada"]],
    "Descarte irregular de lixo": [["entulho|obra", "Entulho"], ["eletronico|geladeira|tv", "Eletrônico"], ["organico|comida", "Resíduo orgânico"], ["volume|grande|sofa|movei", "Volume grande"]],
    "Obra sem alvará": [["comercial|loja", "Comercial"], ["reforma", "Reforma"], ["demolicao", "Demolição"]],
    "Iluminação pública": [["queimada|apagada|acende", "Lâmpada queimada"], ["poste", "Poste danificado"], ["fiacao|fio|exposta", "Fiação exposta"]],
    Sinalização: [["placa|danificada|quebrada", "Placa danificada"], ["faixa|apagada|pintura", "Faixa apagada"], ["semafaro", "Semáforo"]],
    "Esgoto / Drenagem": [["vazamento|cano", "Vazamento"], ["entupimento", "Entupimento"], ["alagamento|agua parada", "Alagamento"], ["ceu aberto|aberto", "Esgoto a céu aberto"]],
  };
  const rules = map[category];
  if (!rules) return options[0];
  for (const [pattern, label] of rules) {
    if (new RegExp(pattern).test([...tokens].join(" "))) return label;
  }
  return options[0];
}

export function classifyHeuristic(
  description: string,
  nearby: NearbyOccurrence[] = []
): AIClassificationResult {
  const text = description.toLowerCase();
  const tokens = normalizeTokens(description);

  let category = "Outro";
  let best = 0;
  for (const k of KEYWORDS) {
    if (k.re.test(text)) {
      const matched = k.re.exec(text)?.[0]?.length ?? 0;
      const score = matched / Math.max(10, matched + 3);
      if (score > best) {
        best = score;
        category = k.category;
      }
    }
  }
  if (category === "Outro") best = 0.55;

  let urgency: UrgencyLevel = 2;
  if (CRITICAL_RE.test(text)) urgency = 4;
  else if (HIGH_RE.test(text)) urgency = 3;
  if (category === "Esgoto / Drenagem" && urgency < 3) urgency = 3;

  const confidence = Math.min(0.92, 0.6 + best * 0.3);

  // Duplicidade por similaridade textual com ocorrências próximas
  let duplicate_suspected = false;
  let duplicate_of: string | null = null;
  let bestSim = 0;
  for (const n of nearby) {
    const sim = jaccard(tokens, normalizeTokens(n.description));
    if (sim > bestSim) {
      bestSim = sim;
      duplicate_of = n.id;
    }
  }
  if (bestSim >= 0.45) {
    duplicate_suspected = true;
  } else if (bestSim >= 0.3 && category !== "Outro") {
    duplicate_suspected = true;
  }

  const subcategory = pickSubcategory(category, tokens);
  return {
    category,
    subcategory,
    urgency,
    confidence: Number(confidence.toFixed(2)),
    duplicate_suspected,
    duplicate_of,
    rationale:
      category === "Outro"
        ? "Nenhuma palavra-chave conhecida foi encontrada; classificado como Outro. Revise a categoria manualmente."
        : `Palavras-chave detectadas no relato (heurística local). Confiança ${(confidence * 100).toFixed(0)}%.`,
    source: "heuristica",
  };
}

// ------------------------------------------------------------
// Classificador via LLM (OpenAI-compatible / Gemini)
// ------------------------------------------------------------
async function classifyWithLLM(
  description: string,
  nearby: NearbyOccurrence[],
  categoryHint?: string
): Promise<AIClassificationResult | null> {
  const apiKey = process.env.SIFAU_LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.SIFAU_LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = process.env.SIFAU_LLM_MODEL ?? "gemini-2.0-flash";

  const nearbyText = nearby
    .slice(0, 8)
    .map((n) => `- ${n.id.slice(0, 8)} | ${n.category} | ${n.description.slice(0, 120)}`)
    .join("\n");

  const system = [
    "Você é o classificador oficial de ocorrências urbanas do SIFAU, sistema municipal de fiscalização.",
    "Responda APENAS com JSON válido, sem markdown, sem texto extra, no formato:",
    '{"category": string, "subcategory": string|null, "urgency": 1|2|3|4, "confidence": number 0-1, "duplicate_suspected": boolean, "duplicate_of": string|null, "rationale": string}',
    `Categorias válidas: ${CATEGORIES.join(", ")}.`,
    "Urgência: 1=Baixa, 2=Média, 3=Alta, 4=Crítica (risco iminente à segurança).",
    "Se houver ocorrências próximas muito semelhantes, marque duplicate_suspected=true e informe duplicate_of com o id.",
  ].join("\n");

  const user = `Descrição do cidadão: "${description}"${categoryHint ? `\nCategoria sugerida pelo cidadão: ${categoryHint}` : ""}\nOcorrências próximas (30 dias):\n${nearbyText || "nenhuma"}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<AIClassificationResult>;
    if (!parsed.category || !CATEGORIES.includes(parsed.category as (typeof CATEGORIES)[number])) {
      return null;
    }
    const urgency = [1, 2, 3, 4].includes(Number(parsed.urgency)) ? (Number(parsed.urgency) as UrgencyLevel) : 2;
    return {
      category: parsed.category,
      subcategory:
        parsed.subcategory && SUBCATEGORIES[parsed.category]?.includes(parsed.subcategory)
          ? parsed.subcategory
          : (SUBCATEGORIES[parsed.category]?.[0] ?? null),
      urgency,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.8)),
      duplicate_suspected: Boolean(parsed.duplicate_suspected),
      duplicate_of: parsed.duplicate_of ?? null,
      rationale: parsed.rationale ?? "Classificação realizada por IA generativa.",
      source: "ia",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// API pública
// ------------------------------------------------------------
export async function classifyOccurrence(
  description: string,
  opts: { nearby?: NearbyOccurrence[]; categoryHint?: string } = {}
): Promise<AIClassificationResult> {
  const nearby = opts.nearby ?? [];
  const llm = await classifyWithLLM(description, nearby, opts.categoryHint);
  if (llm) return llm;
  return classifyHeuristic(description, nearby);
}

/** Busca ocorrências próximas (meses recentes) para checagem de duplicidade. */
export function filterNearby(
  rows: { id: string; description: string; category: string; lat: number; lng: number; created_at: string | Date }[],
  lat: number,
  lng: number
): NearbyOccurrence[] {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  return rows
    .filter((o) => {
      if (new Date(o.created_at) < cutoff) return false;
      if (Math.abs(o.lat - lat) > DUPLICATE_SEARCH_RADIUS_DEG) return false;
      if (Math.abs(o.lng - lng) > DUPLICATE_SEARCH_RADIUS_DEG) return false;
      return true;
    })
    .map((o) => ({ id: o.id, description: o.description, category: o.category, lat: o.lat, lng: o.lng }));
}
