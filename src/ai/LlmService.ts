/**
 * LlmService.ts — Cloud-based LLM for note classification.
 *
 * Supports 4 providers (all OpenAI-compatible chat completions API):
 *   - NVIDIA Build (default) → google/gemma-4-31b-it
 *   - OpenRouter → google/gemma-3-27b-it:free
 *   - Groq → llama-3.1-8b-instant
 *   - Google AI Studio → gemini-2.0-flash-lite
 *
 * API key resolution order:
 *   1. Environment variable (VITE_<PROVIDER>_API_KEY) — set in .env
 *   2. localStorage (user-configured in Settings → AI Model)
 *
 * If no provider is explicitly selected but an env var is present,
 * NVIDIA is used as the default provider.
 */

import {
  buildClassificationMessages,
  parseClassificationResponse,
  type ClassificationInput,
  type ClassificationOutput,
} from './prompts';

// ──── Provider definitions ────

export type AiProvider = 'nvidia' | 'openrouter' | 'groq' | 'google';

export interface ProviderConfig {
  id: AiProvider;
  name: string;
  baseUrl: string;
  model: string;
  description: string;
  keyUrl: string;
  envVar: string;
}

export const AI_PROVIDERS: ProviderConfig[] = [
  {
    id: 'nvidia',
    name: 'NVIDIA Build',
    baseUrl: import.meta.env.DEV ? '/api/nvidia/v1' : 'https://integrate.api.nvidia.com/v1',
    model: 'google/gemma-4-31b-it',
    description: 'Free tier — Gemma 4 31B',
    keyUrl: 'https://build.nvidia.com',
    envVar: 'VITE_NVIDIA_API_KEY',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: import.meta.env.DEV ? '/api/openrouter/api/v1' : 'https://openrouter.ai/api/v1',
    model: 'google/gemma-3-27b-it:free',
    description: 'Free models available',
    keyUrl: 'https://openrouter.ai/keys',
    envVar: 'VITE_OPENROUTER_API_KEY',
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: import.meta.env.DEV ? '/api/groq/openai/v1' : 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    description: 'Ultra-fast inference, free tier',
    keyUrl: 'https://console.groq.com/keys',
    envVar: 'VITE_GROQ_API_KEY',
  },
  {
    id: 'google',
    name: 'Google AI Studio',
    baseUrl: import.meta.env.DEV ? '/api/google/v1beta/openai' : 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemma-4-31b-it',
    description: 'Free tier with generous limits',
    keyUrl: 'https://aistudio.google.com/apikey',
    envVar: 'VITE_GOOGLE_API_KEY',
  },
];

// ──── LocalStorage keys ────

const LS_PROVIDER = '2brain-ai-provider';
const LS_API_KEY_PREFIX = '2brain-ai-apikey-'; // per-provider: 2brain-ai-apikey-nvidia

// ──── State ────

let _error: string | null = null;
let _loading = false;

// ──── Env var helpers ────

/** Read a VITE_ env var (injected at build time by Vite). */
function getEnvVar(name: string): string | null {
  try {
    const val = (import.meta as any).env?.[name];
    return typeof val === 'string' && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

/** Get env-based API key for a provider. */
function getEnvApiKey(provider: AiProvider): string | null {
  const config = AI_PROVIDERS.find((p) => p.id === provider);
  if (!config) return null;
  return getEnvVar(config.envVar);
}

// ──── Provider / API Key management ────

/**
 * Get the active provider. Resolution:
 *   1. User-selected in localStorage
 *   2. First provider that has an env var key set
 *   3. 'nvidia' as absolute default
 */
export function getAiProvider(): AiProvider {
  try {
    const stored = localStorage.getItem(LS_PROVIDER);
    if (stored && AI_PROVIDERS.some((p) => p.id === stored)) return stored as AiProvider;
  } catch { /* ignore */ }

  // Auto-detect from env vars
  for (const p of AI_PROVIDERS) {
    if (getEnvVar(p.envVar)) return p.id;
  }

  return 'nvidia'; // default
}

export function setAiProvider(provider: AiProvider): void {
  localStorage.setItem(LS_PROVIDER, provider);
}

/**
 * Get API key for a provider. Resolution:
 *   1. localStorage (user override)
 *   2. VITE_ env var
 */
export function getAiApiKey(provider?: AiProvider): string | null {
  const id = provider ?? getAiProvider();
  try {
    const stored = localStorage.getItem(LS_API_KEY_PREFIX + id);
    if (stored && stored.trim()) return stored.trim();
  } catch { /* ignore */ }

  return getEnvApiKey(id);
}

/** Save API key for a specific provider to localStorage. */
export function setAiApiKey(key: string, provider?: AiProvider): void {
  const id = provider ?? getAiProvider();
  localStorage.setItem(LS_API_KEY_PREFIX + id, key);
}

/** Check if a provider has a key configured (env or localStorage). */
export function hasApiKey(provider: AiProvider): boolean {
  return !!getAiApiKey(provider);
}

export function getProviderConfig(provider?: AiProvider): ProviderConfig {
  const id = provider ?? getAiProvider();
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

// ──── Public API (compatible con la interfaz anterior) ────

/** No-op — cloud API no necesita inicialización. */
export async function initLlm(): Promise<void> {
  return;
}

/** True si hay provider y API key configurados. */
export function isLlmReady(): boolean {
  return !!getAiApiKey();
}

export function isLlmLoading(): boolean {
  return _loading;
}

export function getLlmDownloadProgress(): number {
  return isLlmReady() ? 100 : 0;
}

export function getLlmError(): string | null {
  return _error;
}

export function getLlmStallDuration(): number {
  return 0;
}

/** Always true for cloud (no download). */
export async function isLlmCached(): Promise<boolean> {
  return true;
}

export function checkWebGpuSupport(): boolean {
  return false;
}

// ──── Classification ────

/**
 * Clasifica una nota usando la API cloud del provider seleccionado.
 * Todas las APIs son OpenAI-compatible (chat completions).
 */
export async function classify(
  input: ClassificationInput,
  fallbackTitle: string = 'Untitled',
  fallbackCategory: string = 'General',
): Promise<ClassificationOutput> {
  const provider = getProviderConfig();
  const apiKey = getAiApiKey();

  if (!apiKey) {
    throw new Error(
      `No API key configured for ${provider.name}. ` +
      `Set ${provider.envVar} in .env or configure it in Settings → AI Model.`
    );
  }

  _loading = true;
  _error = null;

  try {
    const messages = buildClassificationMessages(input);

    console.log('[LLM] Calling', provider.name, '→', provider.model);
    const t0 = performance.now();

    const body: Record<string, unknown> = {
        model: provider.model,
        messages,
        max_tokens: 512,
        temperature: 0.1,
        stream: false,
      };

      // Disable thinking mode only for NVIDIA (Gemma-4 specific param)
      if (provider.id === 'nvidia') {
        body.chat_template_kwargs = { enable_thinking: false };
      }

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const statusMsg = `${provider.name} API error ${response.status}: ${errorBody.slice(0, 200)}`;
      _error = statusMsg;
      throw new Error(statusMsg);
    }

    const data = await response.json();
    const elapsed = Math.round(performance.now() - t0);
    console.log('[LLM] Response in', elapsed, 'ms');

    const responseText = data.choices?.[0]?.message?.content ?? '';
    console.log('[LLM] Raw response:', responseText);

    const result = parseClassificationResponse(responseText, fallbackTitle, fallbackCategory);
    console.log('[LLM] Parsed result:', result);

    _loading = false;
    return result;
  } catch (err) {
    _loading = false;
    _error = (err as Error).message;
    throw err;
  }
}
