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

  it('startPlay with isFound sets isFound true', () => {
    const { result } = renderHook(() => useCardPlay());
    act(() => result.current.startPlay(CardName.WarChief, true));
    expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1, isFound: true });
  });

  it('startPlay without isFound has no isFound key', () => {
    const { result } = renderHook(() => useCardPlay());
    act(() => result.current.startPlay(CardName.WarChief));
    expect(result.current.play).not.toHaveProperty('isFound');
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
    const { result } = setup([entry(CardName.Reinforce)]);
    expect(result.current.play).toBeNull();
  });

  it('plays an appended local entry when not blocked', () => {
    const { result, rerender } = setup([]);
    rerender({ log: [entry(CardName.Reinforce)], localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toEqual({ cardName: CardName.Reinforce, playId: 1 });
  });

  it('holds a play while blocked and starts it when unblocked', () => {
    const { result, rerender } = setup([]);
    const log = [entry(CardName.Reinforce)];
    rerender({ log, localPlayerId: localId, isBlocked: true });
    expect(result.current.play).toBeNull();
    rerender({ log, localPlayerId: localId, isBlocked: false });
    expect(result.current.play).toEqual({ cardName: CardName.Reinforce, playId: 1 });
  });

  it('ignores entries by another player', () => {
    const { result, rerender } = setup([]);
    rerender({ log: [entry(CardName.Reinforce, 1, '2')], localPlayerId: localId, isBlocked: false });
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
      log: [entry(CardName.Reinforce), entry(CardName.ExtraMove)],
      localPlayerId: localId,
      isBlocked: false,
    });
    expect(result.current.play).toEqual({ cardName: CardName.Reinforce, playId: 1 });
    act(() => result.current.endPlay());
    expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 2 });
    act(() => result.current.endPlay());
    expect(result.current.play).toBeNull();
  });

  it('after a shrink, old entries do not replay and a new local entry plays', () => {
    const old = entry(CardName.Reinforce, 1);
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
    rerender({ log: [entry(CardName.Reinforce)], localPlayerId: localId, isBlocked: false });
    act(() => result.current.endPlay());
    expect(result.current.play).toBeNull();
  });

  it.each([CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll])(
    'never plays a local %s log entry',
    (cardName) => {
      const { result, rerender } = setup([]);
      rerender({ log: [entry(cardName)], localPlayerId: localId, isBlocked: false });
      expect(result.current.play).toBeNull();
    },
  );

  describe('selectionPlay', () => {
    const teleport2 = { cardName: CardName.Teleport, turn: 2 };
    const props = (over: Partial<Args>): Args => ({ log: [], localPlayerId: localId, isBlocked: false, ...over });

    it('starts a play for the selected card with no log change', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: teleport2 }));
      expect(result.current.play).toEqual({ cardName: CardName.Teleport, playId: 1 });
    });

    it('waits while blocked and starts when unblocked', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: teleport2, isBlocked: true }));
      expect(result.current.play).toBeNull();
      rerender(props({ selectionPlay: teleport2, isBlocked: false }));
      expect(result.current.play).toEqual({ cardName: CardName.Teleport, playId: 1 });
    });

    it('does not replay when the later log entry of the same turn and card arrives', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: teleport2 }));
      act(() => result.current.endPlay());
      rerender(props({ selectionPlay: null, log: [entry(CardName.Teleport, 2)] }));
      expect(result.current.play).toBeNull();
    });

    it('plays the same card again on a later turn', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: teleport2 }));
      act(() => result.current.endPlay());
      rerender(props({ selectionPlay: { cardName: CardName.Teleport, turn: 3 } }));
      expect(result.current.play).toEqual({ cardName: CardName.Teleport, playId: 2 });
    });

    it('does not enqueue again for a new selectionPlay object with the same card and turn', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: { ...teleport2 } }));
      act(() => result.current.endPlay());
      rerender(props({ selectionPlay: { ...teleport2 } }));
      expect(result.current.play).toBeNull();
    });

    it('plays Scout once for its selection and its later log entry', () => {
      const scout = { cardName: CardName.Scout, turn: 4 };
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: scout }));
      expect(result.current.play).toEqual({ cardName: CardName.Scout, playId: 1 });
      act(() => result.current.endPlay());
      rerender(props({ selectionPlay: scout, log: [entry(CardName.Scout, 4)] }));
      expect(result.current.play).toBeNull();
    });

    it('does not replay when selectionPlay goes null and returns with the same value', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: teleport2 }));
      act(() => result.current.endPlay());
      rerender(props({ selectionPlay: null }));
      rerender(props({ selectionPlay: teleport2 }));
      expect(result.current.play).toBeNull();
    });

    it('plays nothing for a null selectionPlay', () => {
      const { result, rerender } = setup([]);
      rerender(props({ selectionPlay: null }));
      expect(result.current.play).toBeNull();
    });

    it('a selection whose key was already played from the log does not replay', () => {
      const { result, rerender } = setup([]);
      rerender(props({ log: [entry(CardName.Teleport, 2)] }));
      act(() => result.current.endPlay());
      rerender(props({ log: [entry(CardName.Teleport, 2)], selectionPlay: teleport2 }));
      expect(result.current.play).toBeNull();
    });
  });

  describe('foundCard', () => {
    const props = (over: Partial<Args>): Args => ({ log: [], localPlayerId: localId, isBlocked: false, ...over });

    it('plays a found combat card (not filtered by NO_PLAY_CARDS)', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: CardName.Overcome }));
      expect(result.current.play).toEqual({ cardName: CardName.Overcome, playId: 1, isFound: true });
    });

    it('waits while blocked and starts only when unblocked', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: CardName.WarChief, isBlocked: true }));
      expect(result.current.play).toBeNull();
      rerender(props({ foundCard: CardName.WarChief, isBlocked: false }));
      expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1, isFound: true });
    });

    it('starts after the dialog closes (blocked while foundCard set, then null and unblocked)', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: CardName.ExtraMove, isBlocked: true }));
      rerender(props({ foundCard: null, isBlocked: true }));
      expect(result.current.play).toBeNull();
      rerender(props({ foundCard: null, isBlocked: false }));
      expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 1, isFound: true });
    });

    it('does not play when a log use entry exists at mount and foundCard is null', () => {
      const { result } = setup([entry(CardName.ExtraMove)]);
      expect(result.current.play).toBeNull();
    });

    it('plays nothing when foundCard stays null', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: null }));
      rerender(props({ foundCard: undefined }));
      expect(result.current.play).toBeNull();
    });

    it('find then use the same card the same turn plays twice, the use play without isFound', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: CardName.ExtraMove }));
      expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 1, isFound: true });
      act(() => result.current.endPlay());
      rerender(props({ foundCard: null }));
      rerender(props({ foundCard: null, log: [entry(CardName.ExtraMove, 1)] }));
      expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 2 });
      expect(result.current.play).not.toHaveProperty('isFound');
    });

    it('queues two finds of the same card (card, null, card) in order', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: CardName.ExtraMove, isBlocked: true }));
      rerender(props({ foundCard: null, isBlocked: true }));
      rerender(props({ foundCard: CardName.ExtraMove, isBlocked: true }));
      rerender(props({ foundCard: null, isBlocked: false }));
      expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 1, isFound: true });
      act(() => result.current.endPlay());
      expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 2, isFound: true });
      act(() => result.current.endPlay());
      expect(result.current.play).toBeNull();
    });

    it('does not re-queue when rerendered with the same foundCard', () => {
      const { result, rerender } = setup([]);
      rerender(props({ foundCard: CardName.WarChief }));
      act(() => result.current.endPlay());
      rerender(props({ foundCard: CardName.WarChief }));
      expect(result.current.play).toBeNull();
    });
  });
});
