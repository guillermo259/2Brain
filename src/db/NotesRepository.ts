/**
 * NotesRepository — CRUD de notas con prepared statements.
 *
 * Convención:
 *   - Todos los inputs de usuario pasan como `?` placeholders.
 *   - JSON arrays (tags, checklist, connected_ids) se serializan
 *     una sola vez en el caller.
 *   - El flush no se dispara automáticamente — el caller debe invocarlo
 *     tras completar la transacción de UI (commit pattern).
 */

import { exec, queryAll, queryOne } from './DbClient';
import type { NewNoteInput, NoteRow } from './types';
import { rowToNote } from './types';
import type { NoteItem, ChecklistItem } from '../types';

const COLUMNS = `
  id, title, content, category, tags, source_type, type, icon, summary,
  audio_duration, image_url, checklist_json, entity_metric_json,
  connected_ids_json, is_pinned, created_at, updated_at
`;

export interface NotesRepository {
  list(): NoteItem[];
  get(id: string): NoteItem | null;
  create(input: NewNoteInput): NoteItem;
  update(id: string, patch: Partial<NewNoteInput>): NoteItem;
  delete(id: string): void;
  togglePin(id: string): NoteItem;
  toggleChecklistItem(noteId: string, itemId: string): NoteItem;
  count(): number;
}

class NotesRepositoryImpl implements NotesRepository {
  list(): NoteItem[] {
    const rows = queryAll<NoteRow>(
      `SELECT ${COLUMNS}
         FROM notes
        ORDER BY is_pinned DESC, updated_at DESC`,
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
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(input.tags ?? []);
    const connectedJson = JSON.stringify(input.connectedNodeIds ?? []);
    const checklistJson = input.checklist ? JSON.stringify(input.checklist) : null;
    const metricJson = input.entityMetric ? JSON.stringify(input.entityMetric) : null;

    exec(
      `INSERT INTO notes (
        id, title, content, category, tags, source_type, type, icon,
        summary, audio_duration, image_url, checklist_json,
        entity_metric_json, connected_ids_json, is_pinned,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.content ?? '',
        input.category,
        tagsJson,
        input.source_type ?? 'text',
        input.type,
        input.icon,
        input.summary ?? null,
        input.audioDuration ?? null,
        input.imageUrl ?? null,
        checklistJson,
        metricJson,
        connectedJson,
        input.isPinned ? 1 : 0,
        now,
        now,
      ],
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
      connectedNodeIds: patch.connectedNodeIds ?? existing.connectedNodeIds,
      checklist: patch.checklist ?? existing.checklist,
      entityMetric: patch.entityMetric ?? existing.entityMetric,
    };
    const now = new Date().toISOString();

    exec(
      `UPDATE notes SET
        title = ?,
        content = ?,
        category = ?,
        tags = ?,
        type = ?,
        icon = ?,
        summary = ?,
        audio_duration = ?,
        image_url = ?,
        checklist_json = ?,
        entity_metric_json = ?,
        connected_ids_json = ?,
        is_pinned = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        next.title,
        next.content ?? '',
        next.category,
        JSON.stringify(next.tags),
        next.type,
        next.icon,
        next.summary ?? null,
        next.audioDuration ?? null,
        next.imageUrl ?? null,
        next.checklist ? JSON.stringify(next.checklist) : null,
        next.entityMetric ? JSON.stringify(next.entityMetric) : null,
        JSON.stringify(next.connectedNodeIds),
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

  toggleChecklistItem(noteId: string, itemId: string): NoteItem {
    const note = this.get(noteId);
    if (!note || !note.checklist) {
      throw new Error(`Note or checklist not found: ${noteId}`);
    }
    const next: ChecklistItem[] = note.checklist.map((it) =>
      it.id === itemId ? { ...it, completed: !it.completed } : it,
    );
    return this.update(noteId, { checklist: next });
  }

  count(): number {
    const row = queryOne<{ n: number }>(
      'SELECT COUNT(*) as n FROM notes',
    );
    return row?.n ?? 0;
  }
}

export const notesRepo: NotesRepository = new NotesRepositoryImpl();
