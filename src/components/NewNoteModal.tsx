import React, { useState } from 'react';
import { NoteItem } from '../types';
import { X, Sparkles, Brain } from 'lucide-react';

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
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: '', // AI will generate the title
      content: content.trim(),
      category: '', // AI will assign category
      tags: [], // AI will assign tags
      isPinned: false,
      timestamp: 'JUST NOW',
    };

    onAddNote(newNote);
    onClose();
    setContent('');
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
          {/* Content — the main and only required input */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              What's on your mind?
            </label>
            <textarea
              rows={7}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Just write what you're thinking... AI will organize it for you."
              autoFocus
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          {/* AI hint */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1d1a23] border border-[#27272a]">
            <Brain className="w-4 h-4 text-[#c8bfff] shrink-0" />
            <p className="text-[10px] text-[#7e7576] leading-relaxed">
              AI will generate a title, assign a category, and add relevant tags automatically.
            </p>
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
