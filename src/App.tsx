import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { NoteCard } from './components/NoteCard';
import { Graph2D } from './components/Graph2D';
import { CmdKModal } from './components/CmdKModal';
import { NewNoteModal } from './components/NewNoteModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { useAuth } from './auth/AuthProvider';
import { notesRepo } from './db/NotesRepository';
import { flush as flushDb } from './db/DbClient';
import { safeLog } from './security/logSanitizer';
import { NoteItem, Category } from './types';
import { Brain } from 'lucide-react';

export default function App() {
  const { state, notes, refreshNotes, lock: lockAuth } = useAuth();

  if (state.kind !== 'active') return null;

  const { user, masterKey } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [inspectedNote, setInspectedNote] = useState<NoteItem | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'feed' | 'graph'>('feed');

  const commitChanges = useCallback(async () => {
    try {
      refreshNotes();
      await flushDb(masterKey);
    } catch (e) {
      safeLog.error('commitChanges failed', e);
    }
  }, [masterKey, refreshNotes]);

  // Category counts for FilterBar
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((note) => {
      counts[note.category] = (counts[note.category] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // All unique tags (sorted alphabetically)
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((note) => note.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  // Filtered notes: category → tag → search query (AND logic)
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (activeCategory) {
      result = result.filter((note) => note.category === activeCategory);
    }

    if (activeTag) {
      const tag = activeTag.toLowerCase();
      result = result.filter((note) =>
        note.tags.some((t) => t.toLowerCase() === tag),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((note) => {
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesTag = note.tags.some((t) => t.toLowerCase().includes(q));
        const matchesCategory = note.category.toLowerCase().includes(q);
        return matchesTitle || matchesContent || matchesTag || matchesCategory;
      });
    }

    return result;
  }, [notes, activeCategory, activeTag, searchQuery]);

  const handleTogglePin = useCallback(
    async (noteId: string) => {
      try {
        notesRepo.togglePin(noteId);
        await commitChanges();
      } catch (e) {
        safeLog.error('toggle pin failed', e);
      }
    },
    [commitChanges],
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        notesRepo.delete(noteId);
        await commitChanges();
        if (selectedNote?.id === noteId) setSelectedNote(null);
      } catch (e) {
        safeLog.error('delete note failed', e);
      }
    },
    [commitChanges, selectedNote?.id],
  );

  const handleAddNote = useCallback(
    async (newNote: NoteItem) => {
      try {
        notesRepo.create(newNote);
        await commitChanges();
        setSelectedNote(newNote);
        setAiNotice(`"${newNote.title}" created.`);
        setTimeout(() => setAiNotice(null), 3000);
      } catch (e) {
        safeLog.error('add note failed', e);
      }
    },
    [commitChanges],
  );

  const handleUpdateNote = useCallback(
    async (updatedNote: NoteItem) => {
      try {
        notesRepo.update(updatedNote.id, updatedNote);
        await commitChanges();
        if (selectedNote?.id === updatedNote.id) setSelectedNote(updatedNote);
        setInspectedNote(updatedNote);
      } catch (e) {
        safeLog.error('update note failed', e);
      }
    },
    [commitChanges, selectedNote?.id],
  );

  const handleLogout = useCallback(() => {
    lockAuth();
  }, [lockAuth]);

  const liveInspectedNote = useMemo(
    () =>
      inspectedNote
        ? notes.find((n) => n.id === inspectedNote.id) ?? inspectedNote
        : null,
    [notes, inspectedNote],
  );

  return (
    <div className="bg-[#0f0d15] text-[#f1f1f1] selection:bg-white/20 selection:text-white min-h-screen overflow-hidden flex flex-col font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#3b3742_0%,_transparent_100%)]" />
      </div>

      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenCmdK={() => setIsCmdKOpen(true)}
        onOpenNewNote={() => setIsNewNoteOpen(true)}
        noteCount={notes.length}
        currentUser={user}
        onLogout={handleLogout}
      />

      {aiNotice && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#15121b] border border-[#c8bfff] text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{aiNotice}</span>
        </div>
      )}

      <main className="relative z-10 pt-16 sm:pt-24 h-screen flex flex-col">
        {/* FilterBar: categorías + tags */}
        <FilterBar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          categoryCounts={categoryCounts}
          allTags={allTags}
        />

        {/* Mobile View Toggle */}
        <div className="lg:hidden px-3 mb-2 shrink-0">
          <div className="bg-[#0f0d15] p-1 rounded-full border border-[#27272a] grid grid-cols-2 gap-1 text-xs font-bold">
            <button
              onClick={() => setMobileTab('feed')}
              className={`py-2 rounded-full transition-all flex items-center justify-center gap-2 ${
                mobileTab === 'feed' ? 'bg-white text-[#1b1b1b] shadow-md' : 'text-[#cfc4c5] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_agenda</span>
              <span>Notes ({filteredNotes.length})</span>
            </button>
            <button
              onClick={() => setMobileTab('graph')}
              className={`py-2 rounded-full transition-all flex items-center justify-center gap-2 ${
                mobileTab === 'graph' ? 'bg-white text-[#1b1b1b] shadow-md' : 'text-[#cfc4c5] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">hub</span>
              <span>Graph</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden px-3 sm:px-8 pb-3 sm:pb-8 gap-4 lg:gap-8">
          {/* Feed */}
          <aside className={`w-full lg:w-1/3 flex-col gap-4 sm:gap-6 overflow-y-auto no-scrollbar pb-16 sm:pb-24 pr-1 ${
            mobileTab === 'feed' ? 'flex' : 'hidden lg:flex'
          }`}>
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <div key={note.id} onDoubleClick={() => setInspectedNote(note)}>
                  <NoteCard
                    note={note}
                    isSelected={selectedNote?.id === note.id}
                    onSelect={(n) => setSelectedNote(n)}
                    onDeleteNote={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                  />
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-[#1d1a23] border border-[#27272a] rounded-2xl space-y-3">
                <Brain className="w-8 h-8 text-[#7e7576] mx-auto" />
                <div className="text-sm font-bold text-white">No notes yet</div>
                <p className="text-xs text-[#7e7576]">
                  Create your first note to get started.
                </p>
                <button
                  onClick={() => setIsNewNoteOpen(true)}
                  className="px-4 py-2 rounded-full bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-colors"
                >
                  Create Note
                </button>
              </div>
            )}
          </aside>

          {/* Graph */}
          <div className={`w-full lg:w-2/3 h-full ${
            mobileTab === 'graph' ? 'block' : 'hidden lg:block'
          }`}>
            <Graph2D
              notes={filteredNotes}
              selectedNoteId={selectedNote?.id || null}
              onSelectNote={(note) => {
                setSelectedNote(note);
                setInspectedNote(note);
              }}
              onSelectTag={(tag) => {
                setActiveTag(tag);
                setMobileTab('feed');
              }}
              onSelectCategory={(category) => {
                setActiveCategory(category);
                setMobileTab('feed');
              }}
            />
          </div>
        </div>
      </main>

      <CmdKModal
        isOpen={isCmdKOpen}
        onClose={() => setIsCmdKOpen(false)}
        notes={notes}
        onSelectNote={(note) => {
          setSelectedNote(note);
          setInspectedNote(note);
        }}
        onOpenNewNote={() => setIsNewNoteOpen(true)}
      />

      <NewNoteModal
        isOpen={isNewNoteOpen}
        onClose={() => setIsNewNoteOpen(false)}
        onAddNote={handleAddNote}
      />

      <NoteDetailModal
        note={liveInspectedNote}
        onClose={() => setInspectedNote(null)}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
      />
    </div>
  );
}
