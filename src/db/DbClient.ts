/**
 * DbClient.ts — Wrapper singleton sobre sql.js con cifrado at rest.
 *
 * Responsabilidades:
 *   1. Cargar el WASM de sql.js (lazy) usando `?url` para que Vite sirva
 *      el archivo `.wasm`.
 *   2. Manejar un único `Database` activo por sesión (locked / ready).
 *   3. Aplicar PRAGMAS y migraciones en openDatabase.
 *   4. Proteger TODA query contra SQL injection forzando el camino de
 *      `prepare().run()` o `prepare().bind(...).step()`.
 *   5. Exportar el blob encriptado a IndexedDB tras transacciones; abrir
 *      la DB en sesión descifrando el blob.
 *
 * Encryption slot constants:
 *   IDB_KEY_DBCIPHER  :   Uint8Array (envelope AES-GCM-GCM del .db).
 */

import initSqlJs, { type SqlJsStatic, type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { PRAGMAS } from './schema';
import { runMigrations } from './migrations';
import {
  decryptDb,
  encryptDb,
  extractSalt,
  generateSalt,
} from '../security/cipher';
import { readVault } from '../security/keystore';

const IDB_DB_NAME = '2brain-db';
const IDB_DB_VERSION = 1;
const IDB_STORE = 'db';
const IDB_KEY_DBCIPHER = '2brain.db.ciphertext';

let _sqlPromise: Promise<SqlJsStatic> | null = null;
let _db: Database | null = null;

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!_sqlPromise) {
    _sqlPromise = initSqlJs({
      // Vite sirve el .wasm con hash determinista gracias a `?url`.
      locateFile: () => wasmUrl,
    });
  }
  return _sqlPromise;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetCipher(): Promise<Uint8Array | undefined> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY_DBCIPHER);
    req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutCipher(blob: Uint8Array): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, IDB_KEY_DBCIPHER);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClearCipher(): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY_DBCIPHER);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Public API ----------

export interface OpenOptions {
  /** Si true, crea una nueva DB nueva (con salt nuevo). */
  fresh?: boolean;
}

/**
 * Importante: el caller ya tiene la `masterKey` AES-GCM derivada del PIN
 * (vía PBKDF2). Pasarla aquí significa que la DB nunca se monta con una
 * clave incorrecta — o descifra o falla.
 */
export async function openDatabase(
  masterKey: CryptoKey,
  opts: OpenOptions = {},
): Promise<Database> {
  const SQL = await loadSqlJs();

  let plaintext: Uint8Array | undefined;

  if (!opts.fresh) {
    const envelope = await idbGetCipher();
    if (envelope && envelope.byteLength > 0) {
      plaintext = await decryptDb(envelope, masterKey);
      // Asegurar sincronía: el master_salt debería coincidir con el del
      // envelope. Defensa en profundidad: si alguien manipula el IDB
      // (poco probable sin acceso root), lo detectamos aquí.
      const envSalt = extractSalt(envelope);
      const vault = await readVault();
      if (vault.master_salt && !bytesEq(envSalt, vault.master_salt)) {
        throw new Error(
          'salt mismatch between keystore and ciphertext envelope',
        );
      }
    }
  }

  _db = plaintext ? new SQL.Database(plaintext) : new SQL.Database();

  // PRAGMAs.
  for (const pragma of PRAGMAS) {
    _db.exec(pragma);
  }

  // Schema + migrations.
  if (opts.fresh || !plaintext) {
    runMigrations(_db);
    if (opts.fresh) {
      // Stamp master_salt HEX en meta para debugging / forward-compat.
      // La fuente de verdad sigue siendo keystore.idb (no esta row).
      const freshSalt = generateSalt();
      const stmt = _db.prepare(
        'INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)',
      );
      stmt.run(['master_salt_hex', bytesToHex(freshSalt)]);
      stmt.free();
    }
  }

  return _db;
}

export function getDb(): Database {
  if (!_db) throw new Error('Database not opened');
  return _db;
}

export function isOpen(): boolean {
  return _db !== null;
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Persiste la DB cifrada a disco (IndexedDB). Llamado tras cada mutación
 * para que la siguiente sesión pueda leer la versión actual.
 */
export async function flush(masterKey: CryptoKey): Promise<void> {
  if (!_db) return;
  const plaintext = _db.export();
  const vault = await readVault();
  const salt = vault.master_salt ?? generateSalt();
  const envelope = await encryptDb(plaintext, masterKey, salt);
  await idbPutCipher(envelope);
}

/** Elimina el blob encriptado del keystore. */
export async function wipeEncryptedDb(): Promise<void> {
  await idbClearCipher();
}

// Helpers internos (timing-safe equals + hex encoding). Local a la DB layer.

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let acc = 0;
  for (let i = 0; i < a.byteLength; i++) acc |= a[i] ^ b[i];
  return acc === 0;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

// ---------- Helpers SQL públicos ----------

/** Helper que combina prepare / binding / step en un único array de objetos. */
export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T[] {
  const db = getDb();
  const out: T[] = [];
  const stmt = db.prepare(sql);
  // sql.js espera `BindParams` = unknown[] | { [k]: unknown }. Cast a
  // `any[]` evita la fricción de TS con firmas opcionales en
  // `.d.ts` (`bind(values?: BindParams)`) y mantiene seguridad de tipo
  // end-to-end via prepared-statement (los valores siguen siendo
  // parámetros, nunca concatenados al SQL).
  stmt.bind(params as unknown as any[]);
  while (stmt.step()) {
    out.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return out;
}

/** Helper que ejecuta una sola fila. */
export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  const rows = queryAll<T>(sql, params);
  return rows[0];
}

/**
 * Helper que ejecuta una statement sin retorno (INSERT/UPDATE/DELETE).
 * Importante: usar SIEMPRE este helper o `db.prepare(...).run([params])`
 * — NUNCA concatenar params en el SQL.
 */
export function exec(sql: string, params: unknown[] = []): void {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.run(params as unknown as any[]);
  stmt.free();
}
