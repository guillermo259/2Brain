/**
 * OnboardingWizard.tsx — Primera configuración de 2Brain.
 *
 * Pasos:
 *   1. Welcome + Display name + continuar a PIN.
 *   2. Master PIN (keypad numérico 6 dígitos, con confirmación).
 *   3. Recovery seed (12 palabras) — mostrado + confirmación.
 *   4. (Opcional) Biométrico.
 *
 * También soporta "Restore from seed" como flujo alternativo.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useKeypadInput } from './useKeypadInput';
import {
  Brain,
  ShieldCheck,
  KeyRound,
  RefreshCcw,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { DotField } from '../components/DotField';
import { useAuth } from './AuthProvider';
import { generateMnemonic12, validateMnemonic } from '../security/recoverySeed';
import { checkBiometricSupport } from '../security/biometrics';
import { safeLog } from '../security/logSanitizer';

type Step = 'welcome' | 'pin' | 'pin-confirm' | 'seed' | 'seed-confirm' | 'restore';

const TRIVIAL_PINS = new Set(['000000', '111111', '123456', '654321', '000000']);

export const OnboardingWizard: React.FC = () => {
  const { completeSetup, completeSetupFromSeed, capabilities } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [restoreMnemonic, setRestoreMnemonic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enableBiometric, setEnableBiometric] = useState(true);

  const containerSize = useMemo(() => ({
    width: 1920,
    height: 1080,
  }), []);

  // UX: cuando el usuario re-tipea un dígito en cualquier campo PIN,
  // limpiamos el mensaje de error de la pantalla. Si el error no se
  // toca, queda obsoleto (e.g. "PINs do not match" sigue visible
  // mientras el usuario está corrigiendo).
  useEffect(() => {
    if (error) setError(null);
    // intentionally only depend on pin lengths / actual contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, pin2]);

  const submitNewBrain = async () => {
    if (pin.length < 6) {
      setError('PIN must be at least 6 digits.');
      return;
    }
    if (TRIVIAL_PINS.has(pin)) {
      setError('PIN is too simple. Pick something memorable but non-trivial.');
      return;
    }
    if (pin !== pin2) {
      setError('PINs do not match.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await completeSetup({
        pin,
        name: name.trim() || 'You',
        mnemonic,
        enableBiometric: enableBiometric && capabilities.biometrics,
      });
      // success → AuthProvider transitions to active; App renders.
    } catch (e) {
      safeLog.error('onboarding failed', e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const submitRestore = async () => {
    if (!validateMnemonic(restoreMnemonic)) {
      setError('Invalid recovery phrase. Check the words and order.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const caps = await checkBiometricSupport();
      await completeSetupFromSeed({
        mnemonic: restoreMnemonic.trim().toLowerCase(),
        name: name.trim() || 'You',
        enableBiometric: enableBiometric && caps.available && caps.uvAvailable,
      });
    } catch (e) {
      safeLog.error('restore failed', e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // --------- Step Renderers ---------

  const renderWelcome = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setStep('pin');
      }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold text-white leading-tight">
          Initialise your Brain
        </h1>
        <p className="text-xs text-[#cfc4c5] leading-relaxed">
          2Brain is encrypted locally with a master PIN set by you.
          We will generate a 12-word recovery seed to restore access
          if you forget it. Your data never leaves this device.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-[#cfc4c5] bg-[#0f0d15]/60 px-3.5 py-2.5 rounded-xl border border-[#27272a]">
          <ShieldCheck className="w-4 h-4 text-[#fe7674] shrink-0" />
          <span>AES-256-GCM encrypted at rest</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#cfc4c5] bg-[#0f0d15]/60 px-3.5 py-2.5 rounded-xl border border-[#27272a]">
          <KeyRound className="w-4 h-4 text-[#c8bfff] shrink-0" />
          <span>Master PIN + 12-word recovery seed (BIP-39)</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#cfc4c5] bg-[#0f0d15]/60 px-3.5 py-2.5 rounded-xl border border-[#27272a]">
          <Brain className="w-4 h-4 text-white shrink-0" />
          <span>Optional biometrics (WebAuthn passkey)</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-[#cfc4c5]">
          Display Name
        </label>
        {/* El botón "Create New Brain" debajo lleva type=submit implícito
            (primer button dentro de un form). Enter en cualquier input del
            form dispara submit -> onSubmit -> setStep('pin'). */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Julian Drake"
          autoFocus
          tabIndex={0}
          className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all"
        />
      </div>

      <div className="space-y-2 pt-2">
        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Create New Brain</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setStep('restore')}
          className="w-full py-3 px-4 rounded-xl bg-[#1d1a23] border border-[#27272a] hover:border-white text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
        >
          <RefreshCcw className="w-4 h-4 text-[#c8bfff]" />
          <span>Restore from recovery seed</span>
        </button>
      </div>
    </form>
  );

  const renderPinCapture = () => (
    <PinKeypad
      pin={pin}
      setPin={setPin}
      error={error}
      onConfirm={() => setStep('pin-confirm')}
      isLoading={isLoading}
      label="Master PIN"
      helper="6–12 digits. Choose a non-trivial sequence."
    />
  );

  const renderPinConfirm = () => (
    <PinKeypad
      pin={pin2}
      setPin={setPin2}
      error={error}
      onConfirm={() => {
        // Validación ANTES de avanzar al seed step. Antes de este fix el
        // usuario podía pulsar Continue con 2 dígitos y se iba directo
        // al paso del recovery seed. Ahora mostramos el motivo exacto.
        if (pin2.length < 6) {
          setError('PIN must be at least 6 digits.');
          return;
        }
        if (pin !== pin2) {
          setError('PINs do not match — please re-enter the same PIN.');
          return;
        }
        if (TRIVIAL_PINS.has(pin2)) {
          setError(
            'PIN is too simple. Pick something memorable but non-trivial.',
          );
          return;
        }
        const m = generateMnemonic12();
        setMnemonic(m);
        setStep('seed');
      }}
      isLoading={isLoading}
      label="Confirm PIN"
      helper="Enter the same PIN again to confirm."
    />
  );

  const renderSeed = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-extrabold text-white">Recovery seed</h2>
        <p className="text-xs text-[#cfc4c5] leading-relaxed">
          These 12 words are the ONLY way to recover your Brain if you forget
          your PIN. Write them down on paper and keep them somewhere offline.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {mnemonic.split(' ').map((w, i) => (
          <div
            key={i}
            className="px-3 py-2 rounded-lg bg-[#0f0d15] border border-[#27272a] text-xs font-mono flex items-center justify-between"
          >
            <span className="text-[#7e7576] mr-2">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-bold flex-1 text-white">{w}</span>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#fe7674]/10 border border-[#fe7674]/30 text-xs text-[#fe7674]">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <span>This seed is shown only once. If you lose it, no one — not even
        us — can recover your data.</span>
      </div>
      <button
        onClick={() => setStep('seed-confirm')}
        className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        <span>I have saved my seed</span>
      </button>
    </div>
  );

  const renderSeedConfirm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-extrabold text-white">Confirm seed</h2>
        <p className="text-xs text-[#cfc4c5] leading-relaxed">
          Re-enter your seed exactly to confirm you've saved it.
        </p>
      </div>
      <textarea
        value={restoreMnemonic} // reuse for verification
        onChange={(e) => setRestoreMnemonic(e.target.value)}
        rows={3}
        placeholder="word1 word2 word3 ..."
        className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all resize-none"
      />
      <label className="flex items-center gap-2 text-xs text-[#cfc4c5] cursor-pointer">
        <input
          type="checkbox"
          checked={enableBiometric}
          onChange={(e) => setEnableBiometric(e.target.checked)}
          disabled={!capabilities.biometrics}
          className="rounded border-[#27272a] bg-[#0f0d15] text-white accent-white"
        />
        <span>
          Enable biometric unlock ({capabilities.biometrics ? 'available' : 'not available on this device'})
        </span>
      </label>
      <button
        onClick={async () => {
          if (restoreMnemonic.trim().toLowerCase() !== mnemonic.trim().toLowerCase()) {
            setError('Seed does not match. Try again.');
            return;
          }
          // Reset restoreMnemonic; reuse it later if we restart.
          setRestoreMnemonic('');
          await submitNewBrain();
        }}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <span>Initialise Brain</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {error && (
        <div className="bg-[#fe7674]/15 border border-[#fe7674]/40 text-[#fe7674] text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}
    </div>
  );

  const renderRestore = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-extrabold text-white">Restore Brain</h2>
        <p className="text-xs text-[#cfc4c5] leading-relaxed">
          Enter your 12-word recovery phrase, separated by spaces.
        </p>
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#fe7674]/10 border border-[#fe7674]/30 text-xs text-[#fe7674]">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Heads up:</strong> “Restore from seed” creates a NEW
            encrypted Brain whose masterKey is derived from your mnemonic
            alone. Any previously PIN-encrypted memories stored on this
            device will not be decrypted (use the PIN unlock for those).
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-[#cfc4c5]">
          Display Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Julian Drake"
          className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all"
        />
      </div>
      <textarea
        value={restoreMnemonic}
        onChange={(e) => setRestoreMnemonic(e.target.value)}
        rows={3}
        placeholder="word1 word2 word3 ..."
        className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all resize-none"
      />
      <button
        onClick={submitRestore}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <span>Restore Brain</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {error && (
        <div className="bg-[#fe7674]/15 border border-[#fe7674]/40 text-[#fe7674] text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}
      <button
        onClick={() => setStep('welcome')}
        className="w-full text-[11px] text-[#7e7576] hover:text-[#cfc4c5] transition-colors"
      >
        ← Back to setup
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0d15] text-[#f1f1f1] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#4d445c_0%,_transparent_70%)]"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#fe7674]/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#c8bfff]/15 rounded-full blur-3xl"></div>
      </div>
      <DotField width={containerSize.width} height={containerSize.height} mousePos={null} />

      <div className="relative z-10 w-full max-w-md bg-[#15121b]/90 backdrop-blur-2xl border border-[#27272a] rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#1b1b1b] flex items-center justify-center font-black text-xl shadow-lg">
              2B
            </div>
            <span className="text-2xl font-black tracking-tighter text-white italic">
              2Brain
            </span>
          </div>
          {step === 'welcome' && renderWelcome()}
          {step === 'pin' && renderPinCapture()}
          {step === 'pin-confirm' && renderPinConfirm()}
          {step === 'seed' && renderSeed()}
          {step === 'seed-confirm' && renderSeedConfirm()}
          {step === 'restore' && renderRestore()}
        </div>
      </div>
    </div>
  );
};

// ---------- PinKeypad ----------

const PinKeypad: React.FC<{
  pin: string;
  setPin: (s: string) => void;
  error: string | null;
  onConfirm: () => void;
  isLoading: boolean;
  label: string;
  helper: string;
}> = ({ pin, setPin, error, onConfirm, isLoading, label, helper }) => {
  const handleDigit = (d: string) => {
    if (isLoading) return;
    if (pin.length >= 12) return;
    setPin(pin + d);
  };
  const handleBackspace = () => {
    if (isLoading) return;
    setPin(pin.slice(0, -1));
  };

  // Keyboard support for desktop users: 0-9 / Backspace / Enter -> Confirm.
  // Ignora IME composition y eventos cuyo target sea un INPUT/TEXTAREA
  // (importante aquí porque la página tiene campos de nombre y mnemonic).
  useKeypadInput({
    enabled: !isLoading,
    onDigit: handleDigit,
    onBackspace: handleBackspace,
    onSubmit: onConfirm,
  });
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-white">{label}</h2>
        <p className="text-xs text-[#cfc4c5]">{helper}</p>
      </div>
      <div className="flex items-center justify-center gap-2 py-2 min-h-[20px]">
        {/* Dots grow-only: se renderiza exactamente `pin.length` puntos
            (cap a 12). Evita el pool fijo de 8 que confundía al usuario
            con un número de slots que rellenar. */}
        {Array.from({ length: Math.min(pin.length, 12) }, (_, i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-full bg-white border border-white shadow-inner"
          />
        ))}
      </div>
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
        <div />
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
      {error && (
        <div className="bg-[#fe7674]/15 border border-[#fe7674]/40 text-[#fe7674] text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}
      <button
        onClick={onConfirm}
        disabled={pin.length < 6 || isLoading}
        className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>Continue</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
