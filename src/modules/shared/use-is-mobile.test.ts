import { renderHook } from '@testing-library/react';
import { useIsMobile } from './use-is-mobile';

describe('useIsMobile', () => {
  let matchMediaMock: jest.Mock;
  let addEventListenerSpy: jest.Mock;
  let removeEventListenerSpy: jest.Mock;

  beforeEach(() => {
    addEventListenerSpy = jest.fn();
    removeEventListenerSpy = jest.fn();

    matchMediaMock = jest.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      addListener: jest.fn(), // deprecated but kept for compatibility
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when innerWidth is at or above 768px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns false when innerWidth is above 768px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true when innerWidth is below 768px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns true when innerWidth is at 767px (just below breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('adds a change listener on mount', () => {
    renderHook(() => useIsMobile());

    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the change listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());

    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('uses matchMedia to check for the 767px breakpoint query', () => {
    renderHook(() => useIsMobile());

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('checks window.innerWidth in the listener callback', () => {
    const { result, rerender } = renderHook(() => useIsMobile());

    // Get the listener callback that was passed to addEventListener
    const listenerCall = addEventListenerSpy.mock.calls[0];
    const listener = listenerCall[1] as () => void;

    // Verify initial state
    expect(result.current).toBe(false);

    // Change window.innerWidth and trigger the listener
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    listener();
    rerender();

    expect(result.current).toBe(true);
  });

  it('initializes with the current window.innerWidth on mount', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false for undefined initial state (SSR guard)', () => {
    // The hook initializes with undefined and sets it on mount.
    // This test verifies the hook handles the initial render correctly.
    const { result } = renderHook(() => useIsMobile());

    // After render, it should have a boolean value
    expect(typeof result.current).toBe('boolean');
  });
});
