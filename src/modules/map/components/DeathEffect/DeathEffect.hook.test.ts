import { renderHook, act } from '@testing-library/react';
import { useDeathEffect } from './DeathEffect.hook';
import { DEATH_ANIMATION_DURATION } from './DeathEffect.types';
import type { DeathEffectProps } from './DeathEffect.types';

describe('useDeathEffect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('starts with isVisible true', () => {
    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
    };

    const { result } = renderHook(() => useDeathEffect(props));

    expect(result.current.isVisible).toBe(true);
  });

  it('becomes invisible after DEATH_ANIMATION_DURATION when createdAt is not provided', () => {
    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
    };

    const { result } = renderHook(() => useDeathEffect(props));

    act(() => {
      jest.advanceTimersByTime(DEATH_ANIMATION_DURATION);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('fires timeout with Math.max(100, DEATH_ANIMATION_DURATION - elapsed) when createdAt is in the past', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const now = Date.now();
    const createdAt = now - 500; // 500ms ago

    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
      createdAt,
    };

    renderHook(() => useDeathEffect(props));

    // Expected delay: Math.max(100, 1200 - 500) = 700
    const expectedDelay = Math.max(100, DEATH_ANIMATION_DURATION - 500);
    const actualDelay = setTimeoutSpy.mock.calls[0][1];
    expect(actualDelay).toBe(expectedDelay);

    setTimeoutSpy.mockRestore();
  });

  it('uses minimum 100ms timeout when elapsed time exceeds DEATH_ANIMATION_DURATION', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const now = Date.now();
    const createdAt = now - 2000; // 2000ms ago, past the 1200ms duration

    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
      createdAt,
    };

    renderHook(() => useDeathEffect(props));

    // Expected delay: Math.max(100, 1200 - 2000) = 100
    const actualDelay = setTimeoutSpy.mock.calls[0][1];
    expect(actualDelay).toBe(100);

    setTimeoutSpy.mockRestore();
  });

  it('becomes invisible after the calculated remaining duration', () => {
    const now = Date.now();
    const createdAt = now - 500;

    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
      createdAt,
    };

    const { result } = renderHook(() => useDeathEffect(props));

    // Expected delay: Math.max(100, 1200 - 500) = 700
    act(() => {
      jest.advanceTimersByTime(700);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('provides freshSpriteSrc with anim query parameter', () => {
    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-123',
    };

    const { result } = renderHook(() => useDeathEffect(props));

    expect(result.current.freshSpriteSrc).toBe('/sprites/bear_death.gif?anim=death-123');
  });

  it('resets isVisible to true when id changes', () => {
    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
    };

    const { result, rerender } = renderHook((p) => useDeathEffect(p), { initialProps: props });

    // Let the timeout fire
    act(() => {
      jest.advanceTimersByTime(DEATH_ANIMATION_DURATION);
    });
    expect(result.current.isVisible).toBe(false);

    // Change id
    rerender({ ...props, id: 'death-2' });

    expect(result.current.isVisible).toBe(true);
  });

  it('resets isVisible to true when createdAt changes', () => {
    const now = Date.now();
    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
      createdAt: now,
    };

    const { result, rerender } = renderHook((p) => useDeathEffect(p), { initialProps: props });

    // Let the timeout fire
    act(() => {
      jest.advanceTimersByTime(DEATH_ANIMATION_DURATION);
    });
    expect(result.current.isVisible).toBe(false);

    // Change createdAt to a more recent time
    rerender({ ...props, createdAt: now + 100 });

    expect(result.current.isVisible).toBe(true);
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
    };

    const { unmount } = renderHook(() => useDeathEffect(props));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('updates freshSpriteSrc when id changes', () => {
    const props: DeathEffectProps = {
      sprite: '/sprites/bear_death.gif',
      id: 'death-1',
    };

    const { result, rerender } = renderHook((p) => useDeathEffect(p), { initialProps: props });

    expect(result.current.freshSpriteSrc).toBe('/sprites/bear_death.gif?anim=death-1');

    rerender({ ...props, id: 'death-2' });

    expect(result.current.freshSpriteSrc).toBe('/sprites/bear_death.gif?anim=death-2');
  });
});
