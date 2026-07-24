/**
 * Key Derivation Functions (KDF) — Web Crypto API only.
 *
 * - PBKDF2-SHA256 with 600 000 iterations (OWASP 2023+ guidance for AES-256).
 * - HKDF-SHA256 (RFC 5869) para subdividir el material en subclaves.
 *
 * Ninguna dependencia externa. Compatible con Chrome / Firefox / Safari
 * modernos (SubtleCrypto.deriveBits + deriveKey disponibles).
 */

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_LEN_BITS = 256;
const HKDF_HASH = 'SHA-256';

const enc = new TextEncoder();

/**
 * Deriva un buffer crudo (kdk) a partir de un PIN/passphrase.
 * El caller descarta el buffer tras usarlo; nunca se persiste en claro.
 */
export async function deriveKdk(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: 'AES-GCM', length: PBKDF2_KEY_LEN_BITS },
    false, // non-extractable — handles opacos
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

/**
 * HKDF-Expand: convierte un IKM (Input Key Material) crudo en N subclaves.
 * Se usa para que la misma `masterKey` derive múltiples claves con
 * propósitos disjuntos.
 */
export async function hkdfExpand(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: string,
  byteLength = 32,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: HKDF_HASH,
      salt,
      info: enc.encode(info),
    },
    baseKey,
    byteLength * 8,
  );

  return new Uint8Array(bits);
}

/** Compara dos buffers en tiempo constante. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let acc = 0;
  for (let i = 0; i < a.byteLength; i++) {
    acc |= a[i] ^ b[i];
  }
  return acc === 0;
}

/** SHA-256 hex de un buffer. Usado para el hash de la recovery seed. */
export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? enc.encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
