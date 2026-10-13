import { renderHook, act } from '@testing-library/react';
import { useCardRevealEffect } from './CardRevealEffect.hook';
import { REVEAL_ANIMATION_DURATION, REVEAL_SPRITE_PATH } from './CardRevealEffect.types';
import type { CardRevealEffectProps } from './CardRevealEffect.types';

describe('useCardRevealEffect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('starts with isVisible true', () => {
    const props: CardRevealEffectProps = { id: 'card-1' };

    const { result } = renderHook(() => useCardRevealEffect(props));

    expect(result.current.isVisible).toBe(true);
  });

  it('becomes invisible after REVEAL_ANIMATION_DURATION when createdAt is not provided', () => {
    const props: CardRevealEffectProps = { id: 'card-1' };

    const { result } = renderHook(() => useCardRevealEffect(props));

    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('fires timeout with Math.max(100, REVEAL_ANIMATION_DURATION - elapsed) when createdAt is in the past', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const now = Date.now();
    const createdAt = now - 500; // 500ms ago

    const props: CardRevealEffectProps = { id: 'card-1', createdAt };

    renderHook(() => useCardRevealEffect(props));

    // Expected delay: Math.max(100, 1400 - 500) = 900
    const expectedDelay = Math.max(100, REVEAL_ANIMATION_DURATION - 500);
    const actualDelay = setTimeoutSpy.mock.calls[0][1];
    expect(actualDelay).toBe(expectedDelay);

    setTimeoutSpy.mockRestore();
  });

  it('uses minimum 100ms timeout when elapsed time exceeds REVEAL_ANIMATION_DURATION', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const now = Date.now();
    const createdAt = now - 2000; // 2000ms ago, past the 1400ms duration

    const props: CardRevealEffectProps = { id: 'card-1', createdAt };

    renderHook(() => useCardRevealEffect(props));

    // Expected delay: Math.max(100, 1400 - 2000) = 100
    const actualDelay = setTimeoutSpy.mock.calls[0][1];
    expect(actualDelay).toBe(100);

    setTimeoutSpy.mockRestore();
  });

  it('becomes invisible after the calculated remaining duration', () => {
    const now = Date.now();
    const createdAt = now - 500;

    const props: CardRevealEffectProps = { id: 'card-1', createdAt };

    const { result } = renderHook(() => useCardRevealEffect(props));

    // Expected delay: Math.max(100, 1400 - 500) = 900
    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('provides freshSpriteSrc with anim query parameter', () => {
    const props: CardRevealEffectProps = { id: 'card-123' };

    const { result } = renderHook(() => useCardRevealEffect(props));

    expect(result.current.freshSpriteSrc).toBe(`${REVEAL_SPRITE_PATH}?anim=card-123`);
  });

  it('resets isVisible to true when id changes', () => {
    const props: CardRevealEffectProps = { id: 'card-1' };

    const { result, rerender } = renderHook((p) => useCardRevealEffect(p), { initialProps: props });

    // Let the timeout fire
    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
    });
    expect(result.current.isVisible).toBe(false);

    // Change id
    rerender({ ...props, id: 'card-2' });

    expect(result.current.isVisible).toBe(true);
  });

  it('resets isVisible to true when createdAt changes', () => {
    const now = Date.now();
    const props: CardRevealEffectProps = { id: 'card-1', createdAt: now };

    const { result, rerender } = renderHook((p) => useCardRevealEffect(p), { initialProps: props });

    // Let the timeout fire
    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
    });
    expect(result.current.isVisible).toBe(false);

    // Change createdAt to a more recent time
    rerender({ ...props, createdAt: now + 100 });

    expect(result.current.isVisible).toBe(true);
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const props: CardRevealEffectProps = { id: 'card-1' };

    const { unmount } = renderHook(() => useCardRevealEffect(props));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('calls onHidden exactly once, at the same timer fire as isVisible flipping to false', () => {
    const onHidden = jest.fn();
    const props: CardRevealEffectProps = { id: 'card-1', onHidden };

    const { result } = renderHook(() => useCardRevealEffect(props));

    expect(onHidden).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
    });

    expect(result.current.isVisible).toBe(false);
    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it('does not call onHidden before the timer fires', () => {
    const onHidden = jest.fn();
    const props: CardRevealEffectProps = { id: 'card-1', onHidden };

    renderHook(() => useCardRevealEffect(props));

    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION - 1);
    });

    expect(onHidden).not.toHaveBeenCalled();
  });

  it('does not call onHidden again on an unrelated re-render', () => {
    const onHidden = jest.fn();
    const props: CardRevealEffectProps = { id: 'card-1', onHidden };

    const { rerender } = renderHook((p) => useCardRevealEffect(p), { initialProps: props });

    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
    });
    expect(onHidden).toHaveBeenCalledTimes(1);

    rerender({ ...props });

    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it('updates freshSpriteSrc when id changes', () => {
    const props: CardRevealEffectProps = { id: 'card-1' };

    const { result, rerender } = renderHook((p) => useCardRevealEffect(p), { initialProps: props });

    expect(result.current.freshSpriteSrc).toBe(`${REVEAL_SPRITE_PATH}?anim=card-1`);

    rerender({ ...props, id: 'card-2' });

    expect(result.current.freshSpriteSrc).toBe(`${REVEAL_SPRITE_PATH}?anim=card-2`);
  });
});
