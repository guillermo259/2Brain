/**
 * EmbeddingService.ts — Wrapper sobre @huggingface/transformers (Transformers.js v4).
 *
 * Carga el modelo all-MiniLM-L6-v2 ONNX (~30 MB) desde onnx-community y expone:
 *   - extractEmbedding(text) → Float32Array(384)
 *   - isReady() → boolean
 *   - getDownloadProgress() → number (0-100)
 *
 * El modelo se carga lazy (primera llamada a extractEmbedding).
 * Usa el singleton pattern para no recargar el modelo.
 *
 * Dependencia: @huggingface/transformers (instalado como dependency).
 */

let _extractor: ((text: string) => Promise<Float32Array>) | null = null;
let _loadingPromise: Promise<void> | null = null;
let _ready = false;
let _downloadProgress = 0;

const EMBEDDING_DIM = 384;
const EMB_MODEL_ID = 'onnx-community/all-MiniLM-L6-v2-ONNX';

/**
 * Verifica si el modelo de embeddings ya está cacheado en Cache Storage.
 * Busca al menos un archivo .onnx del modelo en los caches del navegador.
 * Retorna true si el modelo ya fue descargado previamente.
 */
export async function isEmbeddingCached(): Promise<boolean> {
  try {
    if (!('caches' in self)) return false;
    const cacheNames = await caches.keys();
    // Transformers.js usa cache con el nombre del modelo en la URL
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      const hasModel = keys.some(
        (req) => req.url.includes(EMB_MODEL_ID.replace('/', '/')) && req.url.endsWith('.onnx'),
      );
      if (hasModel) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Inicializa el pipeline de feature extraction.
 * Llama esto antes de extractEmbedding o usa directamente
 * extractEmbedding (que llama init implícitamente).
 */
export async function initEmbeddings(): Promise<void> {
  if (_ready) return;
  if (_loadingPromise) return _loadingPromise;

  _downloadProgress = 0;

  _loadingPromise = (async () => {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');

      // Forzar CDN de HuggingFace para evitar que Vite intercepte las requests
      env.remoteHost = 'https://huggingface.co';
      env.allowLocalModels = false;

      const pipe = await pipeline(
        'feature-extraction',
        EMB_MODEL_ID,
        {
          progress_callback: (progress: { status: string; progress?: number }) => {
            if (progress.status === 'progress' && typeof progress.progress === 'number') {
              _downloadProgress = Math.round(progress.progress);
            } else if (progress.status === 'progress_total' && typeof progress.progress === 'number') {
              _downloadProgress = Math.round(progress.progress);
            } else if (progress.status === 'done' || progress.status === 'ready') {
              _downloadProgress = 100;
            }
          },
        } as any,
      );

      _extractor = async (text: string): Promise<Float32Array> => {
        const result = await pipe(text, {
          pooling: 'mean',
          normalize: true,
        });
        const arr = result.data as Float32Array;
        if (arr.length !== EMBEDDING_DIM) {
          throw new Error(
            `Unexpected embedding dim: ${arr.length} (expected ${EMBEDDING_DIM})`,
          );
        }
        return arr;
      };

      _ready = true;
      _downloadProgress = 100;
    } catch (err) {
      _loadingPromise = null;
      _downloadProgress = 0;
      throw err;
    }
  })();

  return _loadingPromise;
}

/** Extrae el embedding de un texto. Inicializa el modelo si es necesario. */
export async function extractEmbedding(text: string): Promise<Float32Array> {
  if (!_ready) {
    await initEmbeddings();
  }
  if (!_extractor) {
    throw new Error('Embedding extractor not initialized');
  }
  const truncated = text.slice(0, 4000);
  return _extractor(truncated);
}

/** Verifica si el modelo de embeddings está listo. */
export function isEmbeddingReady(): boolean {
  return _ready;
}

/** Progreso de descarga del modelo de embeddings (0-100). */
export function getEmbeddingDownloadProgress(): number {
  return _downloadProgress;
}

/** Dimensión esperada del embedding. */
export { EMBEDDING_DIM };
