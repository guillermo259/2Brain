/**
 * LockScreen.tsx — Pantalla de desbloqueo después del setup.
 *
 * Comportamiento:
 *   - Auto-prompt biométrico en mount si está capacitado y registrado.
 *   - Fallback a keypad numérico (6–12 dígitos).
 *   - Contador de intentos restantes visible.
 *   - Disabled UI mientras valida.
 *   - Link "Restore with seed" para casos extremos.
 *
 * Bugfix: la biometric en MVP es **un paso de confianza visual** — el
 * unlock real requiere siempre el PIN. Mostramos feedback claro (check
 * verde) para que el usuario no crea que "la huella le dio acceso".
 */

import React, { useEffect, useRef, useState } from 'react';
import { Lock, Unlock, Fingerprint, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { generateMnemonic12 } from '../security/recoverySeed';
import { useKeypadInput } from './useKeypadInput';

export const LockScreen: React.FC = () => {
  const { unlock, tryBiometricUnlock, state, capabilities, wipe } = useAuth();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const pinRef = useRef('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [bioVerified, setBioVerified] = useState(false);

  // Auto-prompt biometric on mount.
  useEffect(() => {
    if (!capabilities.biometrics) return;
    if (state.kind !== 'locked') return;
    let cancelled = false;
    (async () => {
      try {
        const ok = await tryBiometricUnlock();
        if (!cancelled) setBioVerified(ok);
      } catch {
        if (!cancelled) setBioVerified(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [capabilities.biometrics, state.kind, tryBiometricUnlock]);

  const submit = async () => {
    if (pin.length < 6) {
      setError('PIN must be at least 6 digits');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await unlock(pin);
      // success → AuthProvider transitions to active
    } catch (e) {
      setError((e as Error).message);
      setPin('');
      pinRef.current = '';
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigit = (d: string) => {
    if (isLoading) return;
    if (pin.length >= 12) return;
    const next = pin + d;
    setPin(next);
    pinRef.current = next;
  };

  const handleBackspace = () => {
    if (isLoading) return;
    const next = pin.slice(0, -1);
    setPin(next);
    pinRef.current = next;
  };

  // Keyboard support for desktop / laptop users: digits / Backspace / Enter.
  // Ignora IME y los inputs de otros campos (no hay aquí pero defensivo).
  useKeypadInput({
    enabled: !isLoading,
    onDigit: handleDigit,
    onBackspace: handleBackspace,
    onSubmit: submit,
  });

  const handleTryBiometric = async () => {
    if (!capabilities.biometrics) return;
    setError(null);
    setBioVerified(false);
    const ok = await tryBiometricUnlock();
    if (ok) {
      setBioVerified(true);
    } else {
      setError('Biometric verification failed — enter your PIN.');
    }
  };

  const attemptsRemaining =
    state.kind === 'locked' ? Math.max(0, 5 - state.failedAttempts) : 5;

  // -------------------- Render --------------------

  return (
    <div className="min-h-screen bg-[#0f0d15] text-[#f1f1f1] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#4d445c_0%,_transparent_70%)]"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#fe7674]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#c8bfff]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#15121b]/90 backdrop-blur-2xl border border-[#27272a] rounded-[2rem] shadow-2xl max-h-[95vh] overflow-y-auto no-scrollbar">
        <div className="p-8 sm:p-12 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#1b1b1b] flex items-center justify-center font-black text-xl shadow-lg">
              2B
            </div>
            <span className="text-2xl font-black tracking-tighter text-white italic">
              2Brain
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex w-14 h-14 rounded-full bg-[#1d1a23] border border-[#27272a] items-center justify-center">
              <Lock className="w-6 h-6 text-[#c8bfff]" />
            </div>
            <h1 className="text-xl font-extrabold text-white leading-tight">
              Brain Locked
            </h1>
            <p className="text-xs text-[#cfc4c5] leading-relaxed">
              Enter your master PIN to decrypt your memory matrix.
            </p>
          </div>

          {/* PIN pad dots */}
          <div className="flex items-center justify-center gap-2 min-h-[20px]">
            {/* Grow-only: tantos puntos como dígitos tipeados (cap 12). */}
            {Array.from({ length: Math.min(pin.length, 12) }, (_, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full bg-white border border-white shadow-inner"
              />
            ))}
          </div>

          {error && (
            <div className="bg-[#fe7674]/15 border border-[#fe7674]/40 text-[#fe7674] text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          {bioVerified && (
            <div className="bg-[#c8bfff]/15 border border-[#c8bfff]/40 text-[#c8bfff] text-xs px-4 py-3 rounded-xl flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" />
              <span>Identity confirmed — now enter your PIN.</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(String(d))}
                disabled={isLoading}
                className="aspect-square rounded-xl bg-[#1d1a23] border border-[#27272a] hover:border-white text-white font-bold text-lg disabled:opacity-50 transition-all active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={handleTryBiometric}
              disabled={!capabilities.biometrics || isLoading}
              title={capabilities.biometrics ? 'Unlock with biometrics' : 'Biometrics not available'}
              className="aspect-square rounded-xl bg-[#1d1a23] border border-[#27272a] hover:border-white text-white flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
            >
              <Fingerprint className="w-5 h-5 text-[#c8bfff]" />
            </button>
            <button
              onClick={() => handleDigit('0')}
              disabled={isLoading}
              className="aspect-square rounded-xl bg-[#1d1a23] border border-[#27272a] hover:border-white text-white font-bold text-lg disabled:opacity-50 transition-all active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={isLoading}
              className="aspect-square rounded-xl bg-[#1d1a23] border border-[#27272a] hover:border-white text-white flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 text-lg"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={submit}
            disabled={pin.length < 6 || isLoading}
            className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock 2Brain</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#7e7576] pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              AES-256-GCM at rest
            </span>
            <span>Attempts: {attemptsRemaining}/5</span>
          </div>

          <button
            type="button"
            onClick={() => setShowForgotPin((v) => !v)}
            className="w-full text-[11px] text-[#7e7576] hover:text-[#cfc4c5] transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3 h-3" />
            Forgot PIN? Restore with recovery seed.
          </button>

          {showForgotPin && (
            <div className="rounded-xl bg-[#0f0d15] border border-[#27272a] p-4 text-xs space-y-3">
              <p className="text-[#cfc4c5] leading-relaxed">
                If you have your <strong>12-word recovery seed</strong>, you can
                restore your brain on this device. The current encrypted database
                will be wiped, and you'll need to enter your seed to recover access.
              </p>
              <p className="text-[#fe7674] text-[11px] leading-relaxed">
                Without a recovery seed, your data will be permanently lost.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPin(false)}
                  className="py-2 px-3 rounded-xl bg-[#1d1a23] border border-[#27272a] text-[11px] font-bold hover:bg-[#27272a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { void wipe(); }}
                  className="py-2 px-3 rounded-xl bg-[#c8bfff] text-[#190262] text-[11px] font-bold hover:bg-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3 h-3" />
                  Restore from seed
                </button>
              </div>
            </div>
          )}

          {/* Dev helper: generate a seed (only in dev). */}
          {import.meta.env.DEV && (
            <div className="rounded-xl bg-[#0f0d15] border border-[#27272a] p-3 text-[11px] text-[#cfc4c5]">
              <strong>Dev mode:</strong>{' '}
              <code
                className="cursor-pointer underline"
                onClick={() => {
                  const m = generateMnemonic12();
                  navigator.clipboard?.writeText(m);
                  setShowForgotPin(true);
                  alert('Mnemonic copied to clipboard (dev only).\n\n' + m);
                }}
              >
                [generate+copy sample mnemonic]
              </code>
            </div>
          )}

          {/* Escape hatch: cuando se agotan los intentos, mostramos un
              botón explícito que wipe + vuelve a setting-up. */}
          {attemptsRemaining === 0 && (
            <div className="rounded-xl bg-[#fe7674]/10 border border-[#fe7674]/30 p-4 text-xs space-y-3">
              <div className="flex items-start gap-2 text-[#fe7674]">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Temporary lockout.</strong> Too many failed PIN
                  attempts. Use your 12-word recovery seed, or wipe this Brain
                  and start fresh.
                </span>
              </div>
              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#1d1a23] border border-[#fe7674]/40 text-[#fe7674] text-[11px] font-bold hover:bg-[#fe7674]/15 transition-colors"
                >
                  Wipe and create new Brain
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#cfc4c5]">
                    This will permanently <strong>destroy</strong> the
                    encrypted database stored in this device. Continue only if
                    you do not have a recovery seed.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(false)}
                      className="py-2 px-3 rounded-xl bg-[#1d1a23] border border-[#27272a] text-[11px] font-bold hover:bg-[#27272a] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void wipe();
                      }}
                      className="py-2 px-3 rounded-xl bg-[#fe7674] text-[#1b1b1b] text-[11px] font-bold hover:bg-[#fe7674]/85 transition-colors"
                    >
                      Confirm wipe
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
