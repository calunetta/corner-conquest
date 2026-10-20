import { act, renderHook } from '@testing-library/react';
import { CardName } from '@/lib/types';
import { useCardPlay, useCardPlayOverlay } from './CardPlayOverlay.hook';
import type { CardPlay } from './CardPlayOverlay.types';

function mockMatchMedia(isReduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? isReduced : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

describe('useCardPlay', () => {
  it('starts with no play', () => {
    const { result } = renderHook(() => useCardPlay());
    expect(result.current.play).toBeNull();
  });

  it('startPlay sets cardName and playId 1, then 2 on the next start', () => {
    const { result } = renderHook(() => useCardPlay());
    act(() => result.current.startPlay(CardName.WarChief));
    expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1 });
    act(() => result.current.startPlay(CardName.ExtraMove));
    expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 2 });
  });

  it('endPlay clears the play and the counter keeps increasing', () => {
    const { result } = renderHook(() => useCardPlay());
    act(() => result.current.startPlay(CardName.WarChief));
    act(() => result.current.endPlay());
    expect(result.current.play).toBeNull();
    act(() => result.current.startPlay(CardName.WarChief));
    expect(result.current.play?.playId).toBe(2);
  });

  it('keeps startPlay and endPlay referentially stable', () => {
    const { result, rerender } = renderHook(() => useCardPlay());
    const { startPlay, endPlay } = result.current;
    act(() => startPlay(CardName.WarChief));
    rerender();
    expect(result.current.startPlay).toBe(startPlay);
    expect(result.current.endPlay).toBe(endPlay);
  });
});

describe('useCardPlayOverlay', () => {
  const play: CardPlay = { cardName: CardName.WarChief, playId: 1 };
  const originalWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    mockMatchMedia(false);
    setInnerWidth(1024);
  });

  afterEach(() => {
    jest.useRealTimers();
    setInnerWidth(originalWidth);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('calls onFinished once, at 1100 ms and not at 1099 ms', () => {
    const onFinished = jest.fn();
    renderHook(() => useCardPlayOverlay({ play, onFinished }));
    act(() => jest.advanceTimersByTime(1099));
    expect(onFinished).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onFinished).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(5000));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('uses 1000 ms and reports isReducedMotion when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    const onFinished = jest.fn();
    const { result } = renderHook(() => useCardPlayOverlay({ play, onFinished }));
    expect(result.current.isReducedMotion).toBe(true);
    act(() => jest.advanceTimersByTime(999));
    expect(onFinished).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('reports isReducedMotion false by default', () => {
    const { result } = renderHook(() => useCardPlayOverlay({ play, onFinished: jest.fn() }));
    expect(result.current.isReducedMotion).toBe(false);
  });

  it('restarts the timer when a new playId arrives before expiry', () => {
    const onFinished = jest.fn();
    const { rerender } = renderHook(({ current }) => useCardPlayOverlay({ play: current, onFinished }), {
      initialProps: { current: play },
    });
    act(() => jest.advanceTimersByTime(600));
    rerender({ current: { cardName: CardName.ExtraMove, playId: 2 } });
    act(() => jest.advanceTimersByTime(500));
    expect(onFinished).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(600));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('does not call onFinished after unmount', () => {
    const onFinished = jest.fn();
    const { unmount } = renderHook(() => useCardPlayOverlay({ play, onFinished }));
    unmount();
    act(() => jest.advanceTimersByTime(2000));
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('sets no timer when play is null', () => {
    const onFinished = jest.fn();
    renderHook(() => useCardPlayOverlay({ play: null, onFinished }));
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(2000));
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('returns the play it was given', () => {
    const { result } = renderHook(() => useCardPlayOverlay({ play, onFinished: jest.fn() }));
    expect(result.current.play).toBe(play);
  });

  it.each([
    [390, true],
    [1024, false],
  ])('isMobile for innerWidth %i is %s', (width, expected) => {
    setInnerWidth(width);
    const { result } = renderHook(() => useCardPlayOverlay({ play: null, onFinished: jest.fn() }));
    expect(result.current.isMobile).toBe(expected);
  });
});
