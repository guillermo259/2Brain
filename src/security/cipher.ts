/**
 * cipher.ts — Cifrado transparente AES-256-GCM del blob completo de SQLite.
 *
 * Reemplaza la `PRAGMA key = '...'` de SQLCipher para navegador (sql.js).
 * Mismo nivel de seguridad: AES-256, modo autenticado GCM, IV aleatorio
 * por escritura, AAD para ligar el blob a esta app y versión.
 *
 * Formato del blob en reposo (binario):
 *
 *   ┌──────────┬──────────┬────────────┬──────────┬───────────────────┬──────────────┐
 *   │ magic    │ version  │ salt (32B) │ iv (12B) │ gcm-ciphertext    │ gcm-tag (16B)│
 *   │ "2BDB"   │ 0x01     │            │          │                   │ (GCM auto)   │
 *   └──────────┴──────────┴────────────┴──────────┴───────────────────┴──────────────┘
 *
 * El `salt` se reutiliza del setup original (PBKDF2). El `iv` se regenera
 * por cada flush.
 */

const MAGIC = new Uint8Array([0x32, 0x42, 0x44, 0x42]); // "2BDB"
const VERSION = 0x01;
const SALT_LEN = 32;
const IV_LEN = 12;
const AAD = new TextEncoder().encode('2brain/v1');

export interface EncryptedBlob {
  ciphertext: Uint8Array; // full envelope (magic|version|salt|iv|ct|tag)
  salt: Uint8Array;
  iv: Uint8Array;
}

export class CipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CipherError';
  }
}

/**
 * Cifra el blob completo del fichero SQLite.
 * Devuelve el ciphertext incluyendo el envelope binario.
 */
export async function encryptDb(
  plaintext: Uint8Array,
  masterKey: CryptoKey,
  salt: Uint8Array,
): Promise<Uint8Array> {
  if (salt.byteLength !== SALT_LEN) {
    throw new CipherError(
      `salt must be ${SALT_LEN} bytes (got ${salt.byteLength})`,
    );
  }
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: AAD },
      masterKey,
      plaintext,
    ),
  );

  // Envelope: magic | version | salt | iv | ciphertext (incluye tag GCM al final)
  const out = new Uint8Array(
    MAGIC.length + 1 + SALT_LEN + IV_LEN + ct.byteLength,
  );
  let offset = 0;
  out.set(MAGIC, offset);
  offset += MAGIC.length;
  out[offset++] = VERSION;
  out.set(salt, offset);
  offset += SALT_LEN;
  out.set(iv, offset);
  offset += IV_LEN;
  out.set(ct, offset);

  return out;
}

/**
 * Descifra y valida el envelope. Lanza `CipherError` si el magic o la
 * autenticación GCM fallan (clave incorrecta o datos corruptos).
 */
export async function decryptDb(
  envelope: Uint8Array,
  masterKey: CryptoKey,
): Promise<Uint8Array> {
  if (envelope.byteLength < MAGIC.length + 1 + SALT_LEN + IV_LEN + 16) {
    throw new CipherError('envelope too short');
  }
  // Magic check
  for (let i = 0; i < MAGIC.length; i++) {
    if (envelope[i] !== MAGIC[i]) {
      throw new CipherError('magic bytes mismatch (wrong app or corrupt file)');
    }
  }
  const version = envelope[MAGIC.length];
  if (version !== VERSION) {
    throw new CipherError(`unsupported envelope version ${version}`);
  }
  const offsetCt = MAGIC.length + 1 + SALT_LEN + IV_LEN;
  const iv = envelope.slice(MAGIC.length + 1 + SALT_LEN, offsetCt);
  const ct = envelope.slice(offsetCt);

  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: AAD },
    masterKey,
    ct,
  );

  return new Uint8Array(pt);
}

/** Extrae el salt del envelope (necesario para re-derivar la KDF). */
export function extractSalt(envelope: Uint8Array): Uint8Array {
  if (envelope.byteLength < MAGIC.length + 1 + SALT_LEN) {
    throw new CipherError('envelope too short to extract salt');
  }
  return envelope.slice(MAGIC.length + 1, MAGIC.length + 1 + SALT_LEN);
}

/** Genera un nuevo salt para una DB recién creada. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LEN));
}
