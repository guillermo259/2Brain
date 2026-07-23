/**
 * schema.ts — DDL de la base de datos como constantes TypeScript.
 *
 * Se mantienen en archivos .ts y NO como strings SQL concatenados para:
 *   1. Pillar errores de sintaxis en tiempo de build.
 *   2. Poder importarlos desde el migration runner y el DbClient sin
 *      parseo en runtime.
 *   3. Forzar el uso de prepared statements (los PRAGMAs son exec-able
 *      directamente; las queries con params pasan siempre por prepare).
 *
 * El spec original menciona sqlite-vec; nosotros declaramos la tabla
 * virtual vec_notes para forward-compat (no se usa para queries en MVP).
 */

export const SCHEMA_V1_NOTES = `
CREATE TABLE IF NOT EXISTS notes (
    id                 TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    content            TEXT NOT NULL DEFAULT '',
    category           TEXT NOT NULL,
    tags               TEXT NOT NULL DEFAULT '[]',
    source_type        TEXT CHECK(source_type IN ('text','audio')) DEFAULT 'text',
    type               TEXT NOT NULL,
    icon               TEXT NOT NULL DEFAULT 'memory',
    summary            TEXT,
    audio_duration     TEXT,
    image_url          TEXT,
    checklist_json     TEXT,
    entity_metric_json TEXT,
    connected_ids_json TEXT NOT NULL DEFAULT '[]',
    is_pinned          INTEGER NOT NULL DEFAULT 0,
    embedding          BLOB,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const SCHEMA_V1_VEC = `
-- Tabla virtual de embeddings (forward-compat con sqlite-vec).
-- En MVP las queries de KNN se ejecutan en TS leyendo la columna
-- notes.embedding. Cuando se sustituya sql.js por wa-sqlite + vec0, esta
-- tabla se activa simplemente corriendo vec0 manualmente.
CREATE VIRTUAL TABLE IF NOT EXISTS vec_notes USING vec0(
    embedding float[384]
);
`;

export const SCHEMA_V1_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_notes_category    ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned  ON notes(is_pinned);
`;

export const SCHEMA_V1_META = `
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`;

export const SCHEMA_V1_ALL: readonly string[] = [
  SCHEMA_V1_NOTES,
  SCHEMA_V1_VEC,
  SCHEMA_V1_INDEXES,
  SCHEMA_V1_META,
];

// Constantes de PRAGMA aplicadas en openDatabase().
export const PRAGMAS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
  'PRAGMA foreign_keys = ON;',
  'PRAGMA busy_timeout = 5000;',
];
