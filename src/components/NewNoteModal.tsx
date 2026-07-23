import React, { useState } from 'react';
import { NoteItem, NoteType, ContextCategory } from '../types';
import { X, Plus, Sparkles, Mic, CheckSquare, Image as ImageIcon, Network, Building2 } from 'lucide-react';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (newNote: NoteItem) => void;
  existingNotes: NoteItem[];
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  isOpen,
  onClose,
  onAddNote,
  existingNotes
}) => {
  const [type, setType] = useState<NoteType>('architecture');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ContextCategory>('Infrastructure');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState('0:35');
  const [checklistItems, setChecklistItems] = useState<string[]>(['Finalize system architecture', 'Deploy local vector store']);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [entityMetricLabel, setEntityMetricLabel] = useState('Core Capacity');
  const [entityMetricValue, setEntityMetricValue] = useState(75);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

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
      type,
      timestamp: 'JUST NOW',
      category,
      summary: summary.trim() || undefined,
      tags: tags.length > 0 ? tags : [category.toUpperCase()],
      icon:
        type === 'voice'
          ? 'mic'
          : type === 'checklist'
          ? 'checklist'
          : type === 'visual'
          ? 'palette'
          : type === 'entity'
          ? 'hub'
          : 'architecture',
      audioDuration: type === 'voice' ? recordedDuration : undefined,
      checklist:
        type === 'checklist'
          ? checklistItems.map((item, idx) => ({
              id: `item-${idx}-${Date.now()}`,
              text: item,
              completed: false
            }))
          : undefined,
      imageUrl:
        type === 'visual'
          ? imageUrl.trim() ||
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
          : undefined,
      entityMetric:
        type === 'entity'
          ? { label: entityMetricLabel, value: entityMetricValue }
          : undefined,
      connectedNodeIds: existingNotes.slice(0, 2).map((n) => n.id)
    };

    onAddNote(newNote);
    onClose();

    // Reset fields
    setTitle('');
    setSummary('');
    setTagsInput('');
    setImageUrl('');
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white tracking-tight">Create Neural Memory</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#7e7576] hover:text-white hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
          {/* Note Type Selector */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2">
              Memory Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'architecture', label: 'Arch', icon: 'architecture' },
                { id: 'voice', label: 'Voice', icon: 'mic' },
                { id: 'checklist', label: 'Tasks', icon: 'checklist' },
                { id: 'visual', label: 'Visual', icon: 'palette' },
                { id: 'entity', label: 'Entity', icon: 'hub' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as NoteType)}
                  className={`p-2.5 rounded-2xl flex flex-col items-center gap-1.5 border transition-all text-xs font-bold ${
                    type === t.id
                      ? 'bg-white text-[#1b1b1b] border-white shadow-lg'
                      : 'bg-[#1d1a23] text-[#cfc4c5] border-[#27272a] hover:border-[#7e7576]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus Worker, CRDT Sync..."
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Context Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContextCategory)}
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors cursor-pointer"
            >
              <option value="Infrastructure">Infrastructure</option>
              <option value="Deep Work">Deep Work</option>
              <option value="Philosophical">Philosophical</option>
              <option value="Visuals">Visuals</option>
            </select>
          </div>

          {/* Specific Type Custom Fields */}
          {type === 'voice' && (
            <div className="p-4 bg-[#0f0d15] rounded-2xl border border-[#27272a] text-center space-y-3">
              <div className="text-xs text-[#cfc4c5]">Record audio snippet or upload voice memo</div>
              <button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                className={`px-6 py-3 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 mx-auto ${
                  isRecording
                    ? 'bg-[#fe7674] text-white animate-pulse'
                    : 'bg-[#a83638]/20 text-[#fe7674] border border-[#fe7674]/40 hover:bg-[#a83638]/40'
                }`}
              >
                <span className="material-symbols-outlined text-lg">mic</span>
                <span>{isRecording ? 'Recording... (Click to stop)' : 'Simulate Voice Capture'}</span>
              </button>
              {isRecording && (
                <div className="text-[11px] text-[#fe7674] font-bold">Captured 0:42 audio signal</div>
              )}
            </div>
          )}

          {type === 'checklist' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider">
                Checklist Items
              </label>
              <div className="space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#0f0d15] px-3 py-2 rounded-xl border border-[#27272a] text-xs text-white">
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                      className="text-[#7e7576] hover:text-[#fe7674]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add item..."
                  className="flex-grow bg-[#1d1a23] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-3 py-2 bg-[#27272a] hover:bg-white hover:text-[#1b1b1b] rounded-xl text-xs font-bold text-white transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {type === 'visual' && (
            <div>
              <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>
          )}

          {type === 'entity' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
                  Metric Label
                </label>
                <input
                  type="text"
                  value={entityMetricLabel}
                  onChange={(e) => setEntityMetricLabel(e.target.value)}
                  className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
                  Value (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={entityMetricValue}
                  onChange={(e) => setEntityMetricValue(Number(e.target.value))}
                  className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Summary / Notes */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Summary / Content Body
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detailed notes, specs, or thoughts..."
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. INFRA, DEV, AI"
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-white text-[#1b1b1b] font-bold text-sm hover:bg-neutral-200 transition-all shadow-xl"
            >
              Commit Memory Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
