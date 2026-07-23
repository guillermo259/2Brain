import type { NoteItem, Category } from '../types';

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  is_pinned: 0 | 1;
  created_at: string;
  updated_at: string;
}

export function rowToNote(row: NoteRow): NoteItem {
  const tags: string[] = JSON.parse(row.tags || '[]');
  const timestamp = formatRelative(row.updated_at, row.created_at);

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category as Category,
    tags,
    isPinned: row.is_pinned === 1,
    timestamp,
  };
}

export interface NewNoteInput {
  title: string;
  content?: string;
  category?: Category;
  tags?: string[];
  isPinned?: boolean;
}

export interface VectorHit {
  noteId: string;
  similarity: number;
}

function formatRelative(updatedAt: string, _createdAt: string): string {
  const normalized = updatedAt.includes('T')
    ? updatedAt
    : updatedAt.replace(' ', 'T');
  const iso = normalized.endsWith('Z') ? normalized : normalized + 'Z';
  const updated = new Date(iso);
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
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[updated.getUTCMonth()]} ${String(updated.getUTCDate()).padStart(2, '0')}`;
}
