import React, { useState, useEffect } from 'react';
import { NoteItem } from '../types';
import { Search, Plus, X, ArrowRight } from 'lucide-react';

interface CmdKModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  onSelectNote: (note: NoteItem) => void;
  onOpenNewNote: () => void;
}

export const CmdKModal: React.FC<CmdKModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onOpenNewNote,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#15121b] border border-[#27272a] w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[#27272a] gap-2 sm:gap-3">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#7e7576] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or tags..."
            className="bg-transparent border-none text-sm sm:text-base w-full focus:outline-none placeholder:text-[#7e7576] font-medium text-white"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#7e7576] hover:text-white hover:bg-[#27272a] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action */}
        {!query && (
          <div className="p-4 border-b border-[#27272a] bg-[#1d1a23]/50">
            <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2.5">
              Quick Actions
            </div>
            <button
              onClick={() => { onClose(); onOpenNewNote(); }}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1d1a23] hover:bg-[#27272a] text-xs font-bold text-white transition-colors border border-[#27272a] w-full"
            >
              <Plus className="w-4 h-4 text-[#fe7674]" />
              <span>Create New Note</span>
            </button>
          </div>
        )}

        {/* Results */}
        <div className="overflow-y-auto no-scrollbar p-4 space-y-2 flex-grow">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => { onSelectNote(note); onClose(); }}
                className="p-3.5 rounded-2xl bg-[#1d1a23] hover:bg-[#27272a] border border-[#27272a] hover:border-white/30 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-bold text-white">{note.title}</div>
                  <div className="text-[11px] text-[#7e7576]">{note.timestamp}</div>
                </div>
                <div className="flex items-center gap-2">
                  {note.tags.map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#3b3742] text-[#cfc4c5]">
                      {tag}
                    </span>
                  ))}
                  <ArrowRight className="w-4 h-4 text-[#7e7576] group-hover:text-white transition-colors ml-2" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-[#7e7576]">
              No notes found matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
