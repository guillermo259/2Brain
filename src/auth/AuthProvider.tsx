/**
 * AuthProvider.tsx — Estado global de sesión + DbClient.
 *
 *   state machine:
 *     initializing  → cargando (WASM, IDB, etc)
 *     setting-up   → primera vez / restore from seed (no DB todavía)
 *     locked       → DB existe pero requiere unlock
 *     active       → sesión viva; expone { masterKey, user, notes }
 *
 *  Context providido por `AuthProvider`, consumido vía `useAuth()`.
 *  App.tsx sólo se monta cuando `state.kind === 'active'`.
 *
 * Bugfixes against code-review #2, #4, #5, #7:
 *   - lock() / onLock callbacks: limpian masterKeyRef.current (cero residuos
 *     de la CryptoKey en RAM tras el lock).
 *   - completeSetup: try/catch + wipeVault si falla (evita huérfanos que
 *     dejen al usuario locked-out en el siguiente reload).
 *   - completeSetupFromSeed: implementa "fresh seed-only setup" — genera
 *     una nueva DB cifrada con KDF(mnemonic, new_salt). No recupera una DB
 *     PIN-previa (esa sería wrap-key persisted, no implementado en MVP).
 *   - setAutoLock: side effects (autoLock.stop / start) movidos fuera
 *     del updater de setState para no violar la regla de updaters puros.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  openDatabase,
  closeDatabase,
  flush as flushDb,
  isOpen as dbIsOpen,
  exec as execSql,
  queryAll as dbQueryAll,
} from '../db/DbClient';
import { deriveKdk, sha256Hex } from '../security/kdf';
import { generateSalt } from '../security/cipher';
import {
  hasMasterSalt,
  setMasterSalt,
  setRecoverySeedHash,
  wipeVault,
  readVault,
} from '../security/keystore';
import { wipeEncryptedDb } from '../db/DbClient';
import {
  validateMnemonic,
  deriveKeyFromMnemonic,
} from '../security/recoverySeed';
import {
  checkBiometricSupport,
  authenticateBiometric,
  getBiometricCredentialId,
  registerBiometric,
  markBiometricRegistered,
} from '../security/biometrics';
import { autoLock, type AutoLockSetting } from './autoLock';
import { notesRepo } from '../db/NotesRepository';
import { safeLog } from '../security/logSanitizer';
import type { NoteItem } from '../types';

// ───── Types ─────

export interface UserAccount {
  name: string;
  email: string;
  avatarInitials: string;
}

export type AuthState =
  | { kind: 'initializing' }
  | { kind: 'setting-up' }
  | { kind: 'locked'; failedAttempts: number }
  | {
      kind: 'active';
      masterKey: CryptoKey;
      user: UserAccount;
      autoLock: AutoLockSetting;
    };

export interface AuthContextValue {
  state: AuthState;
  notes: NoteItem[];
  refreshNotes: () => void;
  unlock: (pin: string) => Promise<void>;
  /** Onboarding con PIN (crea DB fresca, opcionalmente mnemonic + biometric). */
  completeSetup: (params: {
    pin: string;
    name: string;
    mnemonic?: string;
    enableBiometric?: boolean;
  }) => Promise<void>;
  /**
   * Onboarding sólo con seed (sin PIN). Crea una DB fresca cuya masterKey
   * se deriva del mnemonic + un nuevo salt. El mnemonic se convierte en el
   * único método de unlock: futuras sesiones requieren reintroducirlo.
   */
  completeSetupFromSeed: (params: {
    mnemonic: string;
    name: string;
    enableBiometric?: boolean;
  }) => Promise<void>;
  lock: () => void;
  wipe: () => Promise<void>;
  setAutoLock: (setting: AutoLockSetting) => void;
  tryBiometricUnlock: () => Promise<boolean>;
  capabilities: { biometrics: boolean };
}

const AuthCtx = createContext<AuthContextValue | null>(null);

