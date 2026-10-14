import { createElement, StrictMode } from 'react';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import type { GameState, LogEntry, StructuredLogEntry } from '@/lib/types';
import { ResourceType } from '@/lib/types';
import { useResourceGainEvents } from './resource-gain-events.hook';

function buildGainEntry(overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
  return {
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'gained stuff',
    playerId: 'p0',
    resourceGain: [{ type: ResourceType.Gold, amount: 1, tileIds: ['0-0'] }],
    ...overrides,
  };
}

function buildState(log: LogEntry[]): GameState {
  return { log } as unknown as GameState;
}

describe('useResourceGainEvents', () => {
  it('returns no events on first render even if the log already holds gains (seeds silently, no replay on reload)', () => {
    const state = buildState([buildGainEntry()]);

    const { result } = renderHook(() => useResourceGainEvents(state));

    expect(result.current).toEqual([]);
  });

  it('returns no events for a null gameState (empty input)', () => {
    const { result } = renderHook(() => useResourceGainEvents(null));

    expect(result.current).toEqual([]);
  });

  it('returns exactly the events of entries added after mount', () => {
    const initial = buildState([]);
    const { result, rerender } = renderHook(({ state }: { state: GameState | null }) => useResourceGainEvents(state), {
      initialProps: { state: initial as GameState | null },
    });

    rerender({ state: buildState([buildGainEntry({ playerId: 'p0', resourceGain: [{ type: ResourceType.Food, amount: 2, tileIds: ['1-1'] }] })]) });

    expect(result.current).toEqual([{ playerId: 'p0', type: ResourceType.Food, tileIds: ['1-1'] }]);
  });

  it('returns only the newest batch on a second growth, not the cumulative history', () => {
    const { result, rerender } = renderHook(({ state }: { state: GameState | null }) => useResourceGainEvents(state), {
      initialProps: { state: buildState([]) as GameState | null },
    });

    rerender({ state: buildState([buildGainEntry({ playerId: 'p0' })]) });
    rerender({
      state: buildState([buildGainEntry({ playerId: 'p0' }), buildGainEntry({ playerId: 'p1', resourceGain: [{ type: ResourceType.Wood, amount: 3 }] })]),
    });

    expect(result.current).toEqual([{ playerId: 'p1', type: ResourceType.Wood, tileIds: [] }]);
  });

  it('returns an empty array when the log grows without any resourceGain entry', () => {
    const { result, rerender } = renderHook(({ state }: { state: GameState | null }) => useResourceGainEvents(state), {
      initialProps: { state: buildState([]) as GameState | null },
    });

    rerender({ state: buildState(['a plain text entry']) });

    expect(result.current).toEqual([]);
  });

  it('returns the same batch reference on a re-render with an unchanged log, so downstream memos do not re-pulse', () => {
    const log: LogEntry[] = [];
    const { result, rerender } = renderHook(({ state }: { state: GameState | null }) => useResourceGainEvents(state), {
      initialProps: { state: buildState(log) as GameState | null },
    });
    const grownLog: LogEntry[] = [buildGainEntry()];
    rerender({ state: buildState(grownLog) });
    const firstBatch = result.current;

    rerender({ state: buildState(grownLog) });

    expect(result.current).toBe(firstBatch);
  });

  it('returns the new batch under StrictMode double rendering', () => {
    const wrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
    const { result, rerender } = renderHook(({ state }: { state: GameState | null }) => useResourceGainEvents(state), {
      initialProps: { state: buildState([]) as GameState | null },
      wrapper,
    });

    rerender({ state: buildState([buildGainEntry({ playerId: 'p0' })]) });

    expect(result.current).toEqual([{ playerId: 'p0', type: ResourceType.Gold, tileIds: ['0-0'] }]);
  });
});
