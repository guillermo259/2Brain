export const SCHEMA_V1_NOTES = `
CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    category   TEXT NOT NULL DEFAULT 'General',
    tags       TEXT NOT NULL DEFAULT '[]',
    is_pinned  INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const SCHEMA_V2_ADD_COLUMNS = [
  `ALTER TABLE notes ADD COLUMN embedding BLOB;`,
  `ALTER TABLE notes ADD COLUMN auto_categorized INTEGER NOT NULL DEFAULT 0;`,
];

export const SCHEMA_V2_PIPELINE_LOG = `
CREATE TABLE IF NOT EXISTS pipeline_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id    TEXT NOT NULL,
    stage      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    input_json TEXT,
    output_json TEXT,
    error      TEXT,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
`;

export const SCHEMA_V2_INDEX_PIPELINE = `
CREATE INDEX IF NOT EXISTS idx_pipeline_log_note_id ON pipeline_log(note_id);
`;

export const SCHEMA_V1_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_notes_category   ON notes(category);
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
  SCHEMA_V1_INDEXES,
  SCHEMA_V1_META,
];

export const PRAGMAS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
  'PRAGMA foreign_keys = ON;',
  'PRAGMA busy_timeout = 5000;',
];
