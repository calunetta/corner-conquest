import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from './game-board.engine.hook';
import * as service from './services/game-board.engine.service';
import { useToast } from '@/modules/shared';
import { takeBotTurn } from '@/modules/game-rules';
import { useRouter } from 'next/navigation';
import type { GameState, DeathAnimation } from '@/lib/types';

jest.mock('./services/game-board.engine.service', () => ({
  subscribeToGameState: jest.fn(),
  saveGameState: jest.fn(),
  clearDeathAnimations: jest.fn(),
}));

jest.mock('@/modules/shared', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/modules/game-rules', () => ({
  takeBotTurn: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockSubscribeToGameState = service.subscribeToGameState as jest.Mock;
const mockSaveGameState = service.saveGameState as jest.Mock;
const mockClearDeathAnimations = service.clearDeathAnimations as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockTakeBotTurn = takeBotTurn as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

const createGameState = (overrides?: Partial<GameState>): GameState => ({
  id: 'game_test',
  name: 'Test Game',
  status: 'playing' as const,
  maxPlayers: 2,
  debugMode: false,
  settings: {
    victoryPointGoal: 10,
    vpPerIslandDiscovery: 1,
    initialDeployCost: 2,
    deployCostIncrement: 1,
    upgradeCost: 3,
    abilityCost: 10,
    baseResourceAmount: 50,
    resourceDensity: 0.5,
    availableCards: [],
    availableAbilities: [],
    fogOfWar: false,
    gridSize: { rows: 10, cols: 10 },
  },
  currentPlayerIndex: 0,
  players: [
    {
      id: 0,
      playerId: 'player_1',
      name: 'Player 1',
      isBot: false,
      color: 'blue' as const,
      armies: [],
      resources: { gold: 100, wood: 50, food: 30 },
      armyCount: 10,
      attackPower: 1,
      nextArmyCost: 2,
      victoryPoints: 0,
      specialCards: [],
      positions: [],
      hasExtraMove: false,
      actionsThisTurn: [],
      passiveAbilities: {},
      isSabotaged: false,
      reinforceActive: false,
      efficientActive: false,
      masterBuilderActive: false,
      revealedTiles: [],
    },
    {
      id: 1,
      playerId: 'player_2',
      name: 'Player 2',
      isBot: true,
      color: 'red' as const,
      armies: [],
      resources: { gold: 80, wood: 40, food: 20 },
      armyCount: 8,
      attackPower: 1,
      nextArmyCost: 2,
      victoryPoints: 0,
      specialCards: [],
      positions: [],
      hasExtraMove: false,
      actionsThisTurn: [],
      passiveAbilities: {},
      isSabotaged: false,
      reinforceActive: false,
      efficientActive: false,
      masterBuilderActive: false,
      revealedTiles: [],
    },
  ],
  map: [],
  baseTiles: [],
  deathAnimations: [],
  turn: 1,
  log: [],
  winner: null,
  specialCardsDeck: [],
  discardPile: [],
  combatState: null,
  monsterCombatState: null,
  productiveDialogState: null,
  ...overrides,
});

describe('useGameEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseToast.mockReturnValue({
      toast: jest.fn(),
      dismiss: jest.fn(),
      toasts: [],
    });

    const mockRouter = {
      push: jest.fn(),
    };
    mockUseRouter.mockReturnValue(mockRouter);

    mockSubscribeToGameState.mockReturnValue(jest.fn());
    mockSaveGameState.mockResolvedValue(undefined);
    mockClearDeathAnimations.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('sets gameState to null initially and isLoading to true', () => {
    mockSubscribeToGameState.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    expect(result.current.gameState).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('calls subscribeToGameState with the gameId', () => {
    renderHook(() => useGameEngine('game_abc', 'player_1'));

    expect(mockSubscribeToGameState).toHaveBeenCalledWith('game_abc', expect.any(Object));
  });

  it('updates gameState when onData callback is invoked', () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    const gameState = createGameState();

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.gameState).toEqual(gameState);
    expect(result.current.isLoading).toBe(false);
  });

  it('toasts and redirects to / when onMissing callback is invoked', () => {
    let onMissingCallback: (() => void) | null = null;
    const mockToast = jest.fn();
    const mockRouter = { push: jest.fn() };

    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: [],
    });
    mockUseRouter.mockReturnValue(mockRouter);

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onMissingCallback = callbacks.onMissing;
        return jest.fn();
      }
    );

    renderHook(() => useGameEngine('game_123', 'player_1'));

    act(() => {
      onMissingCallback?.();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Game Over' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('toasts and redirects to / when not in the game (after loading is false)', () => {
    const mockToast = jest.fn();
    const mockRouter = { push: jest.fn() };

    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: [],
    });
    mockUseRouter.mockReturnValue(mockRouter);

    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_999'));

    const gameState = createGameState();

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.localPlayer).toBeNull();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Not in Game' }));

    // Advance timers to trigger the 3-second redirect
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('calculates localPlayer correctly', () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    const gameState = createGameState();

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.localPlayer).toEqual(gameState.players[0]);
  });

  it('returns null for localPlayer when playerId is null', () => {
    const { result } = renderHook(() => useGameEngine('game_123', null));

    expect(result.current.localPlayer).toBeNull();
  });

  it('calculates isMyTurn correctly', () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    const gameState = createGameState({ currentPlayerIndex: 0 });

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.isMyTurn).toBe(true);

    const gameState2 = createGameState({ currentPlayerIndex: 1 });

    act(() => {
      onDataCallback?.(gameState2);
    });

    expect(result.current.isMyTurn).toBe(false);
  });

  it('calculates isHost correctly (player with id=0)', () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    const gameState = createGameState();

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.isHost).toBe(true);

    const { result: result2 } = renderHook(() => useGameEngine('game_123', 'player_2'));

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result2.current.isHost).toBe(false);
  });

  it('calls globallyRevealedTiles computation', () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    const gameState = createGameState({
      players: [
        {
          ...createGameState().players[0],
          revealedTiles: ['tile_1', 'tile_2'],
        },
        {
          ...createGameState().players[1],
          revealedTiles: ['tile_2', 'tile_3'],
        },
      ],
    });

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.globallyRevealedTiles).toEqual(new Set(['tile_1', 'tile_2', 'tile_3']));
  });

  it('triggers bot turn when host, bot is playing, and game is playing', async () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    mockTakeBotTurn.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGameEngine('game_123', 'player_1'));

    const gameState = createGameState({
      currentPlayerIndex: 1, // Bot's turn
    });

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.isHost).toBe(true);

    // Advance timers by 1000ms to trigger the bot turn
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTakeBotTurn).toHaveBeenCalledWith(gameState);
  });

  it('does not trigger bot turn when not host', async () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useGameEngine('game_123', 'player_2'));

    const gameState = createGameState({
      currentPlayerIndex: 1, // Bot's turn
    });

    act(() => {
      onDataCallback?.(gameState);
    });

    expect(result.current.isHost).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTakeBotTurn).not.toHaveBeenCalled();
  });

  it('schedules death animation cleanup after the remaining time', async () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    mockClearDeathAnimations.mockResolvedValue(undefined);

    renderHook(() => useGameEngine('game_123', 'player_1'));

    const now = Date.now();
    const deathAnim: DeathAnimation = {
      id: 'anim_1',
      x: 5,
      y: 5,
      sprite: 'death_sprite',
      createdAt: now - 100, // Created 100ms ago
    };

    const gameState = createGameState({
      currentPlayerIndex: 0,
      deathAnimations: [deathAnim],
    });

    act(() => {
      onDataCallback?.(gameState);
    });

    // The hook should schedule cleanup for ~1150ms (1250ms - 100ms elapsed)
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(mockClearDeathAnimations).toHaveBeenCalledWith('game_123', []);
  });

  it('does not schedule the same death animation twice', async () => {
    let onDataCallback: ((state: GameState) => void) | null = null;

    mockSubscribeToGameState.mockImplementation(
      (gameId: string, callbacks: { onData: (state: GameState) => void; onMissing: () => void; onError: (error: unknown) => void }) => {
        onDataCallback = callbacks.onData;
        return jest.fn();
      }
    );

    mockClearDeathAnimations.mockResolvedValue(undefined);

    renderHook(() => useGameEngine('game_123', 'player_1'));

    const deathAnim: DeathAnimation = {
      id: 'anim_1',
      x: 5,
      y: 5,
      sprite: 'death_sprite',
      createdAt: Date.now(),
    };

    const gameState = createGameState({
      deathAnimations: [deathAnim],
    });

    act(() => {
      onDataCallback?.(gameState);
    });

    // Trigger the same game state again (simulating a redundant update)
    act(() => {
      onDataCallback?.(gameState);
    });

    act(() => {
      jest.advanceTimersByTime(1300);
    });

    // clearDeathAnimations should be called only once for this animation
    expect(mockClearDeathAnimations).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from game state on unmount', () => {
    const unsubscribe = jest.fn();
    mockSubscribeToGameState.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useGameEngine('game_123', 'player_1'));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not subscribe if gameId is empty', () => {
    renderHook(() => useGameEngine('', 'player_1'));

    expect(mockSubscribeToGameState).not.toHaveBeenCalled();
  });
});
