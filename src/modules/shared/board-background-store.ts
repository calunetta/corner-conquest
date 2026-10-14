/** localStorage key holding 'true' | 'false'. */
export const BOARD_BACKGROUND_STORAGE_KEY = 'board-background-enabled';

const DEFAULT_BOARD_BACKGROUND_ENABLED = true;

type BoardBackgroundListener = (enabled: boolean) => void;

const listeners: BoardBackgroundListener[] = [];

let memoryEnabled = DEFAULT_BOARD_BACKGROUND_ENABLED;
let isHydrated = false;

function notifyListeners(): void {
  listeners.forEach((listener) => {
    listener(memoryEnabled);
  });
}

/** Current in-memory value (module default: true, corrected by hydrateBoardBackgroundFromStorage). */
export function getBoardBackgroundEnabled(): boolean {
  return memoryEnabled;
}

/**
 * Reads localStorage once and adopts a stored 'false'. Called from the hook's mount effect rather
 * than at module load: reading storage during render would cause a server/client markup mismatch.
 * Two hook call sites mount this, so the flag keeps the read and the notification to a single pass.
 */
export function hydrateBoardBackgroundFromStorage(): void {
  if (isHydrated || typeof window === 'undefined') return;
  isHydrated = true;

  const storedValue = window.localStorage.getItem(BOARD_BACKGROUND_STORAGE_KEY);
  const isStoredOff = storedValue === 'false';
  if (!isStoredOff || !memoryEnabled) return;

  memoryEnabled = false;
  notifyListeners();
}

/** Sets the in-memory value, persists it to localStorage, and notifies every subscriber. */
export function setBoardBackgroundEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, String(enabled));
  }
  notifyListeners();
}

/** Subscribes `listener` to every change (mirrors subscribeToToastState); returns an unsubscribe function. */
export function subscribeToBoardBackgroundState(listener: BoardBackgroundListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}
