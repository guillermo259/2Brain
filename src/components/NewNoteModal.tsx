import React, { useState } from 'react';
import { NoteItem, Category, CATEGORIES, CATEGORY_COLORS } from '../types';
import { X, Sparkles } from 'lucide-react';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (newNote: NoteItem) => void;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  isOpen,
  onClose,
  onAddNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('General');
  const [tagsInput, setTagsInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      isPinned: false,
      timestamp: 'JUST NOW',
    };

    onAddNote(newNote);
    onClose();
    setTitle('');
    setContent('');
    setCategory('General');
    setTagsInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#15121b] border border-[#27272a] w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white tracking-tight">New Note</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#7e7576] hover:text-white hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              autoFocus
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                    category === cat
                      ? 'bg-white text-[#1b1b1b] shadow-lg'
                      : 'bg-[#1d1a23] border border-[#27272a] text-[#cfc4c5] hover:border-[#7e7576]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Content
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          {/* Tags */}
          <div>
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

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-white text-[#1b1b1b] font-bold text-sm hover:bg-neutral-200 transition-all shadow-xl"
            >
              Create Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
