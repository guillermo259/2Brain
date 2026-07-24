/**
 * useKeypadInput — Hook para soportar teclado físico en los keypads PIN.
 *
 * Mapea:
 *   - 0-9 (top row o numpad) → onDigit(d)
 *   - Backspace              → onBackspace()
 *   - Enter                  → onSubmit()
 *
 * Se IGNORA el evento si:
 *   - El usuario está en medio de una composición IME (e.isComposing)
 *   - El target del evento es INPUT / TEXTAREA / SELECT (p.ej. el campo
 *     "Display Name" del OnboardingWizard) — para no capturar teclas
 *     que el usuario teclea ahí con intención distinta.
 *
 * Sólo se monta el listener mientras `enabled === true` (típicamente
 * deshabilitado durante isLoading o cuando el componente ya no
 * renderiza keypad).
 */

import { useEffect, useRef } from 'react';

export interface UseKeypadInputOpts {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  /** Si false, ignora todos los eventos. */
  enabled: boolean;
}

export function useKeypadInput(opts: UseKeypadInputOpts): void {
  // Ref synchronously re-pointed to latest opts so the listener (stable)
  // always invokes the latest callbacks without forcing re-mount.
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const o = ref.current;
      if (!o.enabled) return;
      if (e.isComposing || e.keyCode === 229) return;

      // Ignore keys typed into a different input field (e.g. name input).
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT')
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        o.onDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        o.onBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        o.onSubmit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
