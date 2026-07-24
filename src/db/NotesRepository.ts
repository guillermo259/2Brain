import { exec, queryAll, queryOne } from './DbClient';
import type { NewNoteInput, NoteRow } from './types';
import { rowToNote } from './types';
import type { NoteItem } from '../types';

const COLUMNS = `id, title, content, category, tags, is_pinned, created_at, updated_at`;

export interface NotesRepository {
  list(): NoteItem[];
  get(id: string): NoteItem | null;
  create(input: NewNoteInput): NoteItem;
  update(id: string, patch: Partial<NewNoteInput>): NoteItem;
  delete(id: string): void;
  togglePin(id: string): NoteItem;
  count(): number;
}

function sqlNow(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

class NotesRepositoryImpl implements NotesRepository {
  list(): NoteItem[] {
    const rows = queryAll<NoteRow>(
      `SELECT ${COLUMNS} FROM notes ORDER BY is_pinned DESC, updated_at DESC`,
    );
    return rows.map(rowToNote);
  }

  get(id: string): NoteItem | null {
    const row = queryOne<NoteRow>(
      `SELECT ${COLUMNS} FROM notes WHERE id = ?`,
      [id],
    );
    return row ? rowToNote(row) : null;
  }

  create(input: NewNoteInput): NoteItem {
    const id = `note-${crypto.randomUUID()}`;
    const now = sqlNow();
    const tagsJson = JSON.stringify(input.tags ?? []);

    exec(
      `INSERT INTO notes (id, title, content, category, tags, is_pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.content ?? '', input.category ?? 'General', tagsJson, input.isPinned ? 1 : 0, now, now],
    );

    return this.get(id)!;
  }

  update(id: string, patch: Partial<NewNoteInput>): NoteItem {
    const existing = this.get(id);
    if (!existing) throw new Error(`Note not found: ${id}`);

    const next: NoteItem = {
      ...existing,
      ...patch,
      tags: patch.tags ?? existing.tags,
    };
    const now = sqlNow();

    exec(
      `UPDATE notes SET title = ?, content = ?, category = ?, tags = ?, is_pinned = ?, updated_at = ?
       WHERE id = ?`,
      [
        next.title,
        next.content,
        next.category,
        JSON.stringify(next.tags),
        next.isPinned ? 1 : 0,
        now,
        id,
      ],
    );

    return this.get(id)!;
  }

  delete(id: string): void {
    exec('DELETE FROM notes WHERE id = ?', [id]);
  }

  togglePin(id: string): NoteItem {
    const note = this.get(id);
    if (!note) throw new Error(`Note not found: ${id}`);
    return this.update(id, { isPinned: !note.isPinned });
  }

  count(): number {
    const row = queryOne<{ n: number }>('SELECT COUNT(*) as n FROM notes');
    return row?.n ?? 0;
  }
}

export const notesRepo: NotesRepository = new NotesRepositoryImpl();
