/**
 * migrations.ts — Migration runner para sql.js.
 *
 * Cada migración es una colección de DDL statements (constantes en
 * schema.ts). Sólo se permite DDL estático — nunca se concatenan strings
 * con valores del usuario.
 *
 * El version se persiste en `meta.schema_version`. Si la versión de la
 * migración > version actual → aplicamos y bumpeamos.
 */

import type { Database } from 'sql.js';
import { SCHEMA_V1_ALL } from './schema';

export interface Migration {
  version: number;
  name: string;
  up: readonly string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: SCHEMA_V1_ALL,
  },
  // Migraciones futuras se añaden aquí, sin tocar las anteriores.
];

const TARGET_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 1;

function readVersion(db: Database): number {
  try {
    const stmt = db.prepare('SELECT value FROM meta WHERE key = ?');
    const set: number[] = [];
    while (stmt.step()) {
      set.push(stmt.get()[0] as number);
    }
    stmt.free();
    if (set.length === 0) return 0;
    const numericValue = Number(set[0]);
    return Number.isFinite(numericValue) ? numericValue : 0;
  } catch {
    return 0;
  }
}

function writeVersion(db: Database, value: number): void {
  // upsert into meta
  const upsert = db.prepare(
    'INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
  );
  upsert.run(['schema_version', String(value)]);
  upsert.free();
}

export function runMigrations(db: Database): void {
  const current = readVersion(db);
  if (current >= TARGET_VERSION) {
    return;
  }

  for (const mig of MIGRATIONS) {
    if (mig.version <= current) continue;
    db.exec('BEGIN;');
    try {
      for (const stmt of mig.up) {
        db.exec(stmt);
      }
      writeVersion(db, mig.version);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw new Error(
        `Migration v${mig.version} (${mig.name}) failed: ${(err as Error).message}`,
      );
    }
  }
}

export const CURRENT_VERSION = TARGET_VERSION;
