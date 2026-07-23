import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { NoteCard } from './components/NoteCard';
import { Graph2D } from './components/Graph2D';
import { CmdKModal } from './components/CmdKModal';
import { NewNoteModal } from './components/NewNoteModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { INITIAL_NOTES } from './data/initialNotes';
import { NoteItem, ContextCategory } from './types';
import { Sparkles, Brain, Plus, Mic, CheckSquare, Image as ImageIcon, Network } from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<NoteItem[]>(INITIAL_NOTES);
  const [activeCategory, setActiveCategory] = useState<ContextCategory>('Everywhere');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Modals
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [inspectedNote, setInspectedNote] = useState<NoteItem | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'feed' | 'graph'>('feed');

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ContextCategory, number> = {
      Everywhere: notes.length,
      'Deep Work': 0,
      Philosophical: 0,
      Infrastructure: 0,
      Visuals: 0
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
      // Category filter
      if (activeCategory !== 'Everywhere' && note.category !== activeCategory) {
        return false;
      }

      // Search query filter
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
  const handleToggleChecklist = (noteId: string, itemId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId || !n.checklist) return n;
        return {
          ...n,
          checklist: n.checklist.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          )
        };
      })
    );
  };

  const handleTogglePin = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) setSelectedNote(null);
  };

  const handleAddNote = (newNote: NoteItem) => {
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
    setAiNotice(`New memory node "${newNote.title}" synced to 2B Brain.`);
    setTimeout(() => setAiNotice(null), 4000);
  };

  const handleUpdateNote = (updatedNote: NoteItem) => {
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    if (selectedNote?.id === updatedNote.id) setSelectedNote(updatedNote);
    setInspectedNote(updatedNote);
  };

  const handleAiSynthesize = (prompt: string) => {
    setAiNotice(`Gemini query running: "${prompt}"... Creating neural memory synthesis.`);
    setTimeout(() => {
      const generatedNote: NoteItem = {
        id: `note-ai-${Date.now()}`,
        title: `AI Synthesis: ${prompt.slice(0, 24)}...`,
        type: 'architecture',
        timestamp: 'JUST NOW',
        category: activeCategory === 'Everywhere' ? 'Infrastructure' : activeCategory,
        summary: `Synthesized knowledge based on prompt "${prompt}". Cross-indexed with local WASM database vectors and ${notes.length} brain nodes.`,
        tags: ['AI', 'SYNTHESIS', '2B'],
        icon: 'memory',
        connectedNodeIds: notes.slice(0, 3).map((n) => n.id)
      };
      setNotes((prev) => [generatedNote, ...prev]);
      setSelectedNote(generatedNote);
      setAiNotice(`Neural memory node created via AI query!`);
      setTimeout(() => setAiNotice(null), 4000);
    }, 1500);
  };

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
        note={inspectedNote}
        onClose={() => setInspectedNote(null)}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        allNotes={notes}
      />
    </div>
  );
}
