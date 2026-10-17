import fs from 'fs';
import path from 'path';
import { createElement, StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { Monster } from '@/lib/types';
import { MONSTER_WANDER_INTERVAL_MS } from './LobbyBackground.layout';
import { createMonsterIslandMonster } from './LobbyBackground.map';
import { useLobbyMonster } from './LobbyBackground.monster.hook';

const MONSTER: Monster = {
  name: createMonsterIslandMonster().name,
  level: 4,
  sprite: { idle: '/sprites/idle-test.gif', attack: '/sprites/attack-test.gif', death: '/sprites/death.gif' },
};

const INTERVAL_MS = MONSTER_WANDER_INTERVAL_MS.min;

/**
 * Queues Math.random results in call order, then repeats `fallback`.
 * Call order inside the hook: one draw for the wander interval on mount; per step, one draw
 * for the attack roll and, when not attacking, one draw for the offset.
 */
function queueRandomDraws(draws: number[], fallback: number) {
  const spy = jest.spyOn(Math, 'random');
  draws.forEach((draw) => spy.mockReturnValueOnce(draw));
  spy.mockReturnValue(fallback);
}

describe('useLobbyMonster', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows the idle sprite with no sideways offset before the first wander step', () => {
    queueRandomDraws([0], 0.5);

    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    expect(result.current.spriteSrc).toBe(MONSTER.sprite.idle);
    expect(result.current.style.transform).toBe('translateX(0%)');
  });

  it('draws the wander interval from MONSTER_WANDER_INTERVAL_MS and steps exactly when it elapses', () => {
    // Interval draw 0 gives the minimum; the first step draws 0.99 (no attack) then 0.99 (offset).
    queueRandomDraws([0, 0.99, 0.99], 0.5);
    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS - 1);
    });
    expect(result.current.style.transform).toBe('translateX(0%)');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.style.transform).toBe('translateX(15%)');
  });

  it('shows the attack sprite and no sideways translation when the attack roll is below 0.25', () => {
    queueRandomDraws([0, 0.1], 0.5);
    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });

    expect(result.current.spriteSrc).toBe(MONSTER.sprite.attack);
    expect(result.current.style.transform).toBe('');
  });

  it('does not attack when the roll is exactly 0.25, so the boundary is strictly below', () => {
    // Offset draw 0.25 maps to -7.5, which Math.round takes to -7 and that is a leftward step.
    queueRandomDraws([0, 0.25, 0.25], 0.5);
    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });

    expect(result.current.spriteSrc).toBe(MONSTER.sprite.idle);
    expect(result.current.style.transform).toBe('translateX(-7%) scaleX(-1)');
  });

  it('flips the sprite on a leftward step and not on a rightward step', () => {
    // Step 1 goes to -9 (leftward, flipped). Step 2 goes to 15 (rightward, not flipped).
    queueRandomDraws([0, 0.99, 0.2, 0.99, 0.99], 0.5);
    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.style.transform).toBe('translateX(-9%) scaleX(-1)');

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.style.transform).toBe('translateX(15%)');
  });

  it('keeps the facing through an attack step and compares the next idle step with the last idle offset', () => {
    // Step 1: idle to -9, flipped. Step 2: attack, which keeps the flip. Step 3: idle to 15.
    // 15 is not less than -9, so the sprite turns back to face right.
    queueRandomDraws([0, 0.99, 0.2, 0.1, 0.99, 0.99], 0.5);
    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.style.transform).toBe('translateX(-9%) scaleX(-1)');

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.spriteSrc).toBe(MONSTER.sprite.attack);
    expect(result.current.style.transform).toBe('scaleX(-1)');

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.spriteSrc).toBe(MONSTER.sprite.idle);
    expect(result.current.style.transform).toBe('translateX(15%)');
  });

  it('does not flip when the new idle offset equals the previous one', () => {
    // Offset draw 0.5 maps to 0, the same as the initial position, so the facing stays right.
    queueRandomDraws([0, 0.99, 0.5], 0.5);
    const { result } = renderHook(() => useLobbyMonster(MONSTER));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });

    expect(result.current.style.transform).toBe('translateX(0%)');
  });

  it('shows the sprites of the monster it is given, not a fixed one', () => {
    const otherMonster: Monster = {
      name: MONSTER.name,
      level: MONSTER.level,
      sprite: { idle: '/sprites/other-idle.gif', attack: '/sprites/other-attack.gif', death: '/sprites/death.gif' },
    };
    queueRandomDraws([0, 0.1], 0.5);
    const { result } = renderHook(() => useLobbyMonster(otherMonster));

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });

    expect(result.current.spriteSrc).toBe('/sprites/other-attack.gif');
  });

  it('keeps the wander result the same under StrictMode, which double-invokes effects and updaters', () => {
    // StrictMode runs the mount effect twice, so the interval is drawn twice; both draws give the minimum.
    queueRandomDraws([0, 0, 0.99, 0.2], 0.5);
    const strictWrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
    const { result } = renderHook(() => useLobbyMonster(MONSTER), { wrapper: strictWrapper });

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });

    expect(result.current.style.transform).toBe('translateX(-9%) scaleX(-1)');
  });

  it('clears its wander interval on unmount', () => {
    queueRandomDraws([0], 0.5);
    const { unmount } = renderHook(() => useLobbyMonster(MONSTER));

    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  describe('monster with no attack sprite', () => {
    const NO_ATTACK_MONSTER: Monster = {
      name: MONSTER.name,
      level: MONSTER.level,
      sprite: { idle: MONSTER.sprite.idle, death: MONSTER.sprite.death },
    };

    it('never attacks: the low draw is consumed as the offset, so exactly one draw is used per step', () => {
      // Interval draw 0, then one draw 0 per step. With the attack roll skipped, 0 maps to the offset -15.
      queueRandomDraws([0, 0], 0.5);
      const { result } = renderHook(() => useLobbyMonster(NO_ATTACK_MONSTER));

      act(() => {
        jest.advanceTimersByTime(INTERVAL_MS);
      });

      expect(result.current.spriteSrc).toBe(NO_ATTACK_MONSTER.sprite.idle);
      expect(result.current.style.transform).toBe('translateX(-15%) scaleX(-1)');
    });

    it('never attacks across many steps when every draw is 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { result } = renderHook(() => useLobbyMonster(NO_ATTACK_MONSTER));

      for (let step = 0; step < 5; step++) {
        act(() => {
          jest.advanceTimersByTime(INTERVAL_MS);
        });
        expect(result.current.spriteSrc).toBe(NO_ATTACK_MONSTER.sprite.idle);
        expect(result.current.style.transform).toContain('translateX');
      }
    });

    it('draws Math.random once per step', () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      renderHook(() => useLobbyMonster(NO_ATTACK_MONSTER));
      expect(randomSpy).toHaveBeenCalledTimes(1); // interval

      act(() => {
        jest.advanceTimersByTime(INTERVAL_MS);
      });

      expect(randomSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('does not import the real AnimatedMonster hook or component', () => {
    const source = fs.readFileSync(path.join(__dirname, 'LobbyBackground.monster.hook.ts'), 'utf8');

    expect(source).not.toMatch(/from\s+['"][^'"]*AnimatedMonster/);
    expect(source).not.toContain('useAnimatedMonster');
  });
});
