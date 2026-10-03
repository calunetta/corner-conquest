import { renderHook, act } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import type { Army, GameState, Player } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { useActionsPanel } from './ActionsPanel.hook';

jest.mock('@/features/game/context/GameBoardContext');

const createPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 0,
    playerId: 'player-0',
    name: 'Test Player',
    color: 'blue',
    isBot: false,
    armies: [{ id: 0, position: { x: 0, y: 0 }, hasActed: false }],
    resources: { food: 50, wood: 20, gold: 15 },
    armyCount: 1,
    attackPower: 2,
    nextArmyCost: 10,
    victoryPoints: 10,
    specialCards: [],
    positions: [],
    passiveAbilities: { collector: false, explorer: false },
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    hasExtraMove: false,
    actionsThisTurn: [],
    revealedTiles: [],
    ...overrides,
  }) as Player;

const mockSelectedArmy: Army = { id: 0, position: { x: 0, y: 0 }, hasActed: false };
const mockTurnTimer = { formattedTime: '1:30', percentage: 50, isExpiring: false };

const createGameState = (): GameState =>
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
      gridSize: { rows: 2, cols: 3 },
    },
    specialCardsDeck: [],
    discardPile: [],
    deathAnimations: [],
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
    log: [],
  } as unknown as GameState);

describe('useActionsPanel', () => {
  describe('basic integration', () => {
    it('builds panel data from context and map function', () => {
      const localPlayer = createPlayer();

      jest.mocked(useGameBoard).mockReturnValue({
        onAction: jest.fn(),
        onLocalAction: jest.fn(),
        localPlayer,
        gameState: createGameState(),
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      expect(result.current.isMyTurn).toBe(true);
      expect(result.current.mainActions).toBeDefined();
      expect(result.current.alwaysAvailableActions).toBeDefined();
      expect(result.current.secondaryActions).toBeDefined();
    });
  });

  describe('onActionClick handler', () => {
    it('calls onLocalAction for local_Position with army payload', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.local_Position);
      });

      expect(onLocalAction).toHaveBeenCalledWith(GameAction.local_Position, { army: mockSelectedArmy });
      expect(onAction).not.toHaveBeenCalled();
    });

    it('calls onLocalAction for local_Attack with army payload', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.local_Attack);
      });

      expect(onLocalAction).toHaveBeenCalledWith(GameAction.local_Attack, { army: mockSelectedArmy });
      expect(onAction).not.toHaveBeenCalled();
    });

    it('calls onLocalAction for local_ShowCards with playerId payload', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer({ id: 2 });

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.local_ShowCards);
      });

      expect(onLocalAction).toHaveBeenCalledWith(GameAction.local_ShowCards, { playerId: 2 });
      expect(onAction).not.toHaveBeenCalled();
    });

    it('calls onLocalAction for local_OpenAbilitiesShop with no payload', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.local_OpenAbilitiesShop);
      });

      expect(onLocalAction).toHaveBeenCalledWith(GameAction.local_OpenAbilitiesShop);
      expect(onAction).not.toHaveBeenCalled();
    });

    it('calls onAction for Deploy', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.Deploy);
      });

      expect(onAction).toHaveBeenCalledWith(GameAction.Deploy);
      expect(onLocalAction).not.toHaveBeenCalled();
    });

    it('calls onAction for Upgrade', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.Upgrade);
      });

      expect(onAction).toHaveBeenCalledWith(GameAction.Upgrade);
      expect(onLocalAction).not.toHaveBeenCalled();
    });

    it('calls onAction for BuyCard', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onActionClick(GameAction.BuyCard);
      });

      expect(onAction).toHaveBeenCalledWith(GameAction.BuyCard);
      expect(onLocalAction).not.toHaveBeenCalled();
    });

    it('calls onAction for EndTurn', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onEndTurn();
      });

      expect(onAction).toHaveBeenCalledWith(GameAction.EndTurn);
      expect(onLocalAction).not.toHaveBeenCalled();
    });
  });

  describe('cancel and deselect handlers', () => {
    it('onCancelAction calls onLocalAction with local_CancelAction', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onCancelAction();
      });

      expect(onLocalAction).toHaveBeenCalledWith(GameAction.local_CancelAction);
    });

    it('onDeselectArmy calls onLocalAction with local_DeselectArmy', () => {
      const onLocalAction = jest.fn();
      const onAction = jest.fn();
      const localPlayer = createPlayer();

      const gameState = createGameState();
      jest.mocked(useGameBoard).mockReturnValue({
        onAction,
        onLocalAction,
        localPlayer,
        gameState,
        isMyTurn: true,
        selectedArmy: mockSelectedArmy,
        uiState: { pendingAction: null },
        turnTimer: mockTurnTimer,
      } as unknown as ReturnType<typeof useGameBoard>);

      const { result } = renderHook(() => useActionsPanel());

      act(() => {
        result.current.onDeselectArmy();
      });

      expect(onLocalAction).toHaveBeenCalledWith(GameAction.local_DeselectArmy);
    });
  });
});
