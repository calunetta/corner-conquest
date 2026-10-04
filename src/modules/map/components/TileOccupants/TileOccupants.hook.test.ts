import { renderHook } from '@testing-library/react';
import { useTileOccupants } from './TileOccupants.hook';
import { IslandType, PlayerColor, type Island, type DeathAnimation } from '@/lib/types';
import { useGameBoard } from '@/modules/game-board';
import type { GameBoardContextType } from '@/modules/game-board';
import { gameStateFixture, bluePlayer, redPlayer } from './TileOccupants.fixtures';

jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

describe('useTileOccupants', () => {
  const mockGameState = { ...gameStateFixture, deathAnimations: [] };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: mockGameState,
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns occupant for unpositioned army', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    expect(result.current.occupants).toHaveLength(1);
    expect(result.current.occupants[0].color).toBe(PlayerColor.Blue);
  });

  it('suppresses occupant currently in death animation', () => {
    const now = Date.now();
    const deathAnimation: DeathAnimation = {
      id: 'army-0-0',
      x: 1,
      y: 1,
      sprite: '/sprites/death.gif',
      createdAt: now - 500, // 500ms ago, still within 1200ms duration
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: { ...mockGameState, deathAnimations: [deathAnimation] },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should be suppressed because death animation is active
    expect(result.current.occupants).toHaveLength(0);
  });

  it('shows occupant after death animation expires', () => {
    const now = Date.now();
    const deathAnimation: DeathAnimation = {
      id: 'army-0-0',
      x: 1,
      y: 1,
      sprite: '/sprites/death.gif',
      createdAt: now - 2000, // 2000ms ago, past 1200ms duration
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: { ...mockGameState, deathAnimations: [deathAnimation] },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should be shown because death animation has expired
    expect(result.current.occupants).toHaveLength(1);
  });

  it('shows occupant when debug mode is enabled', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        debugMode: true,
        settings: { ...mockGameState.settings, fogOfWar: true },
      },
      localPlayer: { ...bluePlayer, revealedTiles: [] },
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should show because debug mode is on
    expect(result.current.occupants).toHaveLength(1);
  });

  it('shows occupant when fog of war is disabled', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        settings: { ...mockGameState.settings, fogOfWar: false },
      },
      localPlayer: { ...bluePlayer, revealedTiles: [] },
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should show because fog of war is disabled
    expect(result.current.occupants).toHaveLength(1);
  });

  it('shows local player occupant when fog of war is enabled', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        settings: { ...mockGameState.settings, fogOfWar: true },
      },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should show because it's the local player
    expect(result.current.occupants).toHaveLength(1);
  });

  it('hides foreign occupant on non-base tile with fog of war when not revealed', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        players: [
          bluePlayer,
          { ...redPlayer, armies: [{ id: 1, position: { x: 2, y: 2 }, hasActed: false }] },
        ],
        settings: { ...mockGameState.settings, fogOfWar: true },
      },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 1, armyId: 1 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should be hidden because it's not the local player, not a base, and not personally revealed
    expect(result.current.occupants).toHaveLength(0);
  });

  it('shows foreign occupant on Base tile with fog of war', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        players: [
          bluePlayer,
          { ...redPlayer, armies: [{ id: 1, position: { x: 0, y: 0 }, hasActed: false }] },
        ],
        settings: { ...mockGameState.settings, fogOfWar: true },
      },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [{ playerId: 1, armyId: 1 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should show because it's a Base tile
    expect(result.current.occupants).toHaveLength(1);
  });

  it('shows personally revealed foreign occupant with fog of war', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        players: [
          bluePlayer,
          { ...redPlayer, armies: [{ id: 1, position: { x: 2, y: 2 }, hasActed: false }] },
        ],
        settings: { ...mockGameState.settings, fogOfWar: true },
      },
      localPlayer: { ...bluePlayer, revealedTiles: ['2-2'] },
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 1, armyId: 1 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    // Should show because the tile is personally revealed
    expect(result.current.occupants).toHaveLength(1);
  });

  it('sets isFaded for armies with hasActed', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        players: [
          { ...bluePlayer, armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: true }] },
        ],
      },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    expect(result.current.occupants[0].isFaded).toBe(true);
  });

  it('does not set isFaded for armies with hasActed false', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));

    expect(result.current.occupants[0].isFaded).toBe(false);
  });

  it('generates unique keys for occupants', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        players: [
          bluePlayer,
          { ...redPlayer, armies: [{ id: 1, position: { x: 1, y: 1 }, hasActed: false }] },
        ],
      },
      localPlayer: bluePlayer,
      uiState: { possibleMoves: [], pendingAction: null, selectedArmyId: null },
      selectedArmy: null,
      dispatch: jest.fn(),
      isMyTurn: true,
      isHost: true,
      turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
      onAction: jest.fn(),
      onLocalAction: jest.fn(),
      handleTileClick: jest.fn(),
      handleStartGame: jest.fn(),
      handleExitClick: jest.fn(),
      handleConfirmExit: jest.fn(),
      handleConfirmHostLeave: jest.fn(),
    } as unknown as GameBoardContextType);

    const island: Island = {
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

    const { result } = renderHook(() => useTileOccupants({ island }));

    const keys = result.current.occupants.map((o) => o.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('updates when island prop changes', () => {
    const island1: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const island2: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const { result, rerender } = renderHook((props) => useTileOccupants(props), { initialProps: { island: island1 } });

    expect(result.current.occupants).toHaveLength(1);

    rerender({ island: island2 });

    expect(result.current.occupants).toHaveLength(0);
  });
});
