import { act, renderHook } from '@testing-library/react';
import { CardName } from '@/lib/types';
import type { GameState, StructuredLogEntry } from '@/lib/types';
import { useCardPlay, useCardPlayOverlay, useCardPlayTrigger } from './CardPlayOverlay.hook';
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

describe('useCardPlayTrigger', () => {
  const localId = '1';
  type Args = Parameters<typeof useCardPlayTrigger>[0];

  function entry(cardName: CardName, turn = 1, playerId = localId): StructuredLogEntry {
    return { kind: 'structured', turn, category: 'cards', message: 'used', playerId, cardName };
  }

  function setup(log: GameState['log'], isBlocked = false) {
    return renderHook((props: Args) => useCardPlayTrigger(props), {
      initialProps: { log, localPlayerId: localId, isBlocked } as Args,
    });
  }

  it('does not play for history already in the log on first render (seed)', () => {
    const { result } = setup([entry(CardName.WarChief)]);
    expect(result.current.play).toBeNull();
  });

  it('plays an appended local entry when not blocked', () => {
    const { result, rerender } = setup([]);
    rerender({ log: [entry(CardName.WarChief)], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1 });
  });

  it('holds a play while blocked and starts it when unblocked', () => {
    const { result, rerender } = setup([]);
    const log = [entry(CardName.WarChief)];
    rerender({ log, localPlayerId: localId, isBlocked: true });
    expect(result.current.play).toBeNull();
    rerender({ log, localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1 });
  });

  it('ignores entries by another player', () => {
    const { result, rerender } = setup([]);
    rerender({ log: [entry(CardName.WarChief, 1, '2')], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toBeNull();
  });

  it('plays once for the same card on the same turn (activation then deploy)', () => {
    const first = entry(CardName.Efficient, 2);
    const { result, rerender } = setup([]);
    rerender({ log: [first], localPlayerId: localId, isBlocked: false });
    act(() => result.current.endPlay());
    rerender({ log: [first, entry(CardName.Efficient, 2)], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toBeNull();
  });

  it('does not play a card whose turn+card key was already in the log at seed (reload mid-turn)', () => {
    const { result, rerender } = setup([entry(CardName.Efficient, 2)]);
    rerender({
      log: [entry(CardName.Efficient, 2), entry(CardName.Efficient, 2)],
      localPlayerId: localId,
      isBlocked: false,
    });
    expect(result.current.play).toBeNull();
  });

  it('plays the same card again on a different turn', () => {
    const first = entry(CardName.Efficient, 2);
    const { result, rerender } = setup([]);
    rerender({ log: [first], localPlayerId: localId, isBlocked: false });
    act(() => result.current.endPlay());
    rerender({ log: [first, entry(CardName.Efficient, 3)], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toEqual({ cardName: CardName.Efficient, playId: 2 });
  });

  it('queues two cards from one update: second starts only after endPlay', () => {
    const { result, rerender } = setup([]);
    rerender({
      log: [entry(CardName.WarChief), entry(CardName.ExtraMove)],
      localPlayerId: localId,
      isBlocked: false,
    });
    expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1 });
    act(() => result.current.endPlay());
    expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 2 });
    act(() => result.current.endPlay());
    expect(result.current.play).toBeNull();
  });

  it('after a shrink, old entries do not replay and a new local entry plays', () => {
    const old = entry(CardName.WarChief, 1);
    const { result, rerender } = setup([old, entry(CardName.Scout, 1, '2')]);
    rerender({ log: [], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toBeNull();
    rerender({ log: [old], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toBeNull();
    rerender({ log: [old, entry(CardName.ExtraMove, 2)], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 1 });
  });

  it('endPlay clears the play', () => {
    const { result, rerender } = setup([]);
    rerender({ log: [entry(CardName.WarChief)], localPlayerId: localId, isBlocked: false });
    act(() => result.current.endPlay());
    expect(result.current.play).toBeNull();
  });
});
