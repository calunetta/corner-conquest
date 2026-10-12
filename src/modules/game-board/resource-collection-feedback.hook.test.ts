import { renderHook } from '@testing-library/react';
import type { GameState, Island, Player } from '@/lib/types';
import { IslandType, ResourceType } from '@/lib/types';
import { useResourceCollectionFeedback } from './resource-collection-feedback.hook';
import type { ResourceCollectionFeedbackArgs } from './resource-collection-feedback.hook';

const COLS = 5;

function buildEmptyMap(): Island[] {
  return Array.from({ length: COLS * 2 }, (_, i) => ({
    id: `${i % COLS}-${Math.floor(i / COLS)}`,
    x: i % COLS,
    y: Math.floor(i / COLS),
    type: IslandType.Empty,
    resources: [],
    occupants: [],
  }));
}

function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    map: buildEmptyMap(),
    settings: { gridSize: { rows: 2, cols: COLS } },
    log: [],
    ...overrides,
  } as unknown as GameState;
}

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return { id: 0, playerId: 'p0', positions: [], armies: [], ...overrides } as Player;
}

function renderFeedback(initialProps: ResourceCollectionFeedbackArgs) {
  return renderHook((props: ResourceCollectionFeedbackArgs) => useResourceCollectionFeedback(props), { initialProps });
}

describe('useResourceCollectionFeedback', () => {
  it('does not toast on first render even if the log already has collection entries (seeds silently)', () => {
    const toast = jest.fn();
    const gameState = buildState({
      log: [{ kind: 'structured', turn: 1, category: 'economy', message: 'x', playerId: 'p0', resourcesCollected: { [ResourceType.Food]: 1 } }],
    });

    renderFeedback({ gameState, localPlayer: buildPlayer(), isMyTurn: false, toast });

    expect(toast).not.toHaveBeenCalled();
  });

  it('toasts once when a new collection log entry for the local player is added after mount', () => {
    const toast = jest.fn();
    const gameState = buildState({ log: [] });

    const { rerender } = renderFeedback({ gameState, localPlayer: buildPlayer(), isMyTurn: false, toast });

    const nextState = buildState({
      log: [{ kind: 'structured', turn: 1, category: 'economy', message: 'x', playerId: 'p0', resourcesCollected: { [ResourceType.Gold]: 2 } }],
    });
    rerender({ gameState: nextState, localPlayer: buildPlayer(), isMyTurn: false, toast });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({ title: 'Resources collected', description: 'Collected 2 Gold.' });
  });

  it('does not toast a collection entry for a different player', () => {
    const toast = jest.fn();
    const gameState = buildState({ log: [] });

    const { rerender } = renderFeedback({ gameState, localPlayer: buildPlayer(), isMyTurn: false, toast });

    const nextState = buildState({
      log: [{ kind: 'structured', turn: 1, category: 'economy', message: 'x', playerId: 'someone-else', resourcesCollected: { [ResourceType.Gold]: 2 } }],
    });
    rerender({ gameState: nextState, localPlayer: buildPlayer(), isMyTurn: false, toast });

    expect(toast).not.toHaveBeenCalled();
  });

  it('fires the singular idle-army toast when isMyTurn transitions false to true with one idle army', () => {
    const toast = jest.fn();
    const map = buildEmptyMap();
    map[1 * COLS + 1] = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
    };
    const gameState = buildState({ map });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });

    const { rerender } = renderFeedback({ gameState, localPlayer: player, isMyTurn: false, toast });
    rerender({ gameState, localPlayer: player, isMyTurn: true, toast });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      title: 'Army idle',
      description: '1 army is idle on a resource spot. Re-position it to keep collecting.',
    });
  });

  it('fires the plural idle-armies toast with the correct count for two idle armies', () => {
    const toast = jest.fn();
    const map = buildEmptyMap();
    map[1 * COLS + 1] = { id: '1-1', x: 1, y: 1, type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }], occupants: [] };
    map[1 * COLS + 2] = { id: '2-1', x: 2, y: 1, type: IslandType.Resource, resources: [{ type: ResourceType.Gold, amount: 1 }], occupants: [] };
    const gameState = buildState({ map });
    const player = buildPlayer({
      armies: [
        { id: 0, position: { x: 1, y: 1 }, hasActed: false },
        { id: 1, position: { x: 2, y: 1 }, hasActed: false },
      ],
    });

    const { rerender } = renderFeedback({ gameState, localPlayer: player, isMyTurn: false, toast });
    rerender({ gameState, localPlayer: player, isMyTurn: true, toast });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      title: 'Armies idle',
      description: '2 armies are idle on resource spots. Re-position them to keep collecting.',
    });
  });

  it('does not fire the idle-army toast when isMyTurn is already true on mount (no false-to-true transition)', () => {
    const toast = jest.fn();
    const map = buildEmptyMap();
    map[1 * COLS + 1] = { id: '1-1', x: 1, y: 1, type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }], occupants: [] };
    const gameState = buildState({ map });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });

    renderFeedback({ gameState, localPlayer: player, isMyTurn: true, toast });

    expect(toast).not.toHaveBeenCalled();
  });

  it('does nothing when gameState is null (empty input)', () => {
    const toast = jest.fn();

    const { rerender } = renderFeedback({ gameState: null, localPlayer: null, isMyTurn: false, toast });
    rerender({ gameState: null, localPlayer: null, isMyTurn: true, toast });

    expect(toast).not.toHaveBeenCalled();
  });
});
