import React from 'react';
import { ContextCategory } from '../types';

interface FilterBarProps {
  activeCategory: ContextCategory;
  onSelectCategory: (category: ContextCategory) => void;
  categoryCounts: Record<ContextCategory, number>;
}

const CATEGORIES: ContextCategory[] = [
  'Everywhere',
  'Deep Work',
  'Philosophical',
  'Infrastructure',
  'Visuals'
];

export const FilterBar: React.FC<FilterBarProps> = ({
  activeCategory,
  onSelectCategory,
  categoryCounts
}) => {
  return (
    <section className="px-3 sm:px-8 py-2 sm:py-4 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1 touch-pan-x">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          const count = categoryCounts[category] || 0;

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shrink-0 flex items-center gap-2 ${
                isActive
                  ? 'bg-white text-[#1b1b1b] shadow-lg scale-105'
                  : 'bg-[#0f0d15] border border-[#27272a] text-[#f1f1f1] hover:bg-[#1d1a23] hover:border-[#7e7576]'
              }`}
            >
              <span>{category}</span>
              {category !== 'Everywhere' && count > 0 && (
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
    </section>
  );
};
