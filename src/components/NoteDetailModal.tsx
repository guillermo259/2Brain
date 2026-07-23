import React, { useState } from 'react';
import { NoteItem, Category, CATEGORIES, CATEGORY_COLORS } from '../types';
import { X, Pin, Trash2, Clock } from 'lucide-react';

interface NoteDetailModalProps {
  note: NoteItem | null;
  onClose: () => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  onClose,
  onUpdateNote,
  onDeleteNote,
}) => {
  if (!note) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState<Category>(note.category);
  const [tagsInput, setTagsInput] = useState(note.tags.join(', '));

  const catColor = CATEGORY_COLORS[note.category];

  const handleSave = () => {
    onUpdateNote({
      ...note,
      title,
      content,
      category,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0),
    });
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#15121b] border border-[#27272a] w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#27272a] bg-[#1d1a23]/40">
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
              style={{ color: catColor, borderColor: catColor, backgroundColor: `${catColor}15` }}
            >
              {note.category}
            </span>
            <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>{note.timestamp}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateNote({ ...note, isPinned: !note.isPinned })}
              className={`p-2 rounded-full border transition-colors ${
                note.isPinned ? 'bg-white text-[#1b1b1b] border-white' : 'border-[#27272a] text-[#7e7576] hover:text-white'
              }`}
              title="Pin Note"
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDeleteNote(note.id);
                onClose();
              }}
              className="p-2 rounded-full border border-[#27272a] text-[#7e7576] hover:text-[#fe7674] hover:border-[#fe7674]/50 transition-colors"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-[#27272a] text-[#7e7576] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          <div>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-2 text-xl font-bold text-white mb-3"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                {note.title}
              </h2>
            )}

            {/* Tags display */}
            <div className="flex flex-wrap gap-2 mb-4">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#3b3742] text-[#f1f1f1] uppercase tracking-widest border border-[#27272a]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Category editor */}
            {isEditing && (
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                        category === cat
                          ? 'bg-white text-[#1b1b1b] shadow-lg'
                          : 'bg-[#1d1a23] border border-[#27272a] text-[#cfc4c5] hover:border-[#7e7576]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="bg-[#0f0d15] p-4 rounded-2xl border border-[#27272a] space-y-2">
              <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider">
                Content
              </div>
              {isEditing ? (
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl p-3 text-sm text-white resize-none"
                />
              ) : (
                <p className="text-sm text-[#cfc4c5] leading-relaxed whitespace-pre-wrap">
                  {note.content || 'No content.'}
                </p>
              )}
            </div>

            {/* Tags editing */}
            {isEditing && (
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. work, ideas, personal"
                  className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#0f0d15] flex justify-between items-center">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-full bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-colors"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2 rounded-full bg-[#1d1a23] border border-[#27272a] text-white font-bold text-xs hover:bg-[#27272a] transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#27272a] text-[#cfc4c5] hover:text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
