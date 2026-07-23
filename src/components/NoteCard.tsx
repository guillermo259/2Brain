import React from 'react';
import { NoteItem, Category, CATEGORY_COLORS } from '../types';
import { Pin, Trash2 } from 'lucide-react';

interface NoteCardProps {
  note: NoteItem;
  isSelected: boolean;
  onSelect: (note: NoteItem) => void;
  onDeleteNote?: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  onSelect,
  onDeleteNote,
  onTogglePin,
}) => {
  const catColor = CATEGORY_COLORS[note.category] || '#f1f1f1';

  return (
    <div
      onClick={() => onSelect(note)}
      className={`mini-card rounded-xl p-6 group cursor-pointer relative transition-all duration-300 ${
        isSelected ? 'mini-card-active border-white bg-[#27272a]/80 shadow-xl' : 'hover:border-[#7e7576]'
      }`}
    >
      {/* Header Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {/* Category badge */}
          <span
            className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
            style={{ color: catColor, borderColor: catColor, backgroundColor: `${catColor}15` }}
          >
            {note.category}
          </span>
          {note.isPinned && (
            <Pin className="w-3.5 h-3.5 text-[#c8bfff] fill-[#c8bfff]" />
          )}
          <span className="text-[10px] font-bold text-[#7e7576] uppercase tracking-widest">
            {note.timestamp}
          </span>
        </div>

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

      {/* Title */}
      <h3 className="text-xl font-bold leading-tight mb-3 tracking-tight text-[#f1f1f1] group-hover:text-white transition-colors">
        {note.title}
      </h3>

      {/* Content snippet */}
      {note.content && (
        <p className="text-[#cfc4c5] text-sm leading-relaxed mb-4 line-clamp-3">
          {note.content}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
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
    </div>
  );
};
