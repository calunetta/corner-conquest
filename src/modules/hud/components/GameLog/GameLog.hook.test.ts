import { renderHook } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import type { GameState, LogEntry, StructuredLogEntry } from '@/lib/types';
import { useGameLog } from './GameLog.hook';

jest.mock('@/features/game/context/GameBoardContext');

const createGameState = (log: LogEntry[] = []): GameState =>
  ({
    id: 'game-1',
    name: 'Test Game',
    status: 'playing' as const,
    maxPlayers: 4,
    debugMode: false,
    players: [],
    currentPlayerIndex: 0,
    turn: 1,
    baseTiles: [],
    winner: null,
    map: [],
    settings: {
      victoryPointGoal: 30,
      vpPerIslandDiscovery: 1,
      initialDeployCost: 10,
      deployCostIncrement: 2,
      upgradeCost: 5,
      abilityCost: 8,
      baseResourceAmount: 10,
      resourceDensity: 0.6,
      availableCards: [],
      availableAbilities: [],
      fogOfWar: false,
      gridSize: { rows: 6, cols: 5 },
    },
    specialCardsDeck: [],
    discardPile: [],
    deathAnimations: [],
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
    log,
  } as unknown as GameState);

describe('useGameLog', () => {
  it('returns reversed log entries from gameState', () => {
    const gameState = createGameState(['first', 'second', 'third']);

    jest.mocked(useGameBoard).mockReturnValue({
      gameState,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries).toEqual(['third', 'second', 'first']);
  });

  it('handles empty log', () => {
    const gameState = createGameState([]);

    jest.mocked(useGameBoard).mockReturnValue({
      gameState,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries).toEqual([]);
  });

  it('passes a structured entry through unchanged', () => {
    const structured: StructuredLogEntry = {
      kind: 'structured',
      turn: 3,
      category: 'cards',
      message: 'Player Blue bought a card',
      playerId: 'p1',
    };
    const gameState = createGameState(['legacy entry', structured]);

    jest.mocked(useGameBoard).mockReturnValue({
      gameState,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries).toEqual([structured, 'legacy entry']);
    expect(result.current.entries[0]).toBe(structured);
  });

  it('falls back to empty array when log is undefined', () => {
    const gameState = createGameState();
    (gameState as unknown as { log?: string[] }).log = undefined;

    jest.mocked(useGameBoard).mockReturnValue({
      gameState,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries).toEqual([]);
  });

  it('reverses game log with multiple entries', () => {
    const gameState = createGameState([
      'Player Blue deployed a new army',
      'Player Red upgraded to 2 attack power',
      'Island event: gained 5 Gold',
      'Player Blue attacked Player Red',
    ]);

    jest.mocked(useGameBoard).mockReturnValue({
      gameState,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries).toEqual([
      'Player Blue attacked Player Red',
      'Island event: gained 5 Gold',
      'Player Red upgraded to 2 attack power',
      'Player Blue deployed a new army',
    ]);
  });
});
