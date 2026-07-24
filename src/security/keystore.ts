/**
 * keystore.ts — Persistencia no-sensible del setup de 2Brain.
 *
 * Diseño simplificado para MVP web:
 *
 *   La `masterKey` es un `CryptoKey` AES-GCM **no-extractable** derivado
 *   vía PBKDF2 del PIN del usuario + un `master_salt`. Ese salt sí se
 *   puede persistir (no es secreto; sólo adds entropy y binds el keystore
 *   a esta instalación). En cada unlock basta con entrar el PIN y
 *   re-derivar la misma `masterKey` deterministicamente.
 *
 * Por tanto NO guardamos la masterKey envuelta: basta con el `master_salt`.
 * Tampoco wrap/unwrap: es código muerto — derivamos on demand.
 *
 * Lo que SÍ persiste (todo no-secreto):
 *   - master_salt          : 32B random, necesario para re-derivar la key.
 *   - biometric_enabled    : boolean (en localStorage vía biometrics.ts).
 *   - recovery_seed_hash   : sha256(salted mnemonic) para anti brute-force.
 *   - schema_version       : 1.
 */

const DB_NAME = '2brain-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'vault';

export interface Vault {
  master_salt: Uint8Array | null;
  recovery_seed_hash: string | null;
  schema_version: number; // 1
}

const EMPTY_VAULT: Vault = {
  master_salt: null,
  recovery_seed_hash: null,
  schema_version: 1,
};

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Public API ----------

export async function readVault(): Promise<Vault> {
  const raw = await idbGet<Vault>('vault');
  return raw ?? EMPTY_VAULT;
}

export async function writeVault(v: Vault): Promise<void> {
  await idbPut('vault', v);
}

export async function hasMasterSalt(): Promise<boolean> {
  const v = await readVault();
  return v.master_salt != null;
}

export async function getMasterSalt(): Promise<Uint8Array> {
  const v = await readVault();
  if (!v.master_salt) {
    throw new Error('no master salt — onboarding not completed');
  }
  return v.master_salt;
}

export async function setMasterSalt(salt: Uint8Array): Promise<void> {
  const v = await readVault();
  await writeVault({ ...v, master_salt: salt });
}

export async function setRecoverySeedHash(hash: string): Promise<void> {
  const v = await readVault();
  await writeVault({ ...v, recovery_seed_hash: hash });
}

export async function getRecoverySeedHash(): Promise<string | null> {
  const v = await readVault();
  return v.recovery_seed_hash;
}

/** Reset total (devuelve a Onboarding). */
export async function wipeVault(): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('vault');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
