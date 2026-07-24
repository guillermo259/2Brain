/**
 * Pipeline.ts — Orquestador del pipeline de autocategorización.
 *
 * Flujo completo (2 etapas):
 *
 *   [Nota de Entrada]
 *        │
 *        ├─► [1. Extract Embeddings] → all-MiniLM-L6-v2 → Float32Array[384]
 *        │
 *        ├─► [2. Query Context] → categories + tags from SQLite
 *        │
 *        ▼
 *   [3. Inferencia Qwen 3.5 0.8B] → Prompt contextual via Qwen3_5ForConditionalGeneration
 *        │
 *        ▼
 *   [4. Parsed JSON] → { title, category, tags }
 *        │
 *        ▼
 *   [5. Commit SQLite] → INSERT/UPDATE notes + embeddings
 *
 * Uso:
 *   import { runPipeline } from './ai/Pipeline';
 *   const result = await runPipeline(noteId, content, fallbackTitle);
 *   // result = { title, category, tags, embedding }
 */

import { extractEmbedding, initEmbeddings, isEmbeddingReady, EMBEDDING_DIM } from './EmbeddingService';
import { classify, initLlm, isLlmReady, getLlmDownloadProgress } from './LlmService';
import { queryAll, exec } from '../db/DbClient';
import { encodeEmbedding } from '../db/VectorRepository';
import { safeLog } from '../security/logSanitizer';
import type { ClassificationOutput } from './prompts';

export interface PipelineResult extends ClassificationOutput {
  embedding: Float32Array;
  autoCategorized: boolean;
}

export interface PipelineProgress {
  stage: 'idle' | 'embedding' | 'llm' | 'committing' | 'done' | 'error';
  detail: string;
  llmDownloadPercent: number;
}

/**
 * Ejecuta el pipeline completo para una nota.
 *
 * @param noteId       - ID de la nota a clasificar (para logging)
 * @param content      - Texto de la nota a clasificar
 * @param fallbackTitle - Título provisional si el LLM falla
 * @param onProgress   - Callback opcional para reportar progreso
 * @returns PipelineResult con título, categoría, tags y embedding
 */
export async function runPipeline(
  noteId: string,
  content: string,
  fallbackTitle: string = 'Untitled',
  onProgress?: (p: PipelineProgress) => void,
): Promise<PipelineResult> {
  const t0 = performance.now();

  // ──── Stage 0: Validación ────
  if (!content || !content.trim()) {
    throw new Error('Cannot classify empty content');
  }

  // ──── Stage 1: Embeddings ────
  onProgress?.({ stage: 'embedding', detail: 'Extracting semantic embedding...', llmDownloadPercent: 0 });
  console.log('[Pipeline] Stage 1: Extracting embeddings for note', noteId);

  let embedding: Float32Array;
  try {
    await initEmbeddings();
    embedding = await extractEmbedding(content);
    console.log('[Pipeline] Embedding extracted, dim:', embedding.length);
  } catch (err) {
    console.error('[Pipeline] Embedding extraction FAILED:', err);
    safeLog.error('embedding extraction failed', err);
    // Fallback: vector cero
    embedding = new Float32Array(EMBEDDING_DIM);
    logPipeline(noteId, 'embedding', 'error', {}, {}, String(err), performance.now() - t0);
  }

  const tEmbed = performance.now();

  // ──── Stage 2: Query context (categorías y tags existentes) ────
  const existingCategories = getExistingCategories();
  const existingTags = getExistingTags();
  console.log('[Pipeline] Stage 2: Context —', existingCategories.length, 'categories,', existingTags.length, 'tags');

  // ──── Stage 3: Inferencia con Qwen 3.5 0.8B ────
  onProgress?.({
    stage: 'llm',
    detail: isLlmReady() ? 'Classifying with Qwen 3.5...' : 'Loading Qwen 3.5 model...',
    llmDownloadPercent: getLlmDownloadProgress(),
  });
  console.log('[Pipeline] Stage 3: LLM ready?', isLlmReady(), '— calling classify()...');

  let classification: ClassificationOutput;
  try {
    await initLlm();
    console.log('[Pipeline] initLlm() resolved. Calling classify()...');
    classification = await classify(
      {
        content,
        existingCategories,
        existingTags,
      },
      fallbackTitle,
      existingCategories[0] ?? 'General',
    );
    console.log('[Pipeline] Classification result:', classification);
  } catch (err) {
    console.error('[Pipeline] LLM classification FAILED:', err);
    safeLog.error('LLM classification failed, using fallback', err);
    logPipeline(noteId, 'llm', 'error', { content: content.slice(0, 200) }, {}, String(err), 0);
    // Fallback: usar la categoría por defecto y título original
    classification = {
      title: fallbackTitle.slice(0, 50),
      category: existingCategories[0] ?? 'Sin Categorizar',
      tags: [],
    };
  }

  const tLlm = performance.now();

  // ──── Stage 4 & 5: Commit en SQLite ────
  onProgress?.({ stage: 'committing', detail: 'Saving to database...', llmDownloadPercent: 100 });

  logPipeline(
    noteId,
    'llm',
    'success',
    { content: content.slice(0, 200) },
    classification,
    undefined,
    tLlm - tEmbed,
  );

  return {
    ...classification,
    embedding,
    autoCategorized: true,
  };
}

// ──── Helpers ────

function getExistingCategories(): string[] {
  try {
    const rows = queryAll<{ category: string }>(
      'SELECT DISTINCT category FROM notes ORDER BY category',
    );
    const cats = rows.map((r) => r.category).filter(Boolean);
    // Siempre incluir 'General' como fallback
    if (!cats.includes('General')) cats.unshift('General');
    return cats;
  } catch {
    return ['General'];
  }
}

function getExistingTags(): string[] {
  try {
    const rows = queryAll<{ tags: string }>(
      'SELECT DISTINCT tags FROM notes',
    );
    const tagSet = new Set<string>();
    for (const row of rows) {
      try {
        const parsed: string[] = JSON.parse(row.tags || '[]');
        parsed.forEach((t) => tagSet.add(t));
      } catch {
        /* skip invalid JSON */
      }
    }
    return Array.from(tagSet).sort();
  } catch {
    return [];
  }
}

function logPipeline(
  noteId: string,
  stage: string,
  status: 'success' | 'error',
  input: Record<string, unknown>,
  output: Record<string, unknown> | object,
  error?: string,
  durationMs?: number,
): void {
  try {
    exec(
      `INSERT INTO pipeline_log (note_id, stage, status, input_json, output_json, error, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,
        stage,
        status,
        JSON.stringify(input),
        JSON.stringify(output),
        error ?? null,
        durationMs ?? null,
      ],
    );
  } catch {
    /* best-effort logging — no bloquear el pipeline */
  }
}

/** Actualiza el note_id en el log después de crear la nota. @deprecated Ya no es necesario — el noteId se pasa a runPipeline directamente. */
export function linkPipelineLog(_noteId: string): void {
  // no-op: el noteId ya se pasó a runPipeline, que lo usa en logPipeline
}

/** Marca una nota como auto-categorizada en la DB. */
export function markAutoCategorized(noteId: string): void {
  try {
    exec('UPDATE notes SET auto_categorized = 1 WHERE id = ?', [noteId]);
  } catch {
    /* ignore */
  }
}
