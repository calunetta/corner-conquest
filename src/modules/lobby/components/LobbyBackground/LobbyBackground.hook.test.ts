import fs from 'fs';
import path from 'path';
import { act, renderHook } from '@testing-library/react';
import { CLOUD_SPAWN } from './LobbyBackground.layout';
import { useLobbyBackground } from './LobbyBackground.hook';

const SPAWN_INTERVAL_MS = CLOUD_SPAWN.spawnIntervalMs;
const MIN_DURATION_MS = CLOUD_SPAWN.minDurationSeconds * 1000;

function cloudIds(clouds: { id: string }[]): string[] {
  return clouds.map((cloud) => cloud.id);
}

describe('useLobbyBackground', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('starts with no clouds before the first spawn interval', () => {
    const { result } = renderHook(() => useLobbyBackground());

    expect(result.current.clouds).toEqual([]);
  });

  it('spawns one cloud per spawn interval, with ids in spawn order', () => {
    const { result } = renderHook(() => useLobbyBackground());

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS);
    });
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-0']);

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS);
    });
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-0', 'cloud-1']);
  });

  it('builds a cloud at the minimum of every range when Math.random returns 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useLobbyBackground());

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS);
    });

    expect(result.current.clouds).toEqual([
      {
        id: 'cloud-0',
        left: 0,
        top: 0,
        durationSeconds: CLOUD_SPAWN.minDurationSeconds,
        scale: 0.6,
        sprite: '/sprites/cloud_small.png',
      },
    ]);
  });

  it('builds a cloud at the midpoint of every range and picks the middle sprite when Math.random returns 0.5', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { result } = renderHook(() => useLobbyBackground());

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS);
    });

    expect(result.current.clouds).toEqual([
      {
        id: 'cloud-0',
        left: 45,
        top: 22.5,
        durationSeconds: 23,
        scale: 0.8,
        sprite: '/sprites/cloud_medium.png',
      },
    ]);
  });

  it('stops spawning at maxConcurrent live clouds', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useLobbyBackground());

    // Five spawns fill the cap; the sixth interval must not add a cloud.
    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS * CLOUD_SPAWN.maxConcurrent);
    });
    expect(result.current.clouds).toHaveLength(CLOUD_SPAWN.maxConcurrent);
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-0', 'cloud-1', 'cloud-2', 'cloud-3', 'cloud-4']);

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS * 2);
    });
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-0', 'cloud-1', 'cloud-2', 'cloud-3', 'cloud-4']);
  });

  it('removes cloud-0 exactly at spawn + lifetime and frees its slot for the next spawn', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useLobbyBackground());

    // cloud-0 spawns at 2500ms and lives 18000ms, so it is removed at 20500ms.
    // The five-cloud cap is full from 12500ms; the 15000ms, 17500ms and 20000ms spawns are blocked.
    act(() => {
      jest.advanceTimersByTime(MIN_DURATION_MS + SPAWN_INTERVAL_MS - 1);
    });
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-0', 'cloud-1', 'cloud-2', 'cloud-3', 'cloud-4']);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-1', 'cloud-2', 'cloud-3', 'cloud-4']);

    // The 22500ms interval fills the freed slot under a new id; cloud-1 expires at 23000ms.
    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS - 1);
    });
    expect(cloudIds(result.current.clouds)).toEqual(['cloud-1', 'cloud-2', 'cloud-3', 'cloud-4', 'cloud-5']);
  });

  it('clears its interval and every removal timer on unmount', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result, unmount } = renderHook(() => useLobbyBackground());

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS * 2);
    });
    expect(result.current.clouds).toHaveLength(2);
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('can pick the last cloud sprite (cloud_big.png) when Math.random is close to 1', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    const { result } = renderHook(() => useLobbyBackground());

    act(() => {
      jest.advanceTimersByTime(SPAWN_INTERVAL_MS);
    });

    expect(result.current.clouds).toHaveLength(1);
    expect(result.current.clouds[0].sprite).toBe('/sprites/cloud_big.png');
  });

  describe('cloud sprites', () => {
    it.each(['/sprites/cloud_small.png', '/sprites/cloud_medium.png', '/sprites/cloud_big.png'])(
      'the sprite %s exists under public/',
      (src) => {
        expect(fs.existsSync(path.join(process.cwd(), 'public', src))).toBe(true);
      },
    );
  });
});
