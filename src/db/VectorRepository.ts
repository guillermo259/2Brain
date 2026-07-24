/**
 * VectorRepository.ts — Búsqueda KNN por cosine similarity.
 *
 * Implementación MVP: lee la columna `embedding` (BLOB) de TODAS las notas
 * y calcula cosine similarity en TypeScript sobre Float32Array(384).
 *
 *   similarity(a, b) = (a·b) / (||a|| * ||b||)
 *
 * Esta capa expone la misma API que tendría con `sqlite-vec`:
 *
 *   - upsertEmbedding(noteId, vector)  →  UPDATE notes SET embedding = ?
 *   - search(queryVector, topK)       →  TOP(K) por sim
 *
 * Cuando se enchufe `wa-sqlite` + `sqlite-vec`, basta con cambiar el cuerpo
 * de `search()` por una query KNN nativa; el contrato externo no cambia.
 */

import { exec, queryAll } from './DbClient';
import type { VectorHit } from './types';

const EMBEDDING_DIM = 384;

interface EmbeddingRow {
  id: string;
  embedding: Uint8Array | null;
}

/** Codifica un Float32Array a un Uint8Array little-endian para SQLite. */
export function encodeEmbedding(vector: Float32Array): Uint8Array {
  if (vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `embedding must be ${EMBEDDING_DIM}-dim (got ${vector.length})`,
    );
  }
  return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
}

/** Decodifica un BLOB de SQLite a Float32Array. */
export function decodeEmbedding(blob: Uint8Array): Float32Array {
  return new Float32Array(
    blob.buffer,
    blob.byteOffset,
    blob.byteLength / 4,
  );
}

/** Cosine similarity con normalización on-demand. */
export function cosineSimilarity(
  a: Float32Array,
  b: Float32Array,
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

export interface VectorRepository {
  upsertEmbedding(noteId: string, vector: Float32Array): Promise<void>;
  search(queryVector: Float32Array, topK?: number): Promise<VectorHit[]>;
  countIndexed(): Promise<number>;
  isIndexed(noteId: string): Promise<boolean>;
}

class VectorRepositoryImpl implements VectorRepository {
  async upsertEmbedding(noteId: string, vector: Float32Array): Promise<void> {
    const buf = encodeEmbedding(vector);
    exec('UPDATE notes SET embedding = ?, updated_at = ? WHERE id = ?', [
      buf,
      new Date().toISOString(),
      noteId,
    ]);
  }

  async search(queryVector: Float32Array, topK = 8): Promise<VectorHit[]> {
    if (queryVector.length !== EMBEDDING_DIM) {
      throw new Error(
        `query vector must be ${EMBEDDING_DIM}-dim (got ${queryVector.length})`,
      );
    }
    const rows = queryAll<EmbeddingRow>(
      'SELECT id, embedding FROM notes WHERE embedding IS NOT NULL',
    );
    const hits: VectorHit[] = [];
    for (const row of rows) {
      if (!row.embedding) continue;
      const vector = decodeEmbedding(row.embedding);
      const similarity = cosineSimilarity(queryVector, vector);
      hits.push({ noteId: row.id, similarity });
    }
    hits.sort((a, b) => b.similarity - a.similarity);
    return hits.slice(0, topK);
  }

  async countIndexed(): Promise<number> {
    const rows = queryAll<{ n: number }>(
      'SELECT COUNT(*) as n FROM notes WHERE embedding IS NOT NULL',
    );
    return rows[0]?.n ?? 0;
  }

  async isIndexed(noteId: string): Promise<boolean> {
    const rows = queryAll<{ has: number }>(
      'SELECT (embedding IS NOT NULL) as has FROM notes WHERE id = ?',
      [noteId],
    );
    return rows[0]?.has === 1;
  }
}

export const vectorRepo: VectorRepository = new VectorRepositoryImpl();
