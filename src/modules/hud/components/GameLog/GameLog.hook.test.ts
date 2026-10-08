import { act, renderHook } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import type { GameState, LogEntry, Player } from '@/lib/types';
import { useGameLog } from './GameLog.hook';

jest.mock('@/features/game/context/GameBoardContext');

const bluePlayer = { playerId: 'p-blue', name: 'Ada', color: 'blue' } as Player;
const redPlayer = { playerId: 'p-red', name: 'Bo', color: 'red' } as Player;

const createGameState = (log: LogEntry[] = [], players: Player[] = [bluePlayer, redPlayer]): GameState =>
  ({
    id: 'game-1',
    name: 'Test Game',
    status: 'playing' as const,
    maxPlayers: 4,
    debugMode: false,
    players,
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

function mockGameState(gameState: GameState) {
  jest.mocked(useGameBoard).mockReturnValue({ gameState } as unknown as ReturnType<typeof useGameBoard>);
}

describe('useGameLog', () => {
  it('defaults showRoutineActivity to false', () => {
    mockGameState(createGameState([]));
    const { result } = renderHook(() => useGameLog());
    expect(result.current.showRoutineActivity).toBe(false);
  });

  it('handles an empty log', () => {
    mockGameState(createGameState([]));
    const { result } = renderHook(() => useGameLog());
    expect(result.current.entries).toEqual([]);
  });

  it('falls back to empty array when log is undefined', () => {
    const gameState = createGameState();
    (gameState as unknown as { log?: LogEntry[] }).log = undefined;
    mockGameState(gameState);

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries).toEqual([]);
  });

  it('resolves player name and color for a structured entry via gameState.players', () => {
    mockGameState(
      createGameState([
        {
          kind: 'structured',
          turn: 1,
          category: 'economy',
          message: 'Ada gained 5 Gold from harvesting',
          playerId: 'p-blue',
        },
      ]),
    );

    const { result } = renderHook(() => useGameLog());

    expect(result.current.entries[0].playerName).toBe('Ada');
    expect(result.current.entries[0].playerColorClass).toBe('text-blue-400');
  });

  it('onToggleShowRoutineActivity flips showRoutineActivity and re-filters without reordering visible entries', () => {
    mockGameState(
      createGameState([
        {
          kind: 'structured',
          turn: 1,
          category: 'cards',
          message: 'Ada bought a card',
          playerId: 'p-blue',
        },
        {
          kind: 'structured',
          turn: 1,
          category: 'economy',
          message: 'Ada collected resources',
          playerId: 'p-blue',
          isPassive: true,
        },
        {
          kind: 'structured',
          turn: 2,
          category: 'cards',
          message: 'Bo bought a card',
          playerId: 'p-red',
        },
      ]),
    );

    const { result } = renderHook(() => useGameLog());

    expect(result.current.showRoutineActivity).toBe(false);
    expect(result.current.entries.map((entry) => entry.message)).toEqual([
      'Bo bought a card',
      'Ada bought a card',
    ]);

    act(() => {
      result.current.onToggleShowRoutineActivity();
    });

    expect(result.current.showRoutineActivity).toBe(true);
    expect(result.current.entries.map((entry) => entry.message)).toEqual([
      'Bo bought a card',
      'Ada collected resources',
      'Ada bought a card',
    ]);
  });
});
