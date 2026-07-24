import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CATEGORY_COLORS, type Category } from '../types';
import { useAuth } from '../auth/AuthProvider';
import { deriveKdk } from '../security/kdf';
import { readVault, setMasterSalt } from '../security/keystore';
import { generateSalt } from '../security/cipher';
import { flush as flushDb, openDatabase, closeDatabase, queryAll as dbQueryAll, exec as execSql } from '../db/DbClient';
import { safeLog } from '../security/logSanitizer';
import {
  X, KeyRound, Tag, Cpu, ShieldCheck, ChevronRight,
  Download, Trash2, HardDrive, Plus, Pencil, Check, User,
} from 'lucide-react';

type SettingsTab = 'profile' | 'pin' | 'categories' | 'ai-model';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'pin', label: 'Change PIN', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
  { id: 'ai-model', label: 'AI Model', icon: <Cpu className="w-4 h-4" /> },
];

// ───── Custom categories (localStorage-backed) ─────

const LS_CUSTOM_CATS = '2brain-custom-categories';

function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_CATS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveCustomCategories(cats: string[]): void {
  localStorage.setItem(LS_CUSTOM_CATS, JSON.stringify(cats));
}

function getAllCategories(): string[] {
  const builtin: Category[] = ['General', 'Work', 'Personal', 'Ideas', 'Learning'];
  const custom = loadCustomCategories();
  return [...builtin, ...custom];
}

// ───── Main Modal ─────

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('pin');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#15121b] border border-[#27272a] w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#27272a]">
          <h2 className="text-lg font-bold text-white tracking-tight">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#7e7576] hover:text-white hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-44 sm:w-52 border-r border-[#27272a] p-3 space-y-1 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-[#1b1b1b] shadow-md'
                    : 'text-[#cfc4c5] hover:bg-[#1d1a23] hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'pin' && <PinTab onClose={onClose} />}
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'ai-model' && <AiModelTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

// ───── Profile Tab ─────

