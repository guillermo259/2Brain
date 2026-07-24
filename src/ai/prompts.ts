/**
 * prompts.ts — System prompts para el pipeline de autocategorización.
 *
 * Usa la API de pipeline("text-generation") de Transformers.js con
 * mensajes de chat simples (role + content como string).
 */

export interface ClassificationInput {
  content: string;
  existingCategories: string[];
  existingTags: string[];
}

export interface ClassificationOutput {
  title: string;
  category: string;
  tags: string[];
}

/** Mensaje en formato chat para pipeline("text-generation"). */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function buildClassificationMessages(input: ClassificationInput): ChatMessage[] {
  const { content, existingCategories, existingTags } = input;

  const systemPrompt = `Eres el motor de organización de 2brain. Analiza la siguiente nota y clasifícala.

CATEGORÍAS EXISTENTES EN EL SISTEMA:
${JSON.stringify(existingCategories)}

TAGS EXISTENTES EN EL SISTEMA:
${JSON.stringify(existingTags)}

REGLAS OBLIGATORIAS:
1. Revisa detenidamente la lista de "CATEGORÍAS EXISTENTES". Si la nota encaja semánticamente en alguna de ellas, REUTILÍZALA exactamente con el mismo nombre.
2. Si y solo si la nota trata sobre un tema completamente distinto, genera una categoría nueva (máximo 2 palabras).
3. Reutiliza TAGS EXISTENTES cuando apliquen. Crea tags nuevos únicamente si aportan contexto específico.
4. Genera un título limpio y conciso (máximo 5 palabras).
5. Responde ÚNICAMENTE con un objeto JSON válido con la estructura indicada. No agregues saludos, explicaciones ni bloques markdown fuera del JSON.

ESTRUCTURA DE SALIDA REQUERIDA (JSON):
{
  "title": "string",
  "category": "string",
  "tags": ["tag1", "tag2"]
}`;

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `NOTA A ANALIZAR:\n"${content}"`,
    },
  ];
}

/**
 * Extrae el JSON de la respuesta de Gemma 4 E2B.
 * Aplica fallback tolerante a fallos: intenta JSON.parse, luego
 * extracción por regex, luego valores por defecto.
 */
export function parseClassificationResponse(
  raw: string,
  fallbackTitle: string,
  fallbackCategory: string,
): ClassificationOutput {
  // Strip thinking tags if present (Gemma-4 thinking mode)
  let text = raw;
  // Remove <thought>...</thought> or <think>...</think> blocks
  text = text.replace(/<(?:thought|think)>[\s\S]*?<\/(?:thought|think)>/gi, '').trim();
  // If entire response was thinking with no output after, try to extract from the thinking block itself
  if (!text) {
    const thinkMatch = raw.match(/<(?:thought|think)>([\s\S]*)<\/(?:thought|think)>/i);
    text = thinkMatch ? thinkMatch[1] : raw;
  }

  // Intentar parsear directamente
  try {
    return validateOutput(JSON.parse(text));
  } catch {
    /* sigue */
  }

  // Intentar extraer bloque JSON con regex tolerante
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return validateOutput(JSON.parse(jsonMatch[0]));
    } catch {
      /* sigue */
    }
  }

  // Last resort: try extracting JSON from the original raw (including thinking block)
  const rawJsonMatch = raw.match(/\{[\s\S]*"title"[\s\S]*"category"[\s\S]*"tags"[\s\S]*\}/);
  if (rawJsonMatch) {
    try {
      return validateOutput(JSON.parse(rawJsonMatch[0]));
    } catch {
      /* sigue */
    }
  }

  // Fallback: valores por defecto
  console.warn('[LLM] Could not parse classification from response:', raw.slice(0, 300));
  return {
    title: fallbackTitle.slice(0, 50),
    category: fallbackCategory,
    tags: [],
  };
}

function validateOutput(obj: unknown): ClassificationOutput {
  if (!obj || typeof obj !== 'object') throw new Error('not an object');
  const o = obj as Record<string, unknown>;

  const title =
    typeof o.title === 'string' && o.title.trim()
      ? o.title.trim().slice(0, 100)
      : 'Untitled';

  const category =
    typeof o.category === 'string' && o.category.trim()
      ? o.category.trim().slice(0, 50)
      : 'General';

  let tags: string[] = [];
  if (Array.isArray(o.tags)) {
    tags = o.tags
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase().slice(0, 30));
  }

  return { title, category, tags };
}
