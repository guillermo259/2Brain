import React, { useState } from 'react';
import { Search, Bell, Plus, Sparkles, Cpu, CheckCircle2, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCmdK: () => void;
  onOpenNewNote: () => void;
  noteCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenCmdK,
  onOpenNewNote,
  noteCount
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center h-16 sm:h-20 px-3 sm:px-8 border-b border-[#27272a] bg-[#15121b]/80 backdrop-blur-md">
      {/* Brand & Status */}
      <div className="flex items-center gap-2 sm:gap-6 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setSearchQuery('')}>
          <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white italic group-hover:text-neutral-300 transition-colors">
            2Brain
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-[#1d1a23] rounded-full border border-[#27272a] shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#fe7674] animate-pulse"></span>
          <span className="text-[10px] text-[#cfc4c5] uppercase tracking-[0.2em] font-bold">
            Neural Link: Online
          </span>
        </div>
      </div>

      {/* Search Brain Input */}
      <div className="flex-grow max-w-xl mx-2 sm:mx-4">
        <div 
          onClick={onOpenCmdK}
          className="bg-[#0f0d15] border border-[#27272a] rounded-full flex items-center px-3 sm:px-4 py-1.5 sm:py-2 gap-2 sm:gap-3 group focus-within:border-white hover:border-[#7e7576] transition-all duration-300 justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-[#cfc4c5] group-hover:text-white transition-colors shrink-0"
            >
              <path d="M10.1 2.182a10 10 0 0 1 3.8 0"></path>
              <path d="M13.9 21.818a10 10 0 0 1-3.8 0"></path>
              <path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"></path>
              <path d="M2.182 13.9a10 10 0 0 1 0-3.8"></path>
              <path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"></path>
              <path d="M21.818 10.1a10 10 0 0 1 0 3.8"></path>
              <path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"></path>
              <path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"></path>
            </svg>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brain..."
              className="bg-transparent border-none p-0 text-xs sm:text-sm w-full focus:outline-none focus:ring-0 placeholder:text-[#7e7576] font-medium text-[#f1f1f1] truncate"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                className="text-[#7e7576] hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 border-l border-[#27272a] pl-3 shrink-0">
            <kbd className="px-2 py-0.5 bg-[#3b3742] border border-[#27272a] rounded-md text-[10px] font-bold text-[#cfc4c5] uppercase tracking-wider">
              Cmd K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* New Note Button */}
        <button
          onClick={onOpenNewNote}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">New Memory</span>
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1d1a23] border border-[#27272a] hover:bg-[#27272a] hover:text-white transition-colors text-[#cfc4c5] relative"
            title="Neural Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#fe7674]"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#15121b] border border-[#27272a] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[#fe7674]" /> Neural Signal Stream
                </span>
                <span className="text-[10px] bg-[#3b3742] text-[#cfc4c5] px-2 py-0.5 rounded-full font-bold">
                  2 New
                </span>
              </div>
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-[#1d1a23] border border-[#27272a] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>CRDT Sync Worker</span>
                    <span className="text-[10px] text-[#7e7576]">Just now</span>
                  </div>
                  <p className="text-[#cfc4c5] text-[11px]">Local WASM vector index synchronized {noteCount} memory nodes.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1d1a23] border border-[#27272a] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>Entity Link Identified</span>
                    <span className="text-[10px] text-[#7e7576]">15m ago</span>
                  </div>
                  <p className="text-[#cfc4c5] text-[11px]">88% cluster affinity detected between Llama-3 & Distributed Architecture.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#1b1b1b] shadow-md hover:scale-105 active:scale-95 transition-all"
            title="Julian Drake (JD)"
          >
            JD
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-64 bg-[#15121b] border border-[#27272a] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 border-b border-[#27272a] pb-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-white text-[#1b1b1b] font-bold flex items-center justify-center text-xs">
                  JD
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Julian Drake</div>
                  <div className="text-[11px] text-[#7e7576]">julian@neural2b.io</div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="px-3 py-2 rounded-xl bg-[#1d1a23] text-[#cfc4c5] flex justify-between items-center">
                  <span>Brain Capacity</span>
                  <span className="font-bold text-white">6.4 GB / 100 GB</span>
                </div>
                <div className="px-3 py-2 rounded-xl hover:bg-[#1d1a23] text-[#cfc4c5] flex items-center gap-2 cursor-pointer transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-[#c8bfff]" />
                  <span>Gemini Memory Core</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
