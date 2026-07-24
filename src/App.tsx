import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { NoteCard } from './components/NoteCard';
import { Graph2D } from './components/Graph2D';
import { CmdKModal } from './components/CmdKModal';
import { NewNoteModal } from './components/NewNoteModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { useAuth } from './auth/AuthProvider';
import { notesRepo } from './db/NotesRepository';
import { flush as flushDb } from './db/DbClient';
import { vectorRepo } from './db/VectorRepository';
import { safeLog } from './security/logSanitizer';
import { runPipeline, markAutoCategorized } from './ai/Pipeline';
import { initEmbeddings, isEmbeddingReady, getEmbeddingDownloadProgress, isEmbeddingCached } from './ai/EmbeddingService';
import { isLlmReady } from './ai/LlmService';
import { NoteItem } from './types';
import { Brain, Cpu, Download, HardDrive, X, AlertTriangle } from 'lucide-react';

export default function App() {
  const { state, notes, refreshNotes, lock: lockAuth } = useAuth();

  if (state.kind !== 'active') return null;

  const { user, masterKey } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const handleSetCategory = useCallback((cat: string | null) => {
    setActiveCategory(cat);
    if (cat === null) setFitTrigger((n) => n + 1);
  }, []);

  const handleSetTag = useCallback((tag: string | null) => {
    setActiveTag(tag);
    if (tag === null) setFitTrigger((n) => n + 1);
  }, []);

  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inspectedNote, setInspectedNote] = useState<NoteItem | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiClassifying, setAiClassifying] = useState<{ noteId: string; status: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<'feed' | 'graph'>('feed');

  // ──── AI Embeddings download state ────
  const [embStatus, setEmbStatus] = useState<'checking' | 'loading' | 'downloading' | 'ready' | 'error'>('checking');
  const [embErrorMsg, setEmbErrorMsg] = useState<string | null>(null);
  const [embBannerDismissed, setEmbBannerDismissed] = useState(false);
  const [embProgress, setEmbProgress] = useState(0);
  const downloadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadStartedRef = useRef(false);

  const startEmbeddingPolling = useCallback(() => {
    if (downloadTimerRef.current) {
      clearInterval(downloadTimerRef.current);
    }
    downloadTimerRef.current = setInterval(() => {
      const ep = getEmbeddingDownloadProgress();
      setEmbProgress(ep);

      if (isEmbeddingReady()) {
        setEmbStatus('ready');
        setEmbProgress(100);
        if (downloadTimerRef.current) {
          clearInterval(downloadTimerRef.current);
          downloadTimerRef.current = null;
        }
      }
    }, 300);
  }, []);

  // Iniciar descarga de embeddings al montar
  useEffect(() => {
    if (downloadStartedRef.current) return;
    downloadStartedRef.current = true;

    (async () => {
      try {
        const cached = await isEmbeddingCached();
        setEmbStatus(cached ? 'loading' : 'downloading');
      } catch {
        setEmbStatus('downloading');
      }

      initEmbeddings()
        .then(() => {
          setEmbStatus('ready');
          setEmbProgress(100);
          if (downloadTimerRef.current) {
            clearInterval(downloadTimerRef.current);
            downloadTimerRef.current = null;
          }
        })
        .catch((e) => {
          safeLog.error('embedding download failed', e);
          setEmbStatus('error');
          setEmbErrorMsg((e as Error).message || 'Failed to load embedding model');
          if (downloadTimerRef.current) {
            clearInterval(downloadTimerRef.current);
            downloadTimerRef.current = null;
          }
        });

      startEmbeddingPolling();
    })();

    return () => {
      if (downloadTimerRef.current) {
        clearInterval(downloadTimerRef.current);
        downloadTimerRef.current = null;
      }
    };
  }, [startEmbeddingPolling]);

  const handleRetryEmbeddings = useCallback(() => {
    setEmbStatus('downloading');
    setEmbErrorMsg(null);
    setEmbProgress(0);
    setEmbBannerDismissed(false);

    initEmbeddings()
      .then(() => {
        setEmbStatus('ready');
        setEmbProgress(100);
      })
      .catch((e) => {
        safeLog.error('embedding retry failed', e);
        setEmbStatus('error');
        setEmbErrorMsg((e as Error).message || 'Failed to load embedding model');
      });

    startEmbeddingPolling();
  }, [startEmbeddingPolling]);

  const commitChanges = useCallback(async () => {
    try {
      refreshNotes();
      await flushDb(masterKey);
    } catch (e) {
      safeLog.error('commitChanges failed', e);
    }
  }, [masterKey, refreshNotes]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((note) => {
      counts[note.category] = (counts[note.category] || 0) + 1;
    });
    return counts;
  }, [notes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((note) => note.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

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
        // If no title provided, use a placeholder while AI processes
        const noteToCreate = {
          ...newNote,
          title: newNote.title || 'Processing...',
          category: newNote.category || 'General',
        };
        const created = notesRepo.create(noteToCreate);
        await commitChanges();
        setSelectedNote(created);
        setAiNotice('Note created. AI classifying...');
        setAiClassifying({ noteId: created.id, status: 'embedding' });

        // Use content as primary input; fallback title is a truncation of the content
        const pipelineContent = created.content || created.title;
        const fallbackTitle = created.content
          ? created.content.slice(0, 40).trim()
          : created.title;

        runPipeline(created.id, pipelineContent, fallbackTitle, (progress) => {
          setAiClassifying({ noteId: created.id, status: progress.stage });
        })
          .then(async (result) => {
            try {
              notesRepo.update(created.id, {
                title: result.title,
                category: result.category,
                tags: result.tags,
              });

              await vectorRepo.upsertEmbedding(created.id, result.embedding);

              markAutoCategorized(created.id);

              await commitChanges();
              setAiNotice(`AI classified as "${result.category}"`);
              setAiClassifying(null);
            } catch (e) {
              safeLog.error('pipeline update failed', e);
              setAiClassifying(null);
            }
            setTimeout(() => setAiNotice(null), 4000);
          })
          .catch((e) => {
            safeLog.error('pipeline failed', e);
            setAiClassifying(null);
            setAiNotice('AI classification failed — saved with defaults.');
            setTimeout(() => setAiNotice(null), 4000);
          });
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

  // Helpers para el banner
  const embBannerVisible = (embStatus === 'downloading' || embStatus === 'loading' || embStatus === 'error') && !embBannerDismissed;
  const embReady = isEmbeddingReady();
  const isFromCache = embStatus === 'loading';

  const getEmbLabel = (): string => {
    if (embReady) return 'Ready';
    if (isFromCache) return 'Loading from cache...';
    if (embProgress === 0) return 'Starting...';
    if (embProgress >= 100) return 'Finalizing...';
    return `${embProgress}%`;
  };

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
        onOpenSettings={() => setIsSettingsOpen(true)}
        noteCount={notes.length}
        currentUser={user}
        onLogout={handleLogout}
        aiModelsReady={embStatus === 'ready' && isLlmReady()}
      />

      {/* Embedding Model Download Banner */}
      {embBannerVisible && (
        <div className="fixed top-14 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#15121b] border border-[#27272a] rounded-2xl shadow-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  embStatus === 'error' ? 'bg-[#fe7674]/15' : isFromCache ? 'bg-[#34d399]/15' : 'bg-[#c8bfff]/15'
                }`}>
                  {embStatus === 'error' ? (
                    <AlertTriangle className="w-5 h-5 text-[#fe7674]" />
                  ) : isFromCache ? (
                    <HardDrive className="w-5 h-5 text-[#34d399] animate-pulse" />
                  ) : (
                    <Download className="w-5 h-5 text-[#c8bfff] animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {embStatus === 'error'
                      ? 'Download Failed'
                      : isFromCache
                        ? 'Loading Semantic Engine'
                        : 'Downloading Semantic Engine'}
                  </div>
                  <div className="text-[10px] text-[#7e7576]">
                    {embStatus === 'error'
                      ? (embErrorMsg || 'An error occurred.')
                      : isFromCache
                        ? 'Initializing from local cache'
                        : 'One-time setup (~90 MB) · Stays on your device'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEmbBannerDismissed(true)}
                className="p-1 rounded-full text-[#7e7576] hover:text-white hover:bg-[#27272a] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(embStatus === 'downloading' || embStatus === 'loading') && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#cfc4c5] flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${embReady ? 'bg-[#34d399]' : 'bg-[#c8bfff]'}`} />
                    MiniLM embedding
                  </span>
                  <span className="text-[#7e7576]">{getEmbLabel()}</span>
                </div>
                {!isFromCache && (
                  <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out bg-[#c8bfff]"
                      style={{ width: `${embProgress}%` }}
                    />
                  </div>
                )}
                <p className="text-[10px] text-[#7e7576] mt-1">
                  {isFromCache
                    ? 'Loading semantic search from cache...'
                    : 'Enables semantic search across your notes.'}
                </p>
              </div>
            )}

            {embStatus === 'error' && (
              <button
                onClick={handleRetryEmbeddings}
                className="w-full mt-3 py-2.5 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-colors"
              >
                Retry Download
              </button>
            )}
          </div>
        </div>
      )}

      {aiNotice && (
        <div className={`fixed left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 ${
          embBannerVisible
            ? 'top-44 sm:top-52'
            : 'top-20 sm:top-24'
        } ${
          aiClassifying
            ? 'bg-[#15121b] border border-[#c8bfff] text-[#c8bfff]'
            : 'bg-[#15121b] border border-[#c8bfff] text-white'
        }`}>
          {aiClassifying && <Cpu className="w-3.5 h-3.5 animate-pulse" />}
          <span>{aiNotice}</span>
        </div>
      )}

      <main className="relative z-10 pt-16 sm:pt-24 h-screen flex flex-col">
        <FilterBar
          activeCategory={activeCategory}
          onSelectCategory={handleSetCategory}
          activeTag={activeTag}
          onSelectTag={handleSetTag}
          categoryCounts={categoryCounts}
          allTags={allTags}
        />

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

          <div className={`w-full lg:w-2/3 h-full ${
            mobileTab === 'graph' ? 'block' : 'hidden lg:block'
          }`}>
            <Graph2D
              notes={filteredNotes}
              selectedNoteId={selectedNote?.id || null}
              fitTrigger={fitTrigger}
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
