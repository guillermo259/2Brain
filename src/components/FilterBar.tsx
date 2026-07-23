import React from 'react';
import { Category, CATEGORIES, CATEGORY_COLORS } from '../types';
import { X } from 'lucide-react';

interface FilterBarProps {
  activeCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  categoryCounts: Record<string, number>;
  allTags: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeCategory,
  onSelectCategory,
  activeTag,
  onSelectTag,
  categoryCounts,
  allTags,
}) => {
  return (
    <section className="px-3 sm:px-8 py-2 sm:py-4 shrink-0">
      {/* Categories row */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1 touch-pan-x">
        {/* "All" button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shrink-0 flex items-center gap-2 ${
            activeCategory === null
              ? 'bg-white text-[#1b1b1b] shadow-lg scale-105'
              : 'bg-[#0f0d15] border border-[#27272a] text-[#f1f1f1] hover:bg-[#1d1a23] hover:border-[#7e7576]'
          }`}
        >
          <span>All</span>
        </button>

        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          const count = categoryCounts[category] || 0;
          const color = CATEGORY_COLORS[category];

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(isActive ? null : category)}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shrink-0 flex items-center gap-2 ${
                isActive
                  ? 'bg-white text-[#1b1b1b] shadow-lg scale-105'
                  : 'bg-[#0f0d15] border border-[#27272a] text-[#f1f1f1] hover:bg-[#1d1a23] hover:border-[#7e7576]'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span>{category}</span>
              {count > 0 && (
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-[#1b1b1b]/10 text-[#1b1b1b]' : 'bg-[#27272a] text-[#cfc4c5]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tags row (only show if we have tags) */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar py-1 touch-pan-x">
          {allTags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(isActive ? null : tag)}
                className={`px-3 py-1 rounded-full font-bold text-[10px] sm:text-xs transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-[#c8bfff] text-[#190262] shadow-lg'
                    : 'bg-[#1d1a23] border border-[#27272a] text-[#cfc4c5] hover:border-[#c8bfff]/60 hover:text-[#c8bfff]'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Combined active filter indicator */}
      {(activeCategory || activeTag) && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#27272a]/60 text-[10px] text-[#cfc4c5]">
            <span>Filtering by:</span>
            {activeCategory && <span className="font-bold text-white">{activeCategory}</span>}
            {activeCategory && activeTag && <span className="text-[#7e7576]">+</span>}
            {activeTag && <span className="font-bold text-[#c8bfff]">#{activeTag}</span>}
            <button
              onClick={() => { onSelectCategory(null); onSelectTag(null); }}
              className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
