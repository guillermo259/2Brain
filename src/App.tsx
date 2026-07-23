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
import { NoteItem, ContextCategory } from './types';
import { Sparkles, Brain } from 'lucide-react';

export default function App() {
  const { state, notes, refreshNotes, lock: lockAuth } = useAuth();

  // State narrowed: si `state.kind !== 'active'`, es unreachable porque
  // RootRouter ya renderiza otra cosa. Pero TypeScript necesita narrowing.
  if (state.kind !== 'active') return null;

  const { user, masterKey } = state;

  const [activeCategory, setActiveCategory] = useState<ContextCategory>('Everywhere');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [inspectedNote, setInspectedNote] = useState<NoteItem | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'feed' | 'graph'>('feed');

  // ───── Mutations: cada cambio muta notesRepo + hace flush cifrado ─────

  /**
   * Helper central: tras cualquier mutación del repositorio, refresca
   * el estado React desde la DB y persiste el blob cifrado en IDB.
   */
  const commitChanges = useCallback(async () => {
    try {
      refreshNotes();
      await flushDb(masterKey);
    } catch (e) {
      safeLog.error('commitChanges failed', e);
    }
  }, [masterKey, refreshNotes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ContextCategory, number> = {
      Everywhere: notes.length,
      'Deep Work': 0,
      Philosophical: 0,
      Infrastructure: 0,
      Visuals: 0,
    };

    notes.forEach((note) => {
      if (counts[note.category] !== undefined) {
        counts[note.category] += 1;
      }
    });

    return counts;
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (activeCategory !== 'Everywhere' && note.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesSummary = note.summary?.toLowerCase().includes(q);
        const matchesTag = note.tags.some((t) => t.toLowerCase().includes(q));
        const matchesCategory = note.category.toLowerCase().includes(q);
        return matchesTitle || matchesSummary || matchesTag || matchesCategory;
      }
      return true;
    });
  }, [notes, activeCategory, searchQuery]);

  // Handlers
  const handleToggleChecklist = useCallback(
    async (noteId: string, itemId: string) => {
      try {
        notesRepo.toggleChecklistItem(noteId, itemId);
        await commitChanges();
      } catch (e) {
        safeLog.error('toggle checklist failed', e);
      }
    },
    [commitChanges],
  );

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
        setAiNotice(`New memory node "${newNote.title}" synced to 2B Brain.`);
        setTimeout(() => setAiNotice(null), 4000);
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

  const handleAiSynthesize = useCallback(
    async (prompt: string) => {
      setAiNotice(
        `Local neural query running: "${prompt}"... Creating memory synthesis.`,
      );
      setTimeout(async () => {
        try {
          const generatedNote: NoteItem = {
            id: `note-ai-${Date.now()}`,
            title: `AI Synthesis: ${prompt.slice(0, 24)}...`,
            type: 'architecture',
            timestamp: 'JUST NOW',
            category:
              activeCategory === 'Everywhere' ? 'Infrastructure' : activeCategory,
            summary: `Synthesised knowledge based on prompt "${prompt}". Cross-indexed with local WASM database ${notes.length} brain nodes.`,
            tags: ['AI', 'SYNTHESIS', '2B'],
            icon: 'memory',
            connectedNodeIds: notes.slice(0, 3).map((n) => n.id),
          };
          notesRepo.create(generatedNote);
          await commitChanges();
          setSelectedNote(generatedNote);
          setAiNotice('Neural memory node created.');
          setTimeout(() => setAiNotice(null), 4000);
        } catch (e) {
          safeLog.error('AI synthesis failed', e);
        }
      }, 1500);
    },
    [activeCategory, commitChanges, notes],
  );

  const handleLogout = useCallback(() => {
    lockAuth();
  }, [lockAuth]);

  // Live snapshot del `inspectedNote` derivada desde `notes`. Esto evita
  // un useEffect problemático que re-renderizaba en bucle comparando
  // referencias objeto contra refs de `rowToNote` (siempre nuevas).
  const liveInspectedNote = useMemo(
    () =>
      inspectedNote
        ? notes.find((n) => n.id === inspectedNote.id) ?? inspectedNote
        : null,
    [notes, inspectedNote],
  );

  return (
    <div className="bg-[#0f0d15] text-[#f1f1f1] selection:bg-white/20 selection:text-white min-h-screen overflow-hidden flex flex-col font-sans">
      {/* Background Radial Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#3b3742_0%,_transparent_100%)]"></div>
      </div>

      {/* Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenCmdK={() => setIsCmdKOpen(true)}
        onOpenNewNote={() => setIsNewNoteOpen(true)}
        noteCount={notes.length}
        currentUser={user}
        onLogout={handleLogout}
      />

      {/* AI Toast Banner */}
      {aiNotice && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#15121b] border border-[#c8bfff] text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-[#c8bfff] animate-spin-slow" />
          <span>{aiNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="relative z-10 pt-16 sm:pt-24 h-screen flex flex-col">
        {/* Context Category Filters */}
        <FilterBar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoryCounts={categoryCounts}
        />

        {/* Mobile View Toggle (Feed vs Graph) */}
        <div className="lg:hidden px-3 mb-2 shrink-0">
          <div className="bg-[#0f0d15] p-1 rounded-full border border-[#27272a] grid grid-cols-2 gap-1 text-xs font-bold">
            <button
              onClick={() => setMobileTab('feed')}
              className={`py-2 rounded-full transition-all flex items-center justify-center gap-2 ${
                mobileTab === 'feed' ? 'bg-white text-[#1b1b1b] shadow-md' : 'text-[#cfc4c5] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_agenda</span>
              <span>Memories ({filteredNotes.length})</span>
            </button>
            <button
              onClick={() => setMobileTab('graph')}
              className={`py-2 rounded-full transition-all flex items-center justify-center gap-2 ${
                mobileTab === 'graph' ? 'bg-white text-[#1b1b1b] shadow-md' : 'text-[#cfc4c5] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">hub</span>
              <span>Neural Graph</span>
            </button>
          </div>
        </div>

        {/* Split Screen Layout matching prototype (1/3 feed, 2/3 2D brain graph) */}
        <div className="flex flex-1 overflow-hidden px-3 sm:px-8 pb-3 sm:pb-8 gap-4 lg:gap-8">
          {/* Left Column: Note Feed (1/3) */}
          <aside className={`w-full lg:w-1/3 flex-col gap-4 sm:gap-6 overflow-y-auto no-scrollbar pb-16 sm:pb-24 pr-1 ${
            mobileTab === 'feed' ? 'flex' : 'hidden lg:flex'
          }`}>
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <div key={note.id} onDoubleClick={() => setInspectedNote(note)}>
                  <NoteCard
                    note={note}
                    isSelected={selectedNote?.id === note.id}
                    onSelect={(n) => {
                      setSelectedNote(n);
                    }}
                    onToggleChecklist={handleToggleChecklist}
                    onDeleteNote={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                  />
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-[#1d1a23] border border-[#27272a] rounded-2xl space-y-3">
                <Brain className="w-8 h-8 text-[#7e7576] mx-auto" />
                <div className="text-sm font-bold text-white">No memory nodes found</div>
                <p className="text-xs text-[#7e7576]">
                  Try adjusting your filter or search query, or create a new neural memory node.
                </p>
                <button
                  onClick={() => setIsNewNoteOpen(true)}
                  className="px-4 py-2 rounded-full bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-colors"
                >
                  Create Memory Node
                </button>
              </div>
            )}
          </aside>

          {/* Right Column: Interactive 2D Force Graph Workspace (2/3) */}
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
              onSelectCategory={(category) => {
                setActiveCategory(category);
              }}
              activeCategory={activeCategory}
            />
          </div>
        </div>
      </main>

      {/* Cmd K Modal */}
      <CmdKModal
        isOpen={isCmdKOpen}
        onClose={() => setIsCmdKOpen(false)}
        notes={notes}
        onSelectNote={(note) => {
          setSelectedNote(note);
          setInspectedNote(note);
        }}
        onOpenNewNote={() => setIsNewNoteOpen(true)}
        onAiSynthesize={handleAiSynthesize}
      />

      {/* New Note Modal */}
      <NewNoteModal
        isOpen={isNewNoteOpen}
        onClose={() => setIsNewNoteOpen(false)}
        onAddNote={handleAddNote}
        existingNotes={notes}
      />

      {/* Note Detail / Inspector Modal */}
      <NoteDetailModal
        note={liveInspectedNote}
        onClose={() => setInspectedNote(null)}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        allNotes={notes}
      />
    </div>
  );
}
