import { AMBIENTES, type AmbienteKey, type ScanResult } from "./types";

const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT = `Você é um auditor da metodologia 5S (Seiri, Seiton, Seiso, Seiketsu, Shitsuke) do Grupo Equatorial Energia. Analise a foto de um ambiente corporativo e devolva um diagnóstico OBJETIVO, prático e CRITERIOSO.

Regras gerais:
- Seja específico: cite objetos reais visíveis na foto (ex: "caneca sobre documentos", "cabo solto na mesa"), nunca genérico.
- Nunca invente itens que não aparecem na imagem.
- As ações devem ser concretas, executáveis em menos de 5 minutos cada.
- Tom: profissional, direto, encorajador. Nunca punitivo.
- Use SEMPRE acentuação correta em português (ex: "atenção", "não", "você", "ação", "padrão").

RUBRICA DE SCORE (OBRIGATÓRIA — não oscile para o meio):
- 0–30   Crítico       Risco de segurança, caos severo, materiais no chão em área de passagem, ambiente insalubre
- 31–50  Insuficiente  Múltiplos problemas evidentes, 3+ itens fora do padrão, falta clara de organização
- 51–70  Regular       Ambiente funcional mas com pontos claros a melhorar (1–3 itens notáveis)
- 71–85  Bom           Organizado no geral, 1 ou 2 pequenos ajustes
- 86–100 Excelente     Padrão de referência, sem itens notáveis fora do lugar

Penalidades mínimas por problema visível (reduza o score do senso correspondente):
- Mochila, bolsa ou objeto pessoal grande sobre a superfície de trabalho: −10 em Seiton
- Cabos aparentes, soltos ou emaranhados visíveis: −8 em Seiton
- Papéis, documentos ou materiais soltos acumulados: −10 em Seiri
- Itens de uso eventual (frascos, materiais pessoais) deixados à mostra: −6 em Seiri
- Sujeira visível, resíduos, poeira, lixeira transbordando: −10 em Seiso
- Ausência de etiquetas, identificação ou local marcado: −6 em Seiketsu

Instruções críticas:
- EM CASO DE DÚVIDA, PREFIRA O SCORE MENOR. Não arredonde para cima.
- Não dê score ≥ 85 se houver qualquer item claro fora do padrão.
- Não dê score ≥ 70 se houver 3 ou mais itens notáveis em "itensDetectados".
- O "scoreGeral" é a MÉDIA ARITMÉTICA dos 5 sensos, arredondada para inteiro.
- Se a foto mostra ambiente propositalmente desarrumado, não suavize o diagnóstico por gentileza.

Sensos:
- Seiri (Utilização): o que está ali é realmente necessário?
- Seiton (Ordenação): cada coisa tem um lugar e está no lugar?
- Seiso (Limpeza): o ambiente está limpo e conservado?
- Seiketsu (Padronização): há padrão visual, identificação, consistência?
- Shitsuke (Autodisciplina): sinais de hábito e manutenção contínua.

Para "resumoMotivacional": seja honesto. Se o score for abaixo de 60, aponte os pontos de maior impacto a melhorar. Nunca minta sobre a situação do ambiente.

Responda APENAS JSON válido no schema fornecido.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    scoreGeral: { type: "integer", minimum: 0, maximum: 100 },
    sensos: {
      type: "object",
      properties: {
        seiri: {
          type: "object",
          properties: {
            score: { type: "integer" },
            observacao: { type: "string" },
          },
          required: ["score", "observacao"],
        },
        seiton: {
          type: "object",
          properties: {
            score: { type: "integer" },
            observacao: { type: "string" },
          },
          required: ["score", "observacao"],
        },
        seiso: {
          type: "object",
          properties: {
            score: { type: "integer" },
            observacao: { type: "string" },
          },
          required: ["score", "observacao"],
        },
        seiketsu: {
          type: "object",
          properties: {
            score: { type: "integer" },
            observacao: { type: "string" },
          },
          required: ["score", "observacao"],
        },
        shitsuke: {
          type: "object",
          properties: {
            score: { type: "integer" },
            observacao: { type: "string" },
          },
          required: ["score", "observacao"],
        },
      },
      required: ["seiri", "seiton", "seiso", "seiketsu", "shitsuke"],
    },
    itensDetectados: {
      type: "array",
      items: {
        type: "object",
        properties: {
          objeto: { type: "string" },
          problema: { type: "string" },
          senso: { type: "string" },
        },
        required: ["objeto", "problema", "senso"],
      },
    },
    acoesSugeridas: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          descricao: { type: "string" },
          tempoEstimadoMin: { type: "integer" },
          senso: { type: "string" },
        },
        required: ["titulo", "descricao", "tempoEstimadoMin", "senso"],
      },
    },
    resumoMotivacional: { type: "string" },
  },
  required: [
    "scoreGeral",
    "sensos",
    "itensDetectados",
    "acoesSugeridas",
    "resumoMotivacional",
  ],
};

async function callOnce(
  model: string,
  body: unknown,
  apiKey: string,
): Promise<Response> {
  return fetch(
    `${API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

async function callWithRetry(
  model: string,
  body: unknown,
  apiKey: string,
): Promise<Response> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await callOnce(model, body, apiKey);
    if (res.ok) return res;
    if (res.status === 503 && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 1500));
      continue;
    }
    return res;
  }
  throw new Error("unreachable");
}

export async function analyzeImage(
  base64: string,
  mimeType: string,
  ambiente: AmbienteKey,
): Promise<{ model: string; result: ScanResult }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY ausente no servidor.");

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tipo de ambiente: ${AMBIENTES[ambiente]}.\n\nAnalise a imagem conforme os critérios do sistema.`,
          },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.3,
    },
  };

  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = "";
  for (const model of models) {
    const res = await callWithRetry(model, body, apiKey);
    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = `${model} retornou sem texto`;
        continue;
      }
      return { model, result: JSON.parse(text) as ScanResult };
    }
    const raw = await res.text();
    lastError = `${model} HTTP ${res.status}: ${raw.slice(0, 160)}`;
  }
  throw new Error(`Todos os modelos falharam. Último erro: ${lastError}`);
}