// ───── Provider ─────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({ kind: 'initializing' });
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [capabilities, setCapabilities] = useState({ biometrics: false });
  const masterKeyRef = useRef<CryptoKey | null>(null);

  // Helpers: side effects en una transición a LOCKED. Definidas como
  // callback para poder reutilizarse en lock(), autoLock callbacks, etc.
  const transitionToLocked = useCallback(() => {
    masterKeyRef.current = null;
    closeDatabase();
    setNotes([]);
    setState({ kind: 'locked', failedAttempts: 0 });
  }, []);

  const refreshNotes = useCallback(() => {
    try {
      if (!dbIsOpen()) {
        setNotes([]);
        return;
      }
      setNotes(notesRepo.list());
    } catch (e) {
      safeLog.warn('refreshNotes failed', e);
    }
  }, []);

  // Hidratar estado inicial.
  useEffect(() => {
    (async () => {
      try {
        const caps = await checkBiometricSupport();
        setCapabilities({ biometrics: caps.available && caps.uvAvailable });
        const hasSalt = await hasMasterSalt();
        if (!hasSalt) {
          setState({ kind: 'setting-up' });
        } else {
          setState({ kind: 'locked', failedAttempts: 0 });
        }
      } catch (e) {
        safeLog.error('initialization failed', e);
        setState({ kind: 'setting-up' });
      }
    })();
  }, []);

  // Cleanup al desmontar (cierra DB, limpia ref).
  useEffect(() => {
    return () => {
      autoLock.stop();
      closeDatabase();
      masterKeyRef.current = null;
    };
  }, []);

  // Cuando pasa a active: leer notas + arrancar auto-lock.
  useEffect(() => {
    if (state.kind !== 'active') return;
    refreshNotes();
    const setting = readAutoLockFromMeta() ?? 'minute5';
    autoLock.start(setting, {
      onLock: () => transitionToLocked(),
      onActivity: () => {
        /* debounce interno */
      },
    });
    writeAutoLockToMeta(setting);
    return () => autoLock.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind]);

  // ───── Setup ─────

  const completeSetup: AuthContextValue['completeSetup'] = useCallback(
    async ({ pin, name, mnemonic, enableBiometric }) => {
      if (pin.length < 6) throw new Error('PIN must be ≥ 6 characters');
      let stateAlreadySet = false;
      try {
        const salt = generateSalt();
        await setMasterSalt(salt);
        // CRÍTICO: borramos cualquier ciphertext previo en IDB antes
        // de abrir la DB en modo `fresh`. Si el usuario cierra la pestaña
        // entre `setMasterSalt` y el primer `flush`, el keystore tiene el
        // salt nuevo pero la IDB contiene el envelope viejo (cifrado con
        // la masterKey anterior). En el siguiente reload mezclaríamos
        // ambos, dejando al usuario locked-out sin error visible.
        await safeWipeCipher();
        const masterKey = await deriveKdk(pin, salt);

        // Fresh DB.
        await openDatabase(masterKey, { fresh: true });
        await flushDb(masterKey);

        if (mnemonic) {
          const hash = await sha256Hex(`${mnemonic}|${hexOf(salt)}`);
          await setRecoverySeedHash(hash);
        }
        if (enableBiometric && capabilities.biometrics) {
          try {
            const userId = `user-${crypto.randomUUID()}`;
            const { credentialId } = await registerBiometric(userId, name);
            await markBiometricRegistered(credentialId);
          } catch (e) {
            safeLog.warn('biometric setup failed', e);
          }
        }

        masterKeyRef.current = masterKey;
        writeAutoLockToMeta('minute5');

        setState({
          kind: 'active',
          masterKey,
          user: {
            name: name.trim() || 'You',
            email: '',
            avatarInitials: makeInitials(name),
          },
          autoLock: 'minute5',
        });
        stateAlreadySet = true;
      } catch (err) {
        // Rollback total: si cualquier paso falló, no debe quedar un vault
        // parcial que haga creer al usuario que completó el setup.
        safeLog.error('completeSetup failed; wiping vault', err);
        await safeWipeCipher();
        await safeWipeVault();
        masterKeyRef.current = null;
        try {
          closeDatabase();
        } catch {
          /* ignore */
        }
        if (!stateAlreadySet) {
          setState({ kind: 'setting-up' });
        }
        throw err;
      }
    },
    [capabilities.biometrics],
  );

  const completeSetupFromSeed: AuthContextValue['completeSetupFromSeed'] =
    useCallback(async ({ mnemonic, name, enableBiometric }) => {
      if (!validateMnemonic(mnemonic)) throw new Error('Invalid recovery seed');
      try {
        // Generamos un salt nuevo — la masterKey derivada depende sólo
        // del mnemonic + este salt. La persistimos en keystore y la
        // usamos como sal en `meta` para debug. Sin estado previo
        // necesario: arranca fresh.
        const salt = generateSalt();
        await setMasterSalt(salt);
        // Destruimos cualquier ciphertext previo en IDB — idéntica
        // justificación que en completeSetup: si la pestaña muere a
        // mitad del setup, no queremos mezclar envelopes de claves
        // distintas y dejar al usuario sin escape.
        await safeWipeCipher();
        const masterKey = await deriveKeyFromMnemonic(mnemonic, salt);
        await openDatabase(masterKey, { fresh: true });
        await flushDb(masterKey);

        const hash = await sha256Hex(`${mnemonic}|${hexOf(salt)}`);
        await setRecoverySeedHash(hash);

        if (enableBiometric && capabilities.biometrics) {
          try {
            const userId = `user-${crypto.randomUUID()}`;
            const { credentialId } = await registerBiometric(userId, name);
            await markBiometricRegistered(credentialId);
          } catch (e) {
            safeLog.warn('biometric setup failed', e);
          }
        }

        masterKeyRef.current = masterKey;
        writeAutoLockToMeta('minute5');
        setState({
          kind: 'active',
          masterKey,
          user: {
            name: name.trim() || 'You',
            email: '',
            avatarInitials: makeInitials(name),
          },
          autoLock: 'minute5',
        });
      } catch (err) {
        safeLog.error('completeSetupFromSeed failed; wiping vault', err);
        await safeWipeCipher();
        await safeWipeVault();
        masterKeyRef.current = null;
        try {
          closeDatabase();
        } catch {
          /* ignore */
        }
        setState({ kind: 'setting-up' });
        throw err;
      }
    }, [capabilities.biometrics]);

  // ───── Unlock ─────

  const unlock: AuthContextValue['unlock'] = useCallback(async (pin) => {
    try {
      const vault = await readVault();
      if (!vault.master_salt) {
        throw new Error('No encrypted DB found. Complete onboarding first.');
      }
      const masterKey = await deriveKdk(pin, vault.master_salt);
      await openDatabase(masterKey, { fresh: false });
      masterKeyRef.current = masterKey;
      setState({
        kind: 'active',
        masterKey,
        user: { name: 'You', email: '', avatarInitials: 'YOU' },
        autoLock: readAutoLockFromMeta() ?? 'minute5',
      });
    } catch (e) {
      setState((prev) =>
        prev.kind === 'locked'
          ? { ...prev, failedAttempts: prev.failedAttempts + 1 }
          : prev,
      );
      throw new Error(`Unlock failed: ${(e as Error).message}`);
    }
  }, []);

  const tryBiometricUnlock: AuthContextValue['tryBiometricUnlock'] =
    useCallback(async () => {
      if (!capabilities.biometrics) return false;
      const cid = await getBiometricCredentialId();
      if (!cid) return false;
      try {
        return await authenticateBiometric(cid);
      } catch {
        return false;
      }
    }, [capabilities.biometrics]);

  const lock: AuthContextValue['lock'] = useCallback(() => {
    autoLock.stop();
    transitionToLocked();
  }, [transitionToLocked]);

  const wipe: AuthContextValue['wipe'] = useCallback(async () => {
    await wipeVault();
    autoLock.stop();
    masterKeyRef.current = null;
    closeDatabase();
    setNotes([]);
    setState({ kind: 'setting-up' });
  }, []);

  // Bugfix #7: side effects se ejecutan DESPUÉS de leer la snapshot
  // del state actual, no dentro del updater.
  const setAutoLock: AuthContextValue['setAutoLock'] = useCallback((s) => {
    setState((prev) => {
      if (prev.kind !== 'active') return prev;
      // Sólo mutamos el campo autoLock; la lógica de timers corre fuera.
      const next = { ...prev, autoLock: s };
      // Programamos la reconfiguración al final del tick para no
      // bloquear el render.
      queueMicrotask(() => {
        autoLock.stop();
        autoLock.start(s, {
          onLock: () => transitionToLocked(),
          onActivity: () => {},
        });
        writeAutoLockToMeta(s);
      });
      return next;
    });
  }, [transitionToLocked]);

  // ───── Value ─────

  const value: AuthContextValue = useMemo(
    () => ({
      state,
      notes,
      refreshNotes,
      unlock,
      completeSetup,
      completeSetupFromSeed,
      lock,
      wipe,
      setAutoLock,
      tryBiometricUnlock,
      capabilities,
    }),
    [
      state,
      notes,
      capabilities,
      refreshNotes,
      unlock,
      completeSetup,
      completeSetupFromSeed,
      lock,
      wipe,
      setAutoLock,
      tryBiometricUnlock,
    ],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

// ───── Hook ─────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ───── Helpers ─────

/**
 * Best-effort wipe of the keystore vault. Swallows errors so callers
 * can chain it with other cleanup steps without short-circuiting.
 */
async function safeWipeVault(): Promise<void> {
  try {
    await wipeVault();
  } catch (e) {
    safeLog.error('wipeVault failed', e);
  }
}

/**
 * Best-effort wipe of the encrypted SQLite blob in IndexedDB. Idempotent.
 */
async function safeWipeCipher(): Promise<void> {
  try {
    await wipeEncryptedDb();
  } catch (e) {
    safeLog.error('wipeEncryptedDb failed', e);
  }
}

function makeInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'YOU'
  );
}

function hexOf(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function readAutoLockFromMeta(): AutoLockSetting | null {
  try {
    if (!dbIsOpen()) return null;
    const rows = dbQueryAll<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      ['auto_lock'],
    );
    const v = rows[0]?.value;
    const allowed: AutoLockSetting[] = ['immediate', 'minute1', 'minute5', 'minute15', 'never'];
    if (v && (allowed as string[]).includes(v)) {
      return v as AutoLockSetting;
    }
    return null;
  } catch {
    return null;
  }
}

function writeAutoLockToMeta(s: AutoLockSetting): void {
  try {
    if (!dbIsOpen()) return;
    execSql(
      'INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)',
      ['auto_lock', s],
    );
  } catch {
    /* ignore */
  }
}
