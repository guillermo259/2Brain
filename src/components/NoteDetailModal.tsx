import React, { useState } from 'react';
import { NoteItem } from '../types';
import { X, Pin, Trash2, Sparkles, Check, Share2, Tag, Cpu, Clock, Layers } from 'lucide-react';

interface NoteDetailModalProps {
  note: NoteItem | null;
  onClose: () => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  allNotes: NoteItem[];
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  onClose,
  onUpdateNote,
  onDeleteNote,
  allNotes
}) => {
  if (!note) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [summary, setSummary] = useState(note.summary || '');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const connectedNotes = allNotes.filter((n) => note.connectedNodeIds.includes(n.id));

  const handleSave = () => {
    onUpdateNote({
      ...note,
      title,
      summary
    });
    setIsEditing(false);
  };

  const handleSimulateAiSynthesis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setAiAnalysis(
        `Gemini Synthesis: "${note.title}" forms a primary structural cluster with ${connectedNotes.length} linked memory nodes (${connectedNotes.map(c => c.title).join(', ')}). High semantic density detected in local-first database sync and WASM vector runtime.`
      );
      setIsAnalyzing(false);
    }, 1200);
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
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#27272a] bg-[#1d1a23]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f0d15] border border-[#27272a] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">{note.icon || 'article'}</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-widest flex items-center gap-2">
                <span>{note.category}</span>
                <span>•</span>
                <Clock className="w-3 h-3 text-[#7e7576]" />
                <span>{note.timestamp}</span>
              </div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">{note.type} MEMORY</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateNote({ ...note, isPinned: !note.isPinned })}
              className={`p-2 rounded-full border transition-colors ${
                note.isPinned ? 'bg-white text-[#1b1b1b] border-white' : 'border-[#27272a] text-[#7e7576] hover:text-white'
              }`}
              title="Pin Memory"
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          {/* Title & Editable summary */}
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

            {/* Tags list */}
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

            {/* Image display if visual note */}
            {note.imageUrl && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden mb-4 border border-[#27272a]">
                <img src={note.imageUrl} alt={note.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Summary */}
            <div className="bg-[#0f0d15] p-4 rounded-2xl border border-[#27272a] space-y-2">
              <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider">
                Memory Payload Content
              </div>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl p-3 text-sm text-white"
                />
              ) : (
                <p className="text-sm text-[#cfc4c5] leading-relaxed">
                  {note.summary || 'No text summary attached to this neural memory node.'}
                </p>
              )}
            </div>
          </div>

          {/* Connected Graph Nodes */}
          {connectedNotes.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#c8bfff]" />
                <span>Connected Neural Nodes ({connectedNotes.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {connectedNotes.map((cn) => (
                  <div key={cn.id} className="p-3 rounded-xl bg-[#1d1a23] border border-[#27272a] text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#c8bfff]"></span>
                    <span className="truncate">{cn.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Neural Analysis Section */}
          <div className="bg-[#1d1a23] p-4 rounded-2xl border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-[#c8bfff]" />
                <span>Neural Intelligence Analysis</span>
              </div>
              <button
                onClick={handleSimulateAiSynthesis}
                disabled={isAnalyzing}
                className="px-3 py-1 rounded-full bg-[#c8bfff] text-[#190262] font-bold text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? 'Synthesizing...' : 'Synthesize Insights'}
              </button>
            </div>

            {aiAnalysis && (
              <div className="p-3 bg-[#0f0d15] rounded-xl border border-[#c8bfff]/30 text-xs text-[#cfc4c5] leading-relaxed animate-in fade-in duration-200">
                {aiAnalysis}
              </div>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#0f0d15] flex justify-between items-center">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-full bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-colors"
            >
              Save Memory
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2 rounded-full bg-[#1d1a23] border border-[#27272a] text-white font-bold text-xs hover:bg-[#27272a] transition-colors"
            >
              Edit Payload
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
