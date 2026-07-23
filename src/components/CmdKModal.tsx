import React, { useState, useEffect } from 'react';
import { NoteItem } from '../types';
import { Search, Mic, Plus, Sparkles, X, ArrowRight, Tag } from 'lucide-react';

interface CmdKModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  onSelectNote: (note: NoteItem) => void;
  onOpenNewNote: () => void;
  onAiSynthesize: (prompt: string) => void;
}

export const CmdKModal: React.FC<CmdKModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onOpenNewNote,
  onAiSynthesize
}) => {
  const [query, setQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
      (n.summary && n.summary.toLowerCase().includes(query.toLowerCase()))
  );

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim()) {
      onAiSynthesize(aiPrompt);
      setAiPrompt('');
      onClose();
    }
  };

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
            placeholder="Search brain notes or tags..."
            className="bg-transparent border-none text-sm sm:text-base w-full focus:outline-none placeholder:text-[#7e7576] font-medium text-white"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#7e7576] hover:text-white hover:bg-[#27272a] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Shortcuts */}
        {!query && (
          <div className="p-4 border-b border-[#27272a] bg-[#1d1a23]/50">
            <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2.5">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenNewNote();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1d1a23] hover:bg-[#27272a] text-xs font-bold text-white transition-colors border border-[#27272a]"
              >
                <Plus className="w-4 h-4 text-[#fe7674]" />
                <span>Create New Memory</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewNote();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1d1a23] hover:bg-[#27272a] text-xs font-bold text-white transition-colors border border-[#27272a]"
              >
                <Mic className="w-4 h-4 text-[#c8bfff]" />
                <span>Record Voice Memo</span>
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="overflow-y-auto no-scrollbar p-4 space-y-2 flex-grow">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  onSelectNote(note);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-[#1d1a23] hover:bg-[#27272a] border border-[#27272a] hover:border-white/30 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0f0d15] flex items-center justify-center text-white border border-[#27272a]">
                    <span className="material-symbols-outlined text-sm">{note.icon || 'article'}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-white transition-colors">
                      {note.title}
                    </div>
                    <div className="text-[11px] text-[#7e7576] flex items-center gap-2">
                      <span>{note.category}</span>
                      <span>•</span>
                      <span>{note.timestamp}</span>
                    </div>
                  </div>
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
              No memories found matching "{query}"
            </div>
          )}
        </div>

        {/* AI Query Prompt Bar */}
        <div className="p-4 border-t border-[#27272a] bg-[#0f0d15]">
          <form onSubmit={handleAiSubmit} className="flex items-center gap-2 bg-[#1d1a23] px-4 py-2.5 rounded-full border border-[#27272a] focus-within:border-[#c8bfff]">
            <Sparkles className="w-4 h-4 text-[#c8bfff] shrink-0 animate-pulse" />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask Gemini AI to synthesize brain knowledge..."
              className="bg-transparent border-none text-xs w-full focus:outline-none text-white placeholder:text-[#7e7576]"
            />
            <button
              type="submit"
              disabled={!aiPrompt.trim()}
              className="px-3 py-1 rounded-full bg-[#c8bfff] text-[#190262] font-bold text-xs disabled:opacity-40 hover:bg-white transition-colors shrink-0"
            >
              Ask AI
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
