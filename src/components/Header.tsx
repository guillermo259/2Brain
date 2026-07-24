import React, { useState } from 'react';
import { Search, Bell, Plus, Sparkles, Cpu, LogOut, Settings } from 'lucide-react';
import type { UserAccount } from '../auth/AuthProvider';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCmdK: () => void;
  onOpenNewNote: () => void;
  onOpenSettings: () => void;
  noteCount: number;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenCmdK,
  onOpenNewNote,
  onOpenSettings,
  noteCount,
  currentUser,
  onLogout
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userName = currentUser?.name || 'You';
  const userInitials = currentUser?.avatarInitials || 'YB';

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center h-14 sm:h-20 px-2 sm:px-8 border-b border-[#27272a] bg-[#15121b]/80 backdrop-blur-md">
      {/* Brand & Status */}
      <div className="flex items-center gap-1 sm:gap-6 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 cursor-pointer group" onClick={() => setSearchQuery('')}>
          <span className="text-lg sm:text-3xl font-black tracking-tighter text-white italic group-hover:text-neutral-300 transition-colors">
            2Brain
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 bg-[#1d1a23] rounded-full border border-[#27272a] shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#fe7674] animate-pulse"></span>
          <span className="text-[10px] text-[#cfc4c5] uppercase tracking-[0.2em] font-bold">
            Neural Link: Online
          </span>
        </div>
      </div>

      {/* Search Brain Input */}
      <div className="flex-grow max-w-xl mx-1 sm:mx-4">
        <div 
          onClick={onOpenCmdK}
          className="bg-[#0f0d15] border border-[#27272a] rounded-full flex items-center px-2 sm:px-4 py-1.5 sm:py-2 gap-1 sm:gap-3 group focus-within:border-white hover:border-[#7e7576] transition-all duration-300 justify-between cursor-pointer"
        >
          <div className="flex items-center gap-1 sm:gap-3 flex-grow min-w-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#cfc4c5] group-hover:text-white transition-colors shrink-0"
            >
              <path d="M10.1 2.182a10 10 0 0 1 3.8 0"></path>
              <path d="M13.9 21.818a10 10 0 0 1-3.8 0"></path>
              <path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"></path>
              <path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"></path>
              <path d="M2.182 13.9a10 10 0 0 1 0-3.8"></path>
              <path d="M21.818 10.1a10 10 0 0 1 0 3.8"></path>
              <path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"></path>
              <path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"></path>
            </svg>
            <span className="hidden sm:inline text-xs sm:text-sm text-[#7e7576] truncate font-medium">
              {searchQuery ? searchQuery : "Search memory, tag or semantic synthesis..."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-block text-[10px] bg-[#1d1a23] text-[#cfc4c5] px-2 py-0.5 rounded-full border border-[#27272a] font-bold">
              ⌘K
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-4 shrink-0">
        {/* New Note Button */}
        <button
          onClick={onOpenNewNote}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#1b1b1b]" />
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
            <div className="absolute right-0 mt-3 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-[#15121b] border border-[#27272a] rounded-2xl shadow-2xl p-3 sm:p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                    <span>Local Sync Worker</span>
                    <span className="text-[10px] text-[#7e7576]">Just now</span>
                  </div>
                  <p className="text-[#cfc4c5] text-[11px]">Local WASM vector index synchronized {noteCount} memory nodes.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1d1a23] border border-[#27272a] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>Semantic Affinity</span>
                    <span className="text-[10px] text-[#7e7576]">15m ago</span>
                  </div>
                  <p className="text-[#cfc4c5] text-[11px]">88% cluster affinity detected in Architecture cluster.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative ml-1 sm:ml-2">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#1b1b1b] shadow-md hover:scale-105 active:scale-95 transition-all"
            title={`${userName} (${userInitials})`}
          >
            {userInitials}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 sm:w-64 max-w-[calc(100vw-1rem)] bg-[#15121b] border border-[#27272a] rounded-2xl shadow-2xl p-3 sm:p-4 z-50 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 border-b border-[#27272a] pb-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-white text-[#1b1b1b] font-bold flex items-center justify-center text-xs">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{userName}</div>
                  <div className="text-[11px] text-[#7e7576] truncate">Brain User</div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-[#1d1a23] text-[#cfc4c5] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-[#1d1a23] text-[#cfc4c5] flex justify-between items-center">
                  <span>Brain Capacity</span>
                  <span className="font-bold text-white">6.4 GB / 100 GB</span>
                </div>
                <div className="px-3 py-2 rounded-xl hover:bg-[#1d1a23] text-[#cfc4c5] flex items-center gap-2 cursor-pointer transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-[#c8bfff]" />
                  <span>Gemma 2B Active</span>
                </div>
                {onLogout && (
                  <div
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="px-3 py-2 rounded-xl hover:bg-[#fe7674]/15 hover:text-[#fe7674] text-[#cfc4c5] flex items-center gap-2 cursor-pointer transition-colors mt-2 border-t border-[#27272a] pt-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
