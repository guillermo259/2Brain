import React, { useState, useRef, useEffect } from 'react';
import { getCategoryColor, BUILTIN_CATEGORIES } from '../types';
import { SlidersHorizontal, X, Check } from 'lucide-react';

interface FilterBarProps {
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasFilters = activeCategory !== null || activeTag !== null;

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <section className="px-3 sm:px-8 py-2 sm:py-3 shrink-0" ref={panelRef}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter button */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all ${
              isOpen || hasFilters
                ? 'bg-white text-[#1b1b1b] shadow-lg'
                : 'bg-[#1d1a23] border border-[#27272a] text-[#cfc4c5] hover:border-[#7e7576] hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {hasFilters && (
              <span className="w-5 h-5 rounded-full bg-[#fe7674] text-white text-[10px] flex items-center justify-center font-bold">
                {(activeCategory ? 1 : 0) + (activeTag ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {isOpen && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-[#15121b] border border-[#27272a] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Categories section */}
              <div className="p-3">
                <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2 px-1">
                  Categories
                </div>
                <div className="space-y-0.5">
                  {(Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts) : BUILTIN_CATEGORIES).map((cat) => {
                    const isActive = activeCategory === cat;
                    const count = categoryCounts[cat] || 0;
                    const color = getCategoryColor(cat);

                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          onSelectCategory(isActive ? null : cat);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-[#cfc4c5] hover:bg-[#1d1a23] hover:text-white'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-[#15121b]"
                          style={{ backgroundColor: color }}
                        />
                        <span className="flex-1 text-left">{cat}</span>
                        <span className="text-[10px] text-[#7e7576] tabular-nums">{count}</span>
                        {isActive && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags section */}
              {allTags.length > 0 && (
                <>
                  <div className="border-t border-[#27272a]" />
                  <div className="p-3">
                    <div className="text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-2 px-1">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map((tag) => {
                        const isActive = activeTag === tag;
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              onSelectTag(isActive ? null : tag);
                              setIsOpen(false);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              isActive
                                ? 'bg-[#c8bfff] text-[#190262]'
                                : 'bg-[#1d1a23] border border-[#27272a] text-[#cfc4c5] hover:border-[#c8bfff]/60 hover:text-[#c8bfff]'
                            }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Clear all */}
              {hasFilters && (
                <>
                  <div className="border-t border-[#27272a]" />
                  <div className="p-3">
                    <button
                      onClick={() => {
                        onSelectCategory(null);
                        onSelectTag(null);
                        setIsOpen(false);
                      }}
                      className="w-full py-2 rounded-xl text-[10px] font-bold text-[#7e7576] hover:text-[#fe7674] hover:bg-[#fe7674]/10 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Active filter badges */}
        {activeCategory && (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border animate-in fade-in duration-150"
            style={{
              color: getCategoryColor(activeCategory),
              borderColor: getCategoryColor(activeCategory) + '60',
              backgroundColor: getCategoryColor(activeCategory) + '15',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(activeCategory) }} />
            {activeCategory}
            <button
              onClick={() => onSelectCategory(null)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {activeTag && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-[#c8bfff]/15 border border-[#c8bfff]/30 text-[#c8bfff] animate-in fade-in duration-150">
            #{activeTag}
            <button
              onClick={() => onSelectTag(null)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>
    </section>
  );
};
