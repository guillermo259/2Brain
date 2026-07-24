/**
 * logSanitizer.ts — Logger seguro que redacta campos sensibles en producción.
 *
 * Uso:
 *   import { safeLog } from '@/security/logSanitizer';
 *   safeLog.info('note created', { id, title });   // title → [REDACTED] en prod
 *
 * En `import.meta.env.PROD` se activa automáticamente el monkey-patch de
 * `console.*` desde `main.tsx`.
 */

const SENSITIVE_KEYS = new Set([
  'title',
  'content',
  'summary',
  'description',
  'body',
  'text',
  'plaintext',
  'ciphertext',
  'embedding',
  'pin',
  'password',
  'passphrase',
  'masterkey',
  'master_key',
  'masterPin',
  'seed',
  'mnemonic',
  'recovery',
  'wrapkey',
  'wrap_key',
  'wrapping_key',
  'salt',
  'key',
]);

const PLACEHOLDER = '[REDACTED]';
const VECTOR_PLACEHOLDER = '[VECTOR]';

function redactValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) {
    if (lower === 'embedding') {
      if (value && typeof value === 'object' && 'length' in (value as object)) {
        return `${VECTOR_PLACEHOLDER}:${(value as { length: number }).length}`;
      }
      return VECTOR_PLACEHOLDER;
    }
    return PLACEHOLDER;
  }
  return value;
}

function redact(obj: unknown, parentKey?: string): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => redact(v, parentKey));
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = redactValue(k, redact(v, k));
    }
    return out;
  }
  if (typeof parentKey === 'string') {
    return redactValue(parentKey, obj);
  }
  return obj;
}

function isProd(): boolean {
  try {
    return import.meta.env.PROD === true;
  } catch {
    return false;
  }
}

/**
 * Logger seguro. Si está en producción, redacta campos sensibles; en
 * development pasa el payload tal cual para debugging.
 */
export const safeLog = {
  debug(...args: unknown[]) {
    if (isProd()) {
      // eslint-disable-next-line no-console
      console.debug(...args.map((a) => redact(a)));
    } else {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
  info(...args: unknown[]) {
    if (isProd()) {
      // eslint-disable-next-line no-console
      console.info(...args.map((a) => redact(a)));
    } else {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  warn(...args: unknown[]) {
    if (isProd()) {
      // eslint-disable-next-line no-console
      console.warn(...args.map((a) => redact(a)));
    } else {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error(...args: unknown[]) {
    if (isProd()) {
      // eslint-disable-next-line no-console
      console.error(...args.map((a) => redact(a)));
    } else {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  },
};

/**
 * Trunca rutas absolutas en stack traces para no leak-ear estructura de
 * archivos del dispositivo. Aplica a string-based formatters (no reemplaza
 * la API Error.prepareStackTrace del navegador).
 */
export function truncatePaths<T>(input: T): T {
  if (typeof input === 'string') {
    return input.replace(
      /(?:[A-Za-z]:)?[\\/][^\\/\s]+[\\/][^\\/\s]+[\\/][^\\/\s]+\.ts/gi,
      (match) => {
        const parts = match.split(/[\\/]/);
        return `…/${parts[parts.length - 1]}`;
      },
    ) as unknown as T;
  }
  return input;
}

/**
 * Monkey-patch de console en producción. Llamar UNA vez desde `main.tsx`.
 */
export function patchConsole(): void {
  if (!isProd()) return;
  const orig = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  console.log = (...args: unknown[]) =>
    orig.log(...(args.map((a) => truncatePaths(redact(a))) as unknown[]));
  console.debug = (...args: unknown[]) =>
    orig.debug(...(args.map((a) => truncatePaths(redact(a))) as unknown[]));
  console.info = (...args: unknown[]) =>
    orig.info(...(args.map((a) => truncatePaths(redact(a))) as unknown[]));
  console.warn = (...args: unknown[]) =>
    orig.warn(...(args.map((a) => truncatePaths(redact(a))) as unknown[]));
  console.error = (...args: unknown[]) =>
    orig.error(...(args.map((a) => truncatePaths(redact(a))) as unknown[]));
}
