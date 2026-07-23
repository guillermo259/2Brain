/**
 * recoverySeed.ts — Generación, validación y derivación de la BIP-39 seed.
 *
 * 128 bits de entropía → 12 palabras. La seed NUNCA se persiste en claro:
 *   - Para detectar duplicados al re-introducir, se guarda un hash salt+seed.
 *   - Para recuperar acceso, se re-deriva una clave alternativa (seed-key)
 *     capaz de descifrar la copia secundaria de la masterKey.
 */

import * as bip39 from 'bip39';
import { deriveKdk } from './kdf';

/**
 * Convert Uint8Array to hex string. We use hex instead of `Buffer`
 * because `Buffer` is not available in browser bundles without a
 * polyfill, and bip39's `.d.ts` declares the param as `Buffer | string`.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Genera una nueva mnemonic de 12 palabras (128 bits entropía). */
export function generateMnemonic12(): string {
  const entropy = crypto.getRandomValues(new Uint8Array(16));
  return bip39.entropyToMnemonic(bytesToHex(entropy));
}

/**
 * Valida la mnemonic introducida por el usuario.
 */
export function validateMnemonic(input: string): boolean {
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, ' ');
  return bip39.validateMnemonic(trimmed);
}

/** Devuelve la entropía cruda (16 bytes) detrás de una mnemonic válida. */
export function mnemonicToEntropy(input: string): Uint8Array {
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!bip39.validateMnemonic(trimmed)) {
    throw new Error('Invalid recovery phrase');
  }
  const hex = bip39.mnemonicToEntropy(trimmed);
  return hexToBytes(hex);
}

/**
 * Deriva una AES-GCM CryptoKey desde la mnemonic usando PBKDF2.
 * Se usa como master-key para un "brain seed-only" o para recovery flows.
 */
export async function deriveKeyFromMnemonic(
  mnemonic: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  return deriveKdk(mnemonic.trim().toLowerCase(), salt);
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
