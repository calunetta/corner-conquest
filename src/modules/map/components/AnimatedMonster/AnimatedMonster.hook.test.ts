import { renderHook, act } from '@testing-library/react';
import { useAnimatedMonster } from './AnimatedMonster.hook';
import type { Monster } from '@/lib/types';

describe('useAnimatedMonster', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockMonster: Monster = {
    name: 'Bear',
    level: 1,
    sprite: {
      idle: '/sprites/bear_idle.gif',
      attack: '/sprites/bear_attack.gif',
      death: '/sprites/bear_death.gif',
    },
  };

  it('returns idle sprite and offset-based transform initially', () => {
    const { result } = renderHook(() => useAnimatedMonster(mockMonster));

    expect(result.current.spriteSrc).toBe(mockMonster.sprite.idle);
    // Initial state has no attack, so should have translateX
    expect(result.current.styleTransform).toContain('translateX');
  });

  it('switches to attack sprite when Math.random < 0.25, with only flip (no translateX)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.2); // < 0.25, so attacking

    const { result } = renderHook(() => useAnimatedMonster(mockMonster));

    act(() => {
      jest.advanceTimersByTime(4000); // interval fires
    });

    expect(result.current.spriteSrc).toBe(mockMonster.sprite.attack);
    // When attacking, styleTransform should be only flip (no translateX)
    expect(result.current.styleTransform).not.toContain('translateX');
    // Can be either '' or 'scaleX(-1)' depending on flip state
    expect(['', 'scaleX(-1)']).toContain(result.current.styleTransform);

    jest.spyOn(Math, 'random').mockRestore();
  });

  it('returns idle sprite with translateX + flip when Math.random >= 0.25', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.3); // >= 0.25, so idle

    const { result } = renderHook(() => useAnimatedMonster(mockMonster));

    act(() => {
      jest.advanceTimersByTime(4000); // interval fires
    });

    expect(result.current.spriteSrc).toBe(mockMonster.sprite.idle);
    // When idle, styleTransform should include translateX
    expect(result.current.styleTransform).toContain('translateX');

    jest.spyOn(Math, 'random').mockRestore();
  });

  it('schedules interval with delay Math.random()*2500+3000', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    // Mock Math.random to return a specific value
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    renderHook(() => useAnimatedMonster(mockMonster));

    // First call should be for the interval
    const intervalCall = setIntervalSpy.mock.calls.find((call) => call[1] !== undefined);
    expect(intervalCall).toBeDefined();

    // With Math.random() = 0.5, delay should be 0.5 * 2500 + 3000 = 4250
    const delay = intervalCall![1];
    expect(delay).toBe(0.5 * 2500 + 3000);

    setIntervalSpy.mockRestore();
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useAnimatedMonster(mockMonster));

    unmount();

    // clearInterval should have been called
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('correctly computes transform with both flip and translateX in idle state', () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.3); // First for offset
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.3); // >= 0.25, so idle

    const { result } = renderHook(() => useAnimatedMonster(mockMonster));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Should contain both translateX and optional flip
    expect(result.current.styleTransform).toMatch(/translateX\(-?\d+%\)/);

    jest.spyOn(Math, 'random').mockRestore();
  });

  it('updates state when animation interval fires multiple times', () => {
    const randomValues = [
      0.3, // delay calc: 0.3 * 2500 + 3000 = 3750
      0.3, // offset calc for first interval
      0.4, // attack check for first interval (>= 0.25, so idle)
      0.2, // delay calc for next interval
      0.5, // offset calc for second interval
      0.1, // attack check for second interval (< 0.25, so attack)
    ];
    let callCount = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      const value = randomValues[callCount % randomValues.length];
      callCount++;
      return value;
    });

    const { result } = renderHook(() => useAnimatedMonster(mockMonster));

    // First interval fires: should be idle (randomValue 0.4 >= 0.25)
    act(() => {
      jest.advanceTimersByTime(3750);
    });
    expect(result.current.spriteSrc).toBe(mockMonster.sprite.idle);

    // Second interval fires: should be attack (randomValue 0.1 < 0.25)
    act(() => {
      jest.advanceTimersByTime(3750);
    });
    expect(result.current.spriteSrc).toBe(mockMonster.sprite.attack);

    jest.spyOn(Math, 'random').mockRestore();
  });
});
