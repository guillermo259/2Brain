/**
 * autoLock.ts — Inactivity timer + visibilitychange lock trigger.
 *
 *   - Monitorea mouse/keyboard/pointer events y los debouncea 500ms.
 *   - Cuando expira el timeout Y se dispara lock callback, AuthProvider
 *     cierra la DbClient y limpia el state sensible.
 *   - `visibilitychange` → hidden = lock inmediato si setting = 'immediate'.
 *
 * No depende directamente de AuthProvider: emite callbacks. El wiring se
 * hace desde AuthProvider.autoLockOn().
 */

export type AutoLockSetting = 'immediate' | 'minute1' | 'minute5' | 'minute15' | 'never';

export interface AutoLockCallbacks {
  onLock: () => void | Promise<void>;
  onActivity: () => void;
}

const DEBOUNCE_MS = 500;

export class AutoLockController {
  private timer: number | null = null;
  private setting: AutoLockSetting = 'minute5';
  private cbs: AutoLockCallbacks | null = null;
  private visibilityHandler: (() => void) | null = null;

  // Cached event listeners for easy add/remove
  private listeners: Array<[string, EventListener]> = [];

  start(setting: AutoLockSetting, cbs: AutoLockCallbacks): void {
    this.stop();
    this.setting = setting;
    this.cbs = cbs;

    if (setting === 'immediate') {
      this.attachVisibilityLock();
    }
    this.attachActivityListeners();
    this.armTimer();
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    for (const [evt, fn] of this.listeners) {
      window.removeEventListener(evt, fn);
    }
    this.listeners = [];
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.cbs = null;
  }

  /** Llamar desde cualquier interacción manual para resetear el timer. */
  reset(): void {
    if (this.setting === 'never') return;
    this.armTimer();
    this.cbs?.onActivity();
  }

  /** Test hook: fuerza el lock independientemente del timer. */
  forceLock(): void {
    this.cbs?.onLock();
  }

  private armTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    if (this.setting === 'never') return;
    if (this.setting === 'immediate') {
      // immediate is driven by visibilitychange only — no setTimeout fires
      // at start (otherwise App locks immediately on unlock).
      return;
    }
    const ms = this.toMs(this.setting);
    this.timer = window.setTimeout(() => {
      this.cbs?.onLock();
    }, ms);
  }

  private toMs(setting: AutoLockSetting): number {
    switch (setting) {
      case 'immediate': return 0;
      case 'minute1':   return 60_000;
      case 'minute5':   return 5 * 60_000;
      case 'minute15':  return 15 * 60_000;
      case 'never':     return Number.MAX_SAFE_INTEGER;
    }
  }

  private attachActivityListeners(): void {
    const handler: EventListener = () => {
      if (!this.cbs) return;
      // Debounce barato: timestamp
      const now = Date.now();
      const last = (handler as unknown as { _t?: number })._t ?? 0;
      if (now - last < DEBOUNCE_MS) return;
      (handler as unknown as { _t?: number })._t = now;
      this.armTimer();
      this.cbs.onActivity();
    };
    const events: Array<[string, EventListener]> = [
      ['mousemove', handler],
      ['keydown', handler],
      ['pointerdown', handler],
      ['wheel', handler],
    ];
    for (const [evt, fn] of events) {
      window.addEventListener(evt, fn, { passive: true });
    }
    this.listeners = events;
  }

  private attachVisibilityLock(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.cbs?.onLock();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}

/** Singleton compartido. AuthProvider es su único consumidor usual. */
export const autoLock = new AutoLockController();