function ProfileTab() {
  const { state, updateUserName } = useAuth();
  const userName = state.kind === 'active' ? state.user.name : 'You';

  // Split current name into first and last
  const nameParts = userName.trim().split(/\s+/);
  const initialFirst = nameParts[0] || '';
  const initialLast = nameParts.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || 'You';
    updateUserName(fullName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dirty = firstName !== initialFirst || lastName !== initialLast;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">Profile</h3>
        <p className="text-xs text-[#7e7576]">Update your display name shown across the app.</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
          <ShieldCheck className="w-4 h-4" />
          Profile updated successfully.
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            placeholder="Last name"
          />
        </div>

        {/* Preview */}
        <div className="p-3 rounded-xl bg-[#1d1a23] border border-[#27272a] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white text-[#1b1b1b] flex items-center justify-center font-bold text-sm">
            {([firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'You')
              .split(' ')
              .map((s) => s[0])
              .filter(Boolean)
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'YOU'}
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {[firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'You'}
            </div>
            <div className="text-[10px] text-[#7e7576]">This is how your name will appear</div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!dirty || !firstName.trim()}
          className="w-full py-3 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-all disabled:opacity-40"
        >
          {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ───── PIN Change Tab ─────

function readAuthMethodFromMeta(): 'pin' | 'seed' | null {
  try {
    const rows = dbQueryAll<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      ['auth_method'],
    );
    const v = rows[0]?.value;
    if (v === 'pin' || v === 'seed') return v;
    return null; // legacy users: treat as pin-based
  } catch {
    return null;
  }
}

function PinTab({ onClose }: { onClose: () => void }) {
  const isSeedBased = useMemo(() => readAuthMethodFromMeta() === 'seed', []);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPin.length < 6) {
      setError('New PIN must be at least 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setLoading(true);
    const vault = await readVault();
    const oldSalt = vault.master_salt;
    try {
      if (!oldSalt) throw new Error('No vault found');

      if (!isSeedBased) {
        // PIN-based: verify current PIN before changing.
        await deriveKdk(currentPin, oldSalt);
      }

      // Generate new key material
      const newSalt = generateSalt();
      const newKey = await deriveKdk(newPin, newSalt);

      // Update salt BEFORE flush so envelope and vault share the same salt.
      // flush() reads vault.master_salt to stamp the envelope; openDatabase()
      // compares envelope salt against vault — they must match.
      await setMasterSalt(newSalt);

      // Mark as PIN-based (must happen BEFORE flush to be included in the
      // IDB snapshot; flush exports the in-memory DB, then close+reopen
      // reloads from IDB — anything after flush is lost).
      execSql('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)', ['auth_method', 'pin']);

      // Flush current DB with new key
      await flushDb(newKey);

      // Close old DB and re-open with new key
      closeDatabase();
      await openDatabase(newKey, { fresh: false });

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      // Rollback: restore old salt if we already changed it
      if (oldSalt) {
        try { await setMasterSalt(oldSalt); } catch { /* best-effort */ }
      }
      setError(
        isSeedBased
          ? 'Something went wrong setting the PIN.'
          : 'Current PIN is incorrect or something went wrong.',
      );
      safeLog.error('pin change failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">
          {isSeedBased ? 'Set Master PIN' : 'Change Master PIN'}
        </h3>
        <p className="text-xs text-[#7e7576]">
          {isSeedBased
            ? 'Your brain was restored from a recovery seed. Set a PIN so you can unlock quickly without re-entering your seed each time.'
            : 'Enter your current PIN and choose a new one.'}
        </p>
      </div>

      {success ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
          <ShieldCheck className="w-4 h-4" />
          {isSeedBased ? 'PIN set successfully.' : 'PIN changed successfully.'}
        </div>
      ) : (
        <form onSubmit={handleSetPin} className="space-y-4">
          {!isSeedBased && (
            <div>
              <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
                Current PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
                placeholder="••••••"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              New PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
              placeholder="6–12 digits"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#7e7576] uppercase tracking-wider mb-1.5">
              Confirm New PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="bg-[#fe7674]/15 border border-[#fe7674]/40 text-[#fe7674] text-xs px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isSeedBased && !currentPin) || !newPin || !confirmPin}
            className="w-full py-3 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-all disabled:opacity-40"
          >
            {loading
              ? (isSeedBased ? 'Setting PIN...' : 'Changing PIN...')
              : (isSeedBased ? 'Set PIN' : 'Change PIN')}
          </button>
        </form>
      )}
    </div>
  );
}

// ───── Categories Tab ─────

function CategoriesTab() {
  const [customCats, setCustomCats] = useState<string[]>(loadCustomCategories);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCatInput, setNewCatInput] = useState('');

  const allCats = getAllCategories();
  const builtin: Category[] = ['General', 'Work', 'Personal', 'Ideas', 'Learning'];

  const handleRename = (oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCat(null);
      return;
    }
    // Don't allow duplicate names
    if (allCats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    const updated = customCats.map((c) => (c === oldName ? trimmed : c));
    setCustomCats(updated);
    saveCustomCategories(updated);
    setEditingCat(null);
  };

  const handleAdd = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (allCats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = [...customCats, trimmed];
    setCustomCats(updated);
    saveCustomCategories(updated);
    setNewCatInput('');
  };

  const handleDelete = (name: string) => {
    const updated = customCats.filter((c) => c !== name);
    setCustomCats(updated);
    saveCustomCategories(updated);
  };

  // Assign rotating colors to custom categories
  const colorPool = ['#fe7674', '#c8bfff', '#e5deff', '#a3e635', '#fbbf24', '#34d399', '#60a5fa'];
  const getColor = (name: string, idx: number) => {
    if (name in CATEGORY_COLORS) return CATEGORY_COLORS[name as Category];
    return colorPool[idx % colorPool.length];
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">Categories</h3>
        <p className="text-xs text-[#7e7576]">
          Manage categories to organize your notes. Built-in categories cannot be deleted.
        </p>
      </div>

      <div className="space-y-2">
        {allCats.map((cat, idx) => {
          const color = getColor(cat, idx);
          const isBuiltin = builtin.includes(cat as Category);

          return (
            <div
              key={cat}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1d1a23] border border-[#27272a]"
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-[#1d1a23]"
                style={{ backgroundColor: color }}
              />
              {editingCat === cat ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(cat); if (e.key === 'Escape') setEditingCat(null); }}
                  onBlur={() => handleRename(cat)}
                  className="flex-1 bg-[#0f0d15] border border-white rounded-lg px-2 py-1 text-sm text-white outline-none"
                />
              ) : (
                <span className="text-sm font-bold text-white flex-1">{cat}</span>
              )}
              <span className="text-[10px] text-[#7e7576] uppercase tracking-wider">
                {isBuiltin ? (cat === 'General' ? 'Default' : 'Built-in') : 'Custom'}
              </span>
              {!isBuiltin && editingCat !== cat && (
                <button
                  onClick={() => { setEditingCat(cat); setEditValue(cat); }}
                  className="p-1 text-[#7e7576] hover:text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {editingCat === cat && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleRename(cat); }}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              {!isBuiltin && (
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1 text-[#7e7576] hover:text-[#fe7674] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new category */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCatInput}
          onChange={(e) => setNewCatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="New category name..."
          className="flex-1 bg-[#1d1a23] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newCatInput.trim()}
          className="px-4 py-2.5 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 transition-all disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

// ───── AI Model Tab ─────

function AiModelTab() {
  const [modelStatus, setModelStatus] = useState<'not-downloaded' | 'downloading' | 'installed'>('not-downloaded');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleDownload = () => {
    setModelStatus('downloading');
    setDownloadProgress(0);
    intervalRef.current = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setModelStatus('installed');
          return 100;
        }
        return prev + Math.random() * 15 + 3;
      });
    }, 600);
  };

  const handleDelete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setModelStatus('not-downloaded');
    setDownloadProgress(0);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">AI Model</h3>
        <p className="text-xs text-[#7e7576]">
          Manage the local Gemma 4 2B model for on-device AI processing.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#1d1a23] border border-[#27272a] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c8bfff]/15 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#c8bfff]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Gemma 4 2B</div>
              <div className="text-[10px] text-[#7e7576]">Quantized · ~1.8 GB</div>
            </div>
          </div>

          {modelStatus === 'installed' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
              Installed
            </span>
          )}
          {modelStatus === 'not-downloaded' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#27272a] text-[#7e7576] border border-[#27272a]">
              Not installed
            </span>
          )}
        </div>

        {modelStatus === 'downloading' && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#c8bfff] font-bold">Downloading...</span>
              <span className="text-[#7e7576]">{Math.min(Math.round(downloadProgress), 100)}%</span>
            </div>
            <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c8bfff] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(downloadProgress, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[#7e7576]">
              {(1.8 * downloadProgress / 100).toFixed(1)} GB / 1.8 GB
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {modelStatus === 'not-downloaded' && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#c8bfff] text-[#190262] font-bold text-xs hover:bg-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Model
            </button>
          )}
          {modelStatus === 'downloading' && (
            <button disabled className="flex-1 py-2.5 rounded-xl bg-[#27272a] text-[#7e7576] font-bold text-xs cursor-wait">
              Downloading...
            </button>
          )}
          {modelStatus === 'installed' && (
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#fe7674]/15 border border-[#fe7674]/30 text-[#fe7674] font-bold text-xs hover:bg-[#fe7674]/25 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Model
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1d1a23] border border-[#27272a] text-xs">
        <HardDrive className="w-4 h-4 text-[#7e7576] shrink-0" />
        <span className="text-[#cfc4c5]">Available storage: </span>
        <span className="font-bold text-white">6.4 GB / 100 GB</span>
      </div>
    </div>
  );
}
