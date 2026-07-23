import React, { useState } from 'react';
import { NoteItem } from '../types';
import { Play, Pause, Check, Pin, Trash2, ArrowUpRight } from 'lucide-react';

interface NoteCardProps {
  note: NoteItem;
  isSelected: boolean;
  onSelect: (note: NoteItem) => void;
  onToggleChecklist?: (noteId: string, itemId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  onSelect,
  onToggleChecklist,
  onDeleteNote,
  onTogglePin
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingAudio(!isPlayingAudio);
  };

  return (
    <div
      onClick={() => onSelect(note)}
      className={`mini-card rounded-xl p-6 group cursor-pointer relative transition-all duration-300 ${
        isSelected ? 'mini-card-active border-white bg-[#27272a]/80 shadow-xl' : 'hover:border-[#7e7576]'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {note.type === 'voice' ? (
            <div className="w-10 h-10 rounded-lg bg-[#a83638]/20 border border-[#fe7674]/30 flex items-center justify-center text-[#fe7674]">
              <span className="material-symbols-outlined text-xl fill">mic</span>
            </div>
          ) : note.type === 'entity' ? (
            <div className="w-10 h-10 rounded-lg bg-white text-[#1b1b1b] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">hub</span>
            </div>
          ) : note.type === 'checklist' ? (
            <div className="w-10 h-10 rounded-lg bg-[#27272a] border border-[#3b3742] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">checklist</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#27272a] border border-[#3b3742] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">{note.icon || 'architecture'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {note.isPinned && (
            <Pin className="w-3.5 h-3.5 text-[#c8bfff] fill-[#c8bfff]" />
          )}
          <span className="text-[10px] font-bold text-[#7e7576] uppercase tracking-widest">
            {note.timestamp}
          </span>
        </div>
      </div>

      {/* Visual Asset Card Image Preview */}
      {note.type === 'visual' && note.imageUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#3b3742] mb-4 border border-[#27272a]">
          <img
            src={note.imageUrl}
            alt={note.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85 group-hover:opacity-100"
          />
        </div>
      )}

      {/* Note Title */}
      <h3 className="text-xl font-bold leading-tight mb-3 tracking-tight text-[#f1f1f1] group-hover:text-white transition-colors">
        {note.title}
      </h3>

      {/* Summary paragraph */}
      {note.summary && note.type !== 'voice' && note.type !== 'checklist' && note.type !== 'entity' && (
        <p className="text-[#cfc4c5] text-sm leading-relaxed mb-4 line-clamp-3">
          {note.summary}
        </p>
      )}

      {/* Voice Memo Waveform Widget */}
      {note.type === 'voice' && (
        <div className="w-full h-11 bg-[#0f0d15] rounded-full flex items-center px-4 gap-3 mb-2 border border-[#27272a] my-3">
          <button
            onClick={handleAudioToggle}
            className="w-7 h-7 rounded-full bg-[#fe7674] text-[#1b1b1b] flex items-center justify-center hover:scale-110 active:scale-95 transition-all shrink-0"
          >
            {isPlayingAudio ? (
              <Pause className="w-3.5 h-3.5 fill-[#1b1b1b]" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-[#1b1b1b] ml-0.5" />
            )}
          </button>
          
          <div className="flex-grow flex gap-1 items-center h-full">
            <div className={`h-3 w-1 rounded-full ${isPlayingAudio ? 'bg-[#fe7674] animate-bounce' : 'bg-[#fe7674]/40'}`} style={{ animationDelay: '0ms' }}></div>
            <div className={`h-5 w-1 rounded-full ${isPlayingAudio ? 'bg-[#fe7674] animate-bounce' : 'bg-[#fe7674]/60'}`} style={{ animationDelay: '150ms' }}></div>
            <div className={`h-2 w-1 rounded-full ${isPlayingAudio ? 'bg-[#fe7674] animate-bounce' : 'bg-[#fe7674]/30'}`} style={{ animationDelay: '300ms' }}></div>
            <div className={`h-6 w-1 rounded-full ${isPlayingAudio ? 'bg-[#fe7674] animate-bounce' : 'bg-[#fe7674]'}`} style={{ animationDelay: '100ms' }}></div>
            <div className={`h-4 w-1 rounded-full ${isPlayingAudio ? 'bg-[#fe7674] animate-bounce' : 'bg-[#fe7674]/50'}`} style={{ animationDelay: '200ms' }}></div>
            <div className={`h-3 w-1 rounded-full ${isPlayingAudio ? 'bg-[#fe7674] animate-bounce' : 'bg-[#fe7674]/40'}`} style={{ animationDelay: '250ms' }}></div>
          </div>

          <span className="text-[10px] font-bold text-[#7e7576]">
            {note.audioDuration || '0:42'}
          </span>
        </div>
      )}

      {/* Checklist Widget */}
      {note.type === 'checklist' && note.checklist && (
        <ul className="space-y-2.5 my-3">
          {note.checklist.map((item) => (
            <li
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleChecklist) onToggleChecklist(note.id, item.id);
              }}
              className="flex items-center gap-3 text-[#cfc4c5] text-sm hover:text-white transition-colors cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
                  item.completed
                    ? 'border-white bg-white text-[#1b1b1b]'
                    : 'border-[#7e7576] hover:border-white bg-transparent'
                }`}
              >
                {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className={item.completed ? 'line-through opacity-50' : ''}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Entity Link Metric Bar */}
      {note.type === 'entity' && note.entityMetric && (
        <div className="space-y-2 my-3 bg-[#0f0d15] p-3 rounded-xl border border-[#27272a]">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#cfc4c5] font-bold">{note.entityMetric.label}</span>
            <span className="text-white font-bold">{note.entityMetric.value}%</span>
          </div>
          <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${note.entityMetric.value}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tags Row */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#3b3742] text-[#f1f1f1] uppercase tracking-widest border border-[#27272a]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Hover Action Controls */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#15121b]/90 backdrop-blur-md p-1 rounded-lg border border-[#27272a] shadow-lg">
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id);
            }}
            className="p-1 hover:text-white text-[#7e7576] transition-colors"
            title="Pin Note"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}
        {onDeleteNote && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            className="p-1 hover:text-[#fe7674] text-[#7e7576] transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
