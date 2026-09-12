import { NextRequest, NextResponse } from 'next/server';

// Classification constants
const CATEGORIES = [
  'Buraco na via',
  'Poluição sonora',
  'Iluminação pública',
  'Entulho/lixo',
  'Calçada danificada',
  'Árvores',
  'Vias públicas',
  'Edificações',
  'Outros',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Buraco na via': ['buraco', 'furo', 'solo', 'asfalto', 'pavimento', 'via', 'rua', 'estrada', 'buracos'],
  'Poluição sonora': ['barulho', 'ruído', 'som', 'alto', 'perturbador', 'vizinho', 'comercial', 'música', 'obra'],
  'Iluminação pública': ['luz', 'lâmpada', 'iluminação', 'apagada', 'piscando', 'poste', 'fiação', 'noite', 'escuro'],
  'Entulho/lixo': ['entulho', 'lixo', 'resíduo', 'jogado', 'acumulado', 'sujeira', 'calçada', 'rua', 'improper'],
  'Calçada danificada': ['calçada', 'quebrada', 'danificada', 'buraco', 'desnível', 'trepidação', 'pedra', 'irregular'],
  'Árvores': ['árvore', 'galho', 'queda', 'perigoso', 'poda', 'raiz', 'calçada', 'caindo', 'secando'],
  'Vias públicas': ['sinalização', 'placa', 'tapaburaco', 'obra', 'parada', 'trânsito', 'via', 'pública'],
  'Edificações': ['prédio', 'edificação', 'abandonado', 'graffiti', 'ocupação', 'irregular', 'fachada', 'caindo'],
  'Outros': [],
};

const URGENCY_KEYWORDS = {
  crítico: ['perigo', 'emergência', 'grave', 'risco', 'acidente', 'caiu', 'caindo', 'imediato', 'urgente'],
  alto: ['preocupante', 'rápido', 'importante', 'necessário', 'prioridade', 'alerta'],
  médio: ['regular', 'normal', 'comum', 'frequente'],
  baixo: ['leve', 'pequeno', 'menor', 'simples', 'menos importante'],
};

// Heuristic classifier
function heuristicClassify(description: string, categoryHint?: string) {
  const desc = description.toLowerCase();
  let bestCategory = categoryHint || 'Outros';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.length === 0) continue;
    
    let score = 0;
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Calculate urgency
  let urgency = 2; // Default medium
  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        if (level === 'crítico') urgency = 4;
        else if (level === 'alto') urgency = Math.max(urgency, 3);
        else if (level === 'médio') urgency = Math.max(urgency, 2);
        else if (level === 'baixo') urgency = Math.min(urgency, 1);
      }
    }
  }

  // Calculate confidence based on keyword matches
  const confidence = bestScore > 0 ? Math.min(0.5 + (bestScore * 0.1), 0.95) : 0.3;

  return {
    category: bestCategory,
    subcategory: null,
    urgency_score: urgency,
    confidence,
    rationale: confidence > 0.5 
      ? `Classificação baseada em ${bestScore} palavras-chave encontradas na descrição`
      : 'Classificação com baixa confiança - considere revisar manualmente',
    method: 'heuristic',
  };
}

// LLM classifier
async function llmClassify(description: string, categoryHint?: string, lat?: number, lng?: number) {
  const apiKey = process.env.SIFAU_LLM_API_KEY;
  const baseUrl = process.env.SIFAU_LLM_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.SIFAU_LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    console.log('No LLM API key configured, falling back to heuristic');
    return heuristicClassify(description, categoryHint);
  }

  const systemPrompt = `Você é um classificador de problemas urbanos para um sistema municipal. 
Classifique a descrição do problema em uma das seguintes categorias: ${CATEGORIES.join(', ')}.

Retorne um JSON com este formato:
{
  "category": "nome da categoria",
  "subcategory": "subcategoria específica (opcional)",
  "urgency_score": número de 1 a 4 (1=baixa, 2=média, 3=alta, 4=crítica),
  "confidence": número de 0 a 1 indicando confiança na classificação,
  "rationale": "breve explicação da classificação"
}

Considere o contexto urbano municipal. Urgência 4 é para situações de perigo iminente.
Se a categoria hint for fornecida, considere-a mas não a siga cegamente.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Descrição: ${description}${categoryHint ? `\nCategoria sugerida: ${categoryHint}` : ''}${lat && lng ? `\nLocalização: ${lat}, ${lng}` : ''}` 
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(12000), // 12 second timeout
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      ...result,
      method: 'llm',
    };
  } catch (error) {
    console.error('LLM classification error:', error);
    return heuristicClassify(description, categoryHint);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, categoryHint, lat, lng } = body;

    if (!description || description.length < 10) {
      return NextResponse.json({ error: 'Description too short' }, { status: 400 });
    }

    // Try LLM first, fallback to heuristic
    const result = await llmClassify(description, categoryHint, lat, lng);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
