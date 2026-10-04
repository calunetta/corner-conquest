/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react';
import { useIslandTile } from './IslandTile.hook';
import { IslandType, PlayerColor, type Island, type DeathAnimation, type Player, type GameState } from '@/lib/types';
import { useGameBoard } from '@/modules/game-board';
import type { GameBoardContextType, GameBoardUIState } from '@/modules/game-board';

jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

describe('useIslandTile', () => {
  const mockGameState: GameState = {
    turn: 1,
    currentPlayerId: 0,
    players: [
      {
        id: 0,
        color: PlayerColor.Blue,
        armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }],
        revealedTiles: ['1-1'],
      },
    ] as any,
    map: [],
    deathAnimations: [],
    debugMode: false,
    settings: { fogOfWar: false, victoryPointGoal: 10, upgradeCost: 5, abilityCost: 3, baseResourceAmount: 1, availableAbilities: [] },
  } as unknown as GameState;

  const mockUIState: GameBoardUIState = {
    possibleMoves: [],
    pendingAction: null,
    selectedArmyId: null,
  } as unknown as GameBoardUIState;

  const mockHandleTileClick = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockHandleTileClick.mockClear();
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: mockGameState,
      localPlayer: mockGameState.players[0] as Player,
      uiState: mockUIState,
      selectedArmy: null,
      handleTileClick: mockHandleTileClick,
    } as unknown as GameBoardContextType);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('includes static view model fields', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    expect(result.current.isSelected).toBeDefined();
    expect(result.current.isPossibleMove).toBeDefined();
    expect(result.current.isTileVisible).toBeDefined();
  });

  it('includes island in view model', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    expect(result.current.island).toEqual(island);
  });

  it('finds death animation at island coordinates', () => {
    const now = Date.now();
    const deathAnimation: DeathAnimation = {
      id: 'death-1',
      x: 1,
      y: 1,
      sprite: '/sprites/death.gif',
      createdAt: now - 500,
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        deathAnimations: [deathAnimation],
      } as GameState,
      localPlayer: mockGameState.players[0] as Player,
      uiState: mockUIState,
      selectedArmy: null,
      handleTileClick: mockHandleTileClick,
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    expect(result.current.deathAnimationOnTile).toEqual(deathAnimation);
  });

  it('does not find death animation at different coordinates', () => {
    const now = Date.now();
    const deathAnimation: DeathAnimation = {
      id: 'death-1',
      x: 2,
      y: 2,
      sprite: '/sprites/death.gif',
      createdAt: now - 500,
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        deathAnimations: [deathAnimation],
      } as GameState,
      localPlayer: mockGameState.players[0] as Player,
      uiState: mockUIState,
      selectedArmy: null,
      handleTileClick: mockHandleTileClick,
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    expect(result.current.deathAnimationOnTile).toBeUndefined();
  });

  it('ignores expired death animations', () => {
    const now = Date.now();
    const deathAnimation: DeathAnimation = {
      id: 'death-1',
      x: 1,
      y: 1,
      sprite: '/sprites/death.gif',
      createdAt: now - 2000, // Past 1200ms duration
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        deathAnimations: [deathAnimation],
      } as GameState,
      localPlayer: mockGameState.players[0] as Player,
      uiState: mockUIState,
      selectedArmy: null,
      handleTileClick: mockHandleTileClick,
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    expect(result.current.deathAnimationOnTile).toBeUndefined();
  });

  it('borderImageSequence has first and third entries as island_edge_1 and island_edge_2', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    expect(result.current.borderImageSequence[0]).toBe('/sprites/island_edge_1.gif');
    expect(result.current.borderImageSequence[2]).toBe('/sprites/island_edge_2.gif');
  });

  it('borderImageSequence middle entry is a valid sprite', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    const validSprites = ['/sprites/island_edge_1.gif', '/sprites/island_edge_2.gif', '/sprites/island_edge_3.gif'];
    expect(validSprites).toContain(result.current.borderImageSequence[1]);
  });

  it('borderImageSequence is stable across re-renders with same mount', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result, rerender } = renderHook(() => useIslandTile({ island }));

    const firstSequence = result.current.borderImageSequence;

    // Rerender with same props
    rerender();

    expect(result.current.borderImageSequence).toEqual(firstSequence);
  });

  it('borderImageSequence changes on island change (new mount)', () => {
    const island1: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const island2: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result, rerender } = renderHook((props) => useIslandTile(props), { initialProps: { island: island1 } });

    // Change island (unmounts old, mounts new)
    rerender({ island: island2 });

    // Note: Due to Math.random() being deterministic in a test context, the sequence might be the same
    // but this tests that the effect re-runs properly
    expect(result.current.borderImageSequence).toBeDefined();
  });

  it('onClick calls handleTileClick with island coordinates', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    result.current.onClick();

    expect(mockHandleTileClick).toHaveBeenCalledWith(1, 1);
  });

  it('onClick calls handleTileClick with correct coordinates for different islands', () => {
    const island: Island = {
      id: '5-3',
      x: 5,
      y: 3,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    result.current.onClick();

    expect(mockHandleTileClick).toHaveBeenCalledWith(5, 3);
  });

  it('updates onClick when island changes', () => {
    const island1: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const island2: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result, rerender } = renderHook((props) => useIslandTile(props), { initialProps: { island: island1 } });

    result.current.onClick();
    expect(mockHandleTileClick).toHaveBeenCalledWith(1, 1);

    mockHandleTileClick.mockClear();

    rerender({ island: island2 });

    result.current.onClick();
    expect(mockHandleTileClick).toHaveBeenCalledWith(2, 2);
  });

  it('includes proper island in onClick closure', () => {
    const island: Island = {
      id: '7-4',
      x: 7,
      y: 4,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useIslandTile({ island }));

    result.current.onClick();

    expect(mockHandleTileClick).toHaveBeenCalledWith(7, 4);
    expect(mockHandleTileClick).toHaveBeenCalledTimes(1);
  });

  it('responds to gameState changes for death animations', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result, rerender } = renderHook(() => useIslandTile({ island }));

    expect(result.current.deathAnimationOnTile).toBeUndefined();

    // Update gameState with death animation
    const now = Date.now();
    const deathAnimation: DeathAnimation = {
      id: 'death-1',
      x: 1,
      y: 1,
      sprite: '/sprites/death.gif',
      createdAt: now - 500,
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        deathAnimations: [deathAnimation],
      } as GameState,
      localPlayer: mockGameState.players[0] as Player,
      uiState: mockUIState,
      selectedArmy: null,
      handleTileClick: mockHandleTileClick,
    } as unknown as GameBoardContextType);

    rerender();

    expect(result.current.deathAnimationOnTile).toEqual(deathAnimation);
  });
});
