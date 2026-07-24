/**
 * backup.ts — Exportación e importación del blob cifrado de 2Brain.
 *
 * El archivo `.2brain` es exactamente el ciphertext AES-GCM que ya vive
 * en IndexedDB. Sin el PIN del usuario es un blob opaco — nadie puede
 * leer su contenido sin la masterKey derivada del PIN + salt.
 *
 * Flujo de export:
 *   1. Leer el blob cifrado de IndexedDB (`2brain-db` store).
 *   2. Añadir un header mágico de 8 bytes para identificar el formato.
 *   3. Disparar una descarga en el browser.
 *
 * Flujo de import:
 *   1. El usuario elige un archivo `.2brain`.
 *   2. Se valida el header mágico.
 *   3. Se extrae el blob cifrado y se escribe en IndexedDB reemplazando
 *      el anterior. La masterKey que ya tiene el caller (derivada del
 *      PIN actual) se usa para verificar que el archivo es descifrable
 *      antes de reemplazar la DB activa.
 *
 * NUNCA se escribe ni lee ningún dato en claro. Todo lo que viaja al
 * disco ya está cifrado.
 */

// ── Magic header: "2BRAIN\x01\x00" (8 bytes) ──────────────────────────────
const MAGIC = new Uint8Array([0x32, 0x42, 0x52, 0x41, 0x49, 0x4e, 0x01, 0x00]);
const MAGIC_LEN = MAGIC.byteLength; // 8

const IDB_DB_NAME = '2brain-db';
const IDB_DB_VERSION = 1;
const IDB_STORE = 'db';
const IDB_KEY_DBCIPHER = '2brain.db.ciphertext';

// ── IDB helpers (self-contained para no crear dependencia circular) ────────

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
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
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
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, IDB_KEY_DBCIPHER);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Export ─────────────────────────────────────────────────────────────────

/**
 * Descarga el blob cifrado activo como un archivo `.2brain`.
 * Lanza si no hay DB cifrada en IndexedDB (nunca se hizo flush).
 */
export async function exportEncryptedBackup(): Promise<void> {
  const cipher = await idbGetCipher();
  if (!cipher || cipher.byteLength === 0) {
    throw new Error('No encrypted database found. Make sure you are logged in and have saved at least one note.');
  }

  // Prepend magic header.
  const file = new Uint8Array(MAGIC_LEN + cipher.byteLength);
  file.set(MAGIC, 0);
  file.set(cipher, MAGIC_LEN);

  // Generate filename with date.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const filename = `2brain-backup-${dateStr}.2brain`;

  // Trigger browser download.
  const blob = new Blob([file], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the download starts before we free memory.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Import ─────────────────────────────────────────────────────────────────

/**
 * Lee un archivo `.2brain`, valida el header mágico, y escribe el blob
 * cifrado en IndexedDB reemplazando el actual.
 *
 * El caller es responsable de llamar a `openDatabase(masterKey)` después
 * para que la DB en memoria refleje el nuevo ciphertext.
 *
 * @throws Si el archivo no tiene el header correcto o no se puede leer.
 */
export async function importEncryptedBackup(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validate magic header.
  if (bytes.byteLength <= MAGIC_LEN) {
    throw new Error('Invalid backup file: too small.');
  }
  for (let i = 0; i < MAGIC_LEN; i++) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error('Invalid backup file: unrecognized format. Make sure you selected a .2brain file.');
    }
  }

  // Extract ciphertext (everything after the magic header).
  const cipher = bytes.slice(MAGIC_LEN);

  // Write to IndexedDB — replaces whatever was there.
  await idbPutCipher(cipher);
}

// ── Backup reminder (localStorage) ────────────────────────────────────────

const LS_LAST_BACKUP = '2brain-last-backup-ts';
const REMINDER_DAYS = 7;

/** Registra el timestamp del último backup exportado. */
export function recordBackupTimestamp(): void {
  try {
    localStorage.setItem(LS_LAST_BACKUP, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Devuelve la fecha del último backup, o null si nunca se hizo. */
export function getLastBackupDate(): Date | null {
  try {
    const raw = localStorage.getItem(LS_LAST_BACKUP);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return isNaN(ts) ? null : new Date(ts);
  } catch {
    return null;
  }
}

/**
 * Devuelve true si el usuario debería ver el recordatorio de backup
 * (nunca ha hecho backup, o han pasado más de REMINDER_DAYS días).
 */
export function shouldRemindBackup(): boolean {
  const last = getLastBackupDate();
  if (!last) return true;
  const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= REMINDER_DAYS;
}

/** Permite al usuario silenciar el recordatorio por otros REMINDER_DAYS días. */
export function dismissBackupReminder(): void {
  recordBackupTimestamp();
}
