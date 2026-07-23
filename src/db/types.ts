/**
 * Tipos TypeScript de la capa DB.
 *
 * - `NoteRow`        : shape literal tal y como aparece en `notes` (sqlite).
 * - `NoteItem`       : shape UI ya con JSON parseado, sin timestamps SQL.
 * - `NewNoteInput`   : entrada "limpia" para NotesRepository.create().
 * - `VectorHit`      : resultado de la KNN search.
 *
 * Las funciones `rowToNote` / `noteToRow` son el corazón del espejo
 * entre la capa SQL y los componentes React; sólo se permiten conversiones
 * allí, nunca en la UI.
 */

import type {
  ChecklistItem,
  EntityMetric,
  NoteItem,
  NoteType,
  ContextCategory,
} from '../types';

export type SourceType = 'text' | 'audio';

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;            // JSON array serializado
  source_type: SourceType;
  type: NoteType;
  icon: string;
  summary: string | null;
  audio_duration: string | null;
  image_url: string | null;
  checklist_json: string | null;
  entity_metric_json: string | null;
  connected_ids_json: string;
  is_pinned: 0 | 1;
  created_at: string;
  updated_at: string;
}

export function rowToNote(row: NoteRow): NoteItem {
  const tags: string[] = JSON.parse(row.tags || '[]');
  const connectedNodeIds: string[] = JSON.parse(row.connected_ids_json || '[]');
  const checklist: ChecklistItem[] | undefined = row.checklist_json
    ? (JSON.parse(row.checklist_json) as ChecklistItem[])
    : undefined;
  const entityMetric: EntityMetric | undefined = row.entity_metric_json
    ? (JSON.parse(row.entity_metric_json) as EntityMetric)
    : undefined;

  // Format SQL timestamp a la forma "XH AGO / YESTERDAY / 2 DAYS AGO"
  const timestamp = formatRelative(row.updated_at, row.created_at);

  return {
    id: row.id,
    title: row.title,
    content: row.content || undefined,
    type: row.type,
    timestamp,
    category: row.category as ContextCategory,
    summary: row.summary ?? undefined,
    tags,
    icon: row.icon,
    audioDuration: row.audio_duration ?? undefined,
    checklist,
    imageUrl: row.image_url ?? undefined,
    entityMetric,
    connectedNodeIds,
    isPinned: row.is_pinned === 1,
  };
}

export interface NewNoteInput {
  title: string;
  type: NoteType;
  category: ContextCategory;
  tags: string[];
  icon: string;
  summary?: string;
  content?: string;
  source_type?: SourceType;
  audioDuration?: string;
  checklist?: ChecklistItem[];
  imageUrl?: string;
  entityMetric?: EntityMetric;
  connectedNodeIds?: string[];
  isPinned?: boolean;
}

export interface VectorHit {
  noteId: string;
  similarity: number; // [0, 1]
}

function formatRelative(updatedAt: string, _createdAt: string): string {
  // Fecha SQL en formato "YYYY-MM-DD HH:MM:SS" — la tratamos como UTC.
  const updated = new Date(updatedAt.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'JUST NOW';
  if (diffMin < 60) return `${diffMin}M AGO`;
  if (diffHr < 6) return `${diffHr}H AGO`;
  if (diffHr < 24) return 'TODAY';
  if (diffDay === 1) return 'YESTERDAY';
  if (diffDay < 4) return `${diffDay} DAYS AGO`;
  // Older: format JAN 05 etc.
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[updated.getUTCMonth()]} ${String(updated.getUTCDate()).padStart(2, '0')}`;
}
