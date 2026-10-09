import { renderHook } from '@testing-library/react';
import { useTileBoats } from './TileBoats.hook';
import { IslandType, ResourceType, type Island } from '@/lib/types';
import { useGameBoard } from '@/modules/game-board';
import { gameStateFixture, gameBoardContextFixture, bluePlayer } from './TileBoats.fixtures';

jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
  initialUIState: undefined,
}));

describe('useTileBoats', () => {
  beforeEach(() => {
    jest.mocked(useGameBoard).mockReturnValue(gameBoardContextFixture);
  });

  it('returns boats for base tile', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileBoats({ island }));

    expect(result.current.boats).not.toBeNull();
    expect(result.current.boats!.length).toBeGreaterThan(0);
  });

  it('returns null for empty tile with no occupants', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useTileBoats({ island }));

    expect(result.current.boats).toBeNull();
  });

  it('reads gameState and localPlayer from context', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileBoats({ island }));

    expect(result.current.boats).not.toBeNull();
    expect(result.current.boats!.length).toBe(1);
  });

  it('respects debugMode from context', () => {
    const island: Island = {
      id: '3-3',
      x: 3,
      y: 3,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    // Mock with fog of war enabled and localPlayer not having revealed the tile
    jest.mocked(useGameBoard).mockReturnValue({
      ...gameBoardContextFixture,
      gameState: {
        ...gameStateFixture,
        debugMode: true,
        settings: { ...gameStateFixture.settings, fogOfWar: true },
      },
      localPlayer: {
        ...bluePlayer,
        revealedTiles: [],
      },
    });

    const { result } = renderHook(() => useTileBoats({ island }));

    // Should still return boats because debugMode is true
    expect(result.current.boats).not.toBeNull();
  });

  it('respects fog of war setting', () => {
    const island: Island = {
      id: '4-4',
      x: 4,
      y: 4,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    // Mock with fog of war enabled and localPlayer not having revealed the tile
    jest.mocked(useGameBoard).mockReturnValue({
      ...gameBoardContextFixture,
      gameState: {
        ...gameStateFixture,
        settings: { ...gameStateFixture.settings, fogOfWar: true },
      },
      localPlayer: {
        ...bluePlayer,
        revealedTiles: [],
      },
    });

    const { result } = renderHook(() => useTileBoats({ island }));

    // Should return null because fog of war is on and tile is not revealed
    expect(result.current.boats).toBeNull();
  });

  it('returns boats when fog of war is enabled and tile is revealed', () => {
    const island: Island = {
      id: '4-4',
      x: 4,
      y: 4,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    // Mock with fog of war enabled and localPlayer having revealed the tile
    jest.mocked(useGameBoard).mockReturnValue({
      ...gameBoardContextFixture,
      gameState: {
        ...gameStateFixture,
        settings: { ...gameStateFixture.settings, fogOfWar: true },
      },
      localPlayer: {
        ...bluePlayer,
        revealedTiles: ['4-4'],
      },
    });

    const { result } = renderHook(() => useTileBoats({ island }));

    // Should return boats because tile is revealed
    expect(result.current.boats).not.toBeNull();
  });

  it('returns boats for positioned resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };

    const { result } = renderHook(() => useTileBoats({ island }));

    expect(result.current.boats).not.toBeNull();
    expect(result.current.boats![0].showIdleCollector).toBe(false);
  });

  it('updates boats when island prop changes', () => {
    const island1: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const island2: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const { result, rerender } = renderHook((props) => useTileBoats(props), { initialProps: { island: island1 } });

    expect(result.current.boats!.length).toBe(1);

    rerender({ island: island2 });

    expect(result.current.boats!.length).toBe(2);
  });

  it('responds to gameState changes', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result, rerender } = renderHook(() => useTileBoats({ island }));

    expect(result.current.boats).not.toBeNull();

    // Enable fog of war and hide the tile
    jest.mocked(useGameBoard).mockReturnValue({
      ...gameBoardContextFixture,
      gameState: {
        ...gameStateFixture,
        settings: { ...gameStateFixture.settings, fogOfWar: true },
      },
      localPlayer: {
        ...bluePlayer,
        revealedTiles: [],
      },
    });

    rerender({ island });

    expect(result.current.boats).toBeNull();
  });

  it('handles null localPlayer gracefully', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      ...gameBoardContextFixture,
      gameState: gameStateFixture,
      localPlayer: null as unknown as typeof bluePlayer,
    });

    const { result } = renderHook(() => useTileBoats({ island }));

    // Should handle null localPlayer gracefully
    expect(result.current.boats).toBeDefined();
  });
});
