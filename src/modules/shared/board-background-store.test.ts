/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules only loads a fresh copy through require() */
import type * as BoardBackgroundStoreModule from './board-background-store';
import { BOARD_BACKGROUND_STORAGE_KEY } from './board-background-store';

type BoardBackgroundStore = typeof BoardBackgroundStoreModule;

// The store keeps its value and its hydration flag at module level. Each test loads a fresh copy so
// one test's writes or hydration cannot leak into the next.
let store: BoardBackgroundStore;

function loadFreshStore(): BoardBackgroundStore {
  let loaded: BoardBackgroundStore | undefined;
  jest.isolateModules(() => {
    loaded = require('./board-background-store');
  });
  if (!loaded) throw new Error('board-background-store failed to load');
  return loaded;
}

beforeEach(() => {
  localStorage.clear();
  store = loadFreshStore();
});

describe('board-background-store', () => {
  describe('getBoardBackgroundEnabled', () => {
    it('defaults to true before anything is set or hydrated', () => {
      expect(store.getBoardBackgroundEnabled()).toBe(true);
    });
  });

  describe('setBoardBackgroundEnabled', () => {
    it('updates the in-memory value', () => {
      store.setBoardBackgroundEnabled(false);

      expect(store.getBoardBackgroundEnabled()).toBe(false);
    });

    it.each([
      [false, 'false'],
      [true, 'true'],
    ])('persists %s to localStorage as the string "%s"', (enabled, storedText) => {
      store.setBoardBackgroundEnabled(enabled);

      expect(localStorage.getItem(BOARD_BACKGROUND_STORAGE_KEY)).toBe(storedText);
    });

    it('overwrites a previously persisted value', () => {
      store.setBoardBackgroundEnabled(false);
      store.setBoardBackgroundEnabled(true);

      expect(localStorage.getItem(BOARD_BACKGROUND_STORAGE_KEY)).toBe('true');
      expect(store.getBoardBackgroundEnabled()).toBe(true);
    });

    it('notifies every subscriber exactly once with the new value', () => {
      const firstListener = jest.fn();
      const secondListener = jest.fn();
      store.subscribeToBoardBackgroundState(firstListener);
      store.subscribeToBoardBackgroundState(secondListener);

      store.setBoardBackgroundEnabled(false);

      expect(firstListener).toHaveBeenCalledTimes(1);
      expect(firstListener).toHaveBeenLastCalledWith(false);
      expect(secondListener).toHaveBeenCalledTimes(1);
      expect(secondListener).toHaveBeenLastCalledWith(false);
    });

    it('notifies subscribers even when the value does not change', () => {
      const listener = jest.fn();
      store.subscribeToBoardBackgroundState(listener);

      store.setBoardBackgroundEnabled(true);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(true);
    });
  });

  describe('subscribeToBoardBackgroundState', () => {
    it('stops notifying a listener after its unsubscribe function runs', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribeToBoardBackgroundState(listener);

      unsubscribe();
      store.setBoardBackgroundEnabled(false);

      expect(listener).not.toHaveBeenCalled();
    });

    it('keeps notifying other listeners when one unsubscribes', () => {
      const removedListener = jest.fn();
      const keptListener = jest.fn();
      const unsubscribeRemoved = store.subscribeToBoardBackgroundState(removedListener);
      store.subscribeToBoardBackgroundState(keptListener);

      unsubscribeRemoved();
      store.setBoardBackgroundEnabled(false);

      expect(removedListener).not.toHaveBeenCalled();
      expect(keptListener).toHaveBeenCalledTimes(1);
      expect(keptListener).toHaveBeenLastCalledWith(false);
    });

    it('treats a second unsubscribe call as a no-op that leaves other listeners subscribed', () => {
      const unsubscribedTwice = store.subscribeToBoardBackgroundState(jest.fn());
      const keptListener = jest.fn();
      store.subscribeToBoardBackgroundState(keptListener);

      unsubscribedTwice();
      expect(() => unsubscribedTwice()).not.toThrow();
      store.setBoardBackgroundEnabled(false);

      expect(keptListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('hydrateBoardBackgroundFromStorage', () => {
    it('keeps the default true and does not notify when nothing is stored', () => {
      const listener = jest.fn();
      store.subscribeToBoardBackgroundState(listener);

      store.hydrateBoardBackgroundFromStorage();

      expect(store.getBoardBackgroundEnabled()).toBe(true);
      expect(listener).not.toHaveBeenCalled();
    });

    it('adopts a stored "false" and notifies listeners once with false', () => {
      localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'false');
      const listener = jest.fn();
      store.subscribeToBoardBackgroundState(listener);

      store.hydrateBoardBackgroundFromStorage();

      expect(store.getBoardBackgroundEnabled()).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(false);
    });

    it.each([
      ['true'],
      ['banana'],
      [''],
    ])('keeps the default true for a stored value of %j and does not notify', (storedValue) => {
      localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, storedValue);
      const listener = jest.fn();
      store.subscribeToBoardBackgroundState(listener);

      store.hydrateBoardBackgroundFromStorage();

      expect(store.getBoardBackgroundEnabled()).toBe(true);
      expect(listener).not.toHaveBeenCalled();
    });

    it('reads storage only once, so a later stored value is ignored', () => {
      localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'true');
      store.hydrateBoardBackgroundFromStorage();

      localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'false');
      store.hydrateBoardBackgroundFromStorage();

      expect(store.getBoardBackgroundEnabled()).toBe(true);
    });

    it('does not notify a second time when two call sites hydrate a stored "false"', () => {
      localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'false');
      const listener = jest.fn();
      store.subscribeToBoardBackgroundState(listener);

      store.hydrateBoardBackgroundFromStorage();
      store.hydrateBoardBackgroundFromStorage();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getBoardBackgroundEnabled()).toBe(false);
    });

    it('does not notify when the in-memory value is already false before hydration', () => {
      localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'false');
      const listener = jest.fn();
      store.subscribeToBoardBackgroundState(listener);
      store.setBoardBackgroundEnabled(false);
      listener.mockClear();

      store.hydrateBoardBackgroundFromStorage();

      expect(listener).not.toHaveBeenCalled();
      expect(store.getBoardBackgroundEnabled()).toBe(false);
    });
  });
});
