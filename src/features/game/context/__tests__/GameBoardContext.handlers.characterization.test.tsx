/**
 * Characterization tests for GameBoardContext handlers: Attack, Position, UseCard, CancelAction,
 * local UI actions, Escape key, session handlers (start game, exit), auto-end-turn, and turn timer.
 *
 * These tests describe behavior as it exists today and guard against behavioral drift during
 * extraction (Phase 3b). They drive the provider via ContextSpy + act() and import directly
 * from the current GameBoardContext.tsx (no imports from @/modules/game-board yet).
 *
 * Required jest mocks (declare at top of file):
 */
import { act, fireEvent, render as rtlRender } from '@testing-library/react';
import { GameAction, IslandType, CardName, PlayerColor, type GameState, type Player, type Army, MonsterName } from '@/lib/types';
import { GameBoardProvider, useGameBoard } from '../GameBoardContext';
import { mockToast, buildPlayer, buildGameState, withTile, renderProvider } from './test-utils/gameBoardTestKit';

const mockToastObj = { toast: mockToast };
jest.mock('@/hooks/use-toast', () => ({ useToast: () => mockToastObj }));
jest.mock('@/modules/game-rules', () => ({
  startGame: jest.fn((state) => state),
  getPossibleMoves: jest.fn(() => []),
  handleGameAction: jest.fn(({ gameState }) => ({ state: gameState })),
  handlePlayerExit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/turn-progression', () => ({ hasPlayerRemainingActions: jest.fn(() => true) }));

const { handleGameAction, handlePlayerExit, startGame } = require('@/modules/game-rules');
const { hasPlayerRemainingActions } = require('@/lib/turn-progression');

describe('GameBoardContext: Handler Characterization Tests', () => {
  beforeEach(() => {
    mockToast.mockClear();
    handleGameAction.mockClear();
    handlePlayerExit.mockClear();
    startGame.mockClear();
    hasPlayerRemainingActions.mockReturnValue(true);
  });

  // --- local_Attack tests ---
  describe('local_Attack', () => {
    it('with single enemy army on tile: calls onAction(InitiateCombat)', async () => {
      const enemyArmy: Army = { id: 2, position: { x: 1, y: 0 }, hasActed: false };
      const enemy = buildPlayer({ id: 1, playerId: 'p1', armies: [enemyArmy] });
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });

      const gameState = buildGameState({ players: [player, enemy] });
      const tileWithEnemies = withTile(gameState, 1, 0, { occupants: [{ playerId: 1, armyId: 2 }] });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      const result = renderProvider(tileWithEnemies, { setGameState: setGameStateMock });

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Attack, { army: playerArmy });
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: GameAction.InitiateCombat,
          payload: {
            attackingArmyId: 1,
            target: { type: 'player', defenderId: 1, defendingArmyId: 2 },
          },
        })
      );
      expect(setGameStateMock).toHaveBeenCalled();
    });

    it('with two enemy armies on tile: opens attack selection dialog', async () => {
      const enemy = buildPlayer({
        id: 1,
        playerId: 'p1',
        armies: [
          { id: 2, position: { x: 1, y: 0 }, hasActed: false },
          { id: 3, position: { x: 1, y: 0 }, hasActed: false },
        ],
      });
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });

      const gameState = buildGameState({ players: [player, enemy] });
      const tileWithEnemies = withTile(gameState, 1, 0, {
        occupants: [{ playerId: 1, armyId: 2 }, { playerId: 1, armyId: 3 }],
      });

      const result = renderProvider(tileWithEnemies);
      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Attack, { army: playerArmy });
      });

      const context = result.getContext();
      expect(context.uiState.dialogs.attackSelection).not.toBeNull();
      expect(context.uiState.dialogs.attackSelection?.attackingArmyId).toBe(1);
      expect(handleGameAction).not.toHaveBeenCalled();
    });

    it('with single monster on tile: calls onAction(InitiateCombat) with monster target', async () => {
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });
      const gameState = buildGameState({ players: [player] });
      const tileWithMonster = withTile(gameState, 1, 0, {
        monsters: [{ name: MonsterName.Lancer, level: 1, sprite: { idle: '', attack: '', death: '' } }],
      });

      const result = renderProvider(tileWithMonster);
      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Attack, { army: playerArmy });
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: GameAction.InitiateCombat,
          payload: expect.objectContaining({
            target: { type: 'monster', monsterName: MonsterName.Lancer },
          }),
        })
      );
    });

    it('with two monsters on tile: opens monster selection dialog', async () => {
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });
      const gameState = buildGameState({ players: [player] });
      const tileWithMonsters = withTile(gameState, 1, 0, {
        monsters: [
          { name: MonsterName.Lancer, level: 1, sprite: { idle: '', attack: '', death: '' } },
          { name: MonsterName.Bear, level: 2, sprite: { idle: '', attack: '', death: '' } },
        ],
      });

      const result = renderProvider(tileWithMonsters);
      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Attack, { army: playerArmy });
      });

      const context = result.getContext();
      expect(context.uiState.dialogs.monsterSelection).not.toBeNull();
      expect(handleGameAction).not.toHaveBeenCalled();
    });

    it('with undefined army payload: does nothing', async () => {
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);
      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Attack, { army: undefined });
      });

      const context = result.getContext();
      expect(handleGameAction).not.toHaveBeenCalled();
      expect(context.uiState.dialogs.attackSelection).toBeNull();
    });

    it('on tile with only own occupants: does nothing', async () => {
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });
      const gameState = buildGameState({ players: [player] });
      const tileWithOwnArmy = withTile(gameState, 1, 0, { occupants: [{ playerId: 0, armyId: 1 }] });

      const result = renderProvider(tileWithOwnArmy);
      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Attack, { army: playerArmy });
      });

      expect(handleGameAction).not.toHaveBeenCalled();
      expect(result.getContext().uiState.dialogs.attackSelection).toBeNull();
    });
  });

  // --- local_Position tests ---
  describe('local_Position', () => {
    it('with resources available and no positionedBy: opens position dialog', async () => {
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });
      const gameState = buildGameState({ players: [player] });
      const tileWithResources = withTile(gameState, 1, 0, {
        resources: [
          { type: 'food', amount: 5 },
          { type: 'wood', amount: 3 },
        ],
        positionedBy: [],
      });

      const result = renderProvider(tileWithResources);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Position, { army: playerArmy });
      });

      const context = result.getContext();
      expect(context.uiState.dialogs.position).not.toBeNull();
      expect(context.uiState.dialogs.position?.x).toBe(1);
      expect(context.uiState.dialogs.position?.y).toBe(0);
    });

    it('with all resources already positioned: toasts "No available spots"', async () => {
      const playerArmy: Army = { id: 1, position: { x: 1, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [playerArmy] });
      const gameState = buildGameState({ players: [player] });
      const tileWithAllPositioned = withTile(gameState, 1, 0, {
        resources: [{ type: 'food', amount: 5 }],
        positionedBy: [{ playerId: 0, resource: 'food' }],
      });

      mockToast.mockClear();
      const result = renderProvider(tileWithAllPositioned);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_Position, { army: playerArmy });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'No available spots',
          variant: 'destructive',
        })
      );
      expect(result.getContext().uiState.dialogs.position).toBeNull();
    });
  });

  // --- local_UseCard tests ---
  describe('local_UseCard', () => {
    it('card not in specialCards: toasts action error', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0', specialCards: [] });
      const gameState = buildGameState({ players: [player] });

      mockToast.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Teleport });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Action Error',
          description: expect.stringContaining('You do not have the Teleport card'),
        })
      );
    });

    it('already used a card this turn: toasts error', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Teleport],
        actionsThisTurn: [GameAction.UseCard],
      });
      const gameState = buildGameState({ players: [player] });

      mockToast.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Teleport });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Action Error',
          description: expect.stringContaining('You can only use one card per turn'),
        })
      );
    });

    it('Teleport card: sets pendingAction without calling handleGameAction', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Teleport],
      });
      const gameState = buildGameState({ players: [player] });

      mockToast.mockClear();
      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Teleport });
      });

      const context = result.getContext();
      expect(context.uiState.pendingAction).toEqual(
        expect.objectContaining({
          type: 'teleport',
          cardName: CardName.Teleport,
        })
      );
      expect(handleGameAction).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Teleport Activated' })
      );
    });

    it('Scout card: calls handleGameAction and sets scout pendingAction', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Scout],
      });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Scout });
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: GameAction.UseCard,
          payload: { cardName: CardName.Scout },
        })
      );
      const context = result.getContext();
      expect(context.uiState.pendingAction).toEqual(
        expect.objectContaining({
          type: 'scout',
          cardName: CardName.Scout,
          count: 3,
          scoutedTiles: [],
        })
      );
      expect(context.uiState.selectedArmyId).toBeNull();
    });

    it('Sabotage card: sets sabotage pending and dialog', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Sabotage],
      });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Sabotage });
      });

      const context = result.getContext();
      expect(context.uiState.pendingAction?.type).toBe('sabotage');
      expect(context.uiState.dialogs.sabotage?.isOpen).toBe(true);
    });

    it('Wealthy card: sets wealthy pending and dialog', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Wealthy],
      });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Wealthy });
      });

      const context = result.getContext();
      expect(context.uiState.pendingAction?.type).toBe('wealthy');
      expect(context.uiState.dialogs.wealthy?.isOpen).toBe(true);
    });

    it('Steal Resource card: sets steal-resource pending and dialog', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.StealResource],
      });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.StealResource });
      });

      const context = result.getContext();
      expect(context.uiState.pendingAction?.type).toBe('steal-resource');
      expect(context.uiState.dialogs.stealResource?.isOpen).toBe(true);
    });

    it('non-multi-step card (Reinforce): calls handleGameAction without pending action', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Reinforce],
      });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Reinforce });
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: GameAction.UseCard,
          payload: { cardName: CardName.Reinforce },
        })
      );
      expect(result.getContext().uiState.pendingAction).toBeNull();
    });

    it('handleGameAction returns no state: no pending action set', async () => {
      const player = buildPlayer({
        id: 0,
        playerId: 'p0',
        specialCards: [CardName.Scout],
      });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockReturnValue({ state: null });
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_UseCard, { cardName: CardName.Scout });
      });

      expect(result.getContext().uiState.pendingAction).toBeNull();
    });
  });

  // --- local_CancelAction tests ---
  describe('local_CancelAction', () => {
    it('with Scout pending action: calls onAction(CancelAction) with cardName and scoutedTiles', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0', specialCards: [CardName.Scout] });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      // Set up pending Scout action
      await act(async () => {
        result.getContext().dispatch({ type: 'SET_PENDING_ACTION', pendingAction: { type: 'scout', cardName: CardName.Scout, count: 2, scoutedTiles: ['1-0', '2-1'] } });
      });

      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_CancelAction, {});
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: GameAction.CancelAction,
          payload: expect.objectContaining({
            cardName: CardName.Scout,
            scoutedTiles: ['1-0', '2-1'],
          }),
        })
      );
      expect(result.getContext().uiState.pendingAction).toBeNull();
    });

    it('with reinforceActive and no pending: uses Reinforce as fallback', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0', reinforceActive: true });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);
      handleGameAction.mockClear();

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_CancelAction, {});
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ cardName: CardName.Reinforce }),
        })
      );
    });
  });

  // --- Simple local actions ---
  describe('simple local actions', () => {
    it('local_ShowCards opens cards dialog', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_ShowCards, { playerId: 1 });
      });

      expect(result.getContext().uiState.dialogs.cardsPlayerId).toBe(1);
    });

    it('local_CloseCards closes cards dialog', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_ShowCards, { playerId: 1 });
      });

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_CloseCards);
      });

      expect(result.getContext().uiState.dialogs.cardsPlayerId).toBeNull();
    });

    it('local_OpenAbilitiesShop opens shop', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_OpenAbilitiesShop);
      });

      expect(result.getContext().uiState.dialogs.abilitiesShopOpen).toBe(true);
    });

    it('local_CloseAbilitiesShop closes shop', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_OpenAbilitiesShop);
      });

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_CloseAbilitiesShop);
      });

      expect(result.getContext().uiState.dialogs.abilitiesShopOpen).toBe(false);
    });

    it('unhandled local action calls console.warn', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = renderProvider(gameState);

      await act(async () => {
        result.getContext().onLocalAction(999 as unknown as GameAction);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled local action:', 999);
      consoleSpy.mockRestore();
    });

    it('with isMyTurn false: any local action is a no-op', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState, { isMyTurn: false });

      await act(async () => {
        result.getContext().onLocalAction(GameAction.local_ShowCards, { playerId: 1 });
      });

      expect(result.getContext().uiState.dialogs.cardsPlayerId).toBeNull();
    });
  });

  // --- Escape key handler ---
  describe('Escape key handler', () => {
    it('with selected army: deselects on Escape', async () => {
      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      // Select an army
      await act(async () => {
        result.getContext().dispatch({ type: 'SET_SELECTED_ARMY', armyId: 1 });
      });
      expect(result.getContext().uiState.selectedArmyId).toBe(1);

      // Press Escape
      await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(result.getContext().uiState.selectedArmyId).toBeNull();
    });

    it('with pending action, no selected army: calls cancel action on Escape', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0', specialCards: [CardName.Scout] });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      // Set pending action
      await act(async () => {
        result.getContext().dispatch({
          type: 'SET_PENDING_ACTION',
          pendingAction: { type: 'scout', cardName: CardName.Scout, count: 3, scoutedTiles: [] },
        });
      });

      handleGameAction.mockClear();

      // Press Escape
      await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: GameAction.CancelAction })
      );
    });

    it('with neither selected army nor pending action: nothing happens on Escape', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const result = renderProvider(gameState);

      await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(handleGameAction).not.toHaveBeenCalled();
      expect(result.getContext().uiState.selectedArmyId).toBeNull();
    });

    it('non-Escape key does nothing', async () => {
      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player] });

      const result = renderProvider(gameState);

      // Select an army
      await act(async () => {
        result.getContext().dispatch({ type: 'SET_SELECTED_ARMY', armyId: 1 });
      });

      // Press a different key
      await act(async () => {
        fireEvent.keyDown(window, { key: 'Enter' });
      });

      expect(result.getContext().uiState.selectedArmyId).toBe(1);
    });
  });

  // --- handleStartGame ---
  describe('handleStartGame', () => {
    it('host: calls startGame and setGameState', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0', name: 'TestPlayer' });
      const gameState = buildGameState({ players: [player], status: 'waiting' });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      startGame.mockClear();
      mockToast.mockClear();

      const result = renderProvider(gameState, { isHost: true, setGameState: setGameStateMock });

      await act(async () => {
        await result.getContext().handleStartGame();
      });

      expect(startGame).toHaveBeenCalledWith(gameState, 'TestPlayer');
      expect(setGameStateMock).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Game Started!' })
      );
    });

    it('non-host: does nothing', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player], status: 'waiting' });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      startGame.mockClear();

      const result = renderProvider(gameState, { isHost: false, setGameState: setGameStateMock });

      await act(async () => {
        await result.getContext().handleStartGame();
      });

      expect(startGame).not.toHaveBeenCalled();
      expect(setGameStateMock).not.toHaveBeenCalled();
    });
  });

  // --- handleExitClick ---
  describe('handleExitClick', () => {
    it('host: opens host leave dialog', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player], status: 'playing' });

      const result = renderProvider(gameState, { isHost: true });

      await act(async () => {
        await result.getContext().handleExitClick();
      });

      expect(result.getContext().uiState.dialogs.hostLeave).toBe(true);
    });

    it('non-host in playing status: opens confirm exit dialog', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player], status: 'playing' });

      const result = renderProvider(gameState, { isHost: false });

      await act(async () => {
        await result.getContext().handleExitClick();
      });

      expect(result.getContext().uiState.dialogs.confirmExit).toBe(true);
    });

    it('non-host in waiting status: calls handleConfirmExit directly', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player], status: 'waiting' });

      handlePlayerExit.mockClear();
      const onExitMock = jest.fn();

      const result = renderProvider(gameState, { isHost: false, onExit: onExitMock });

      await act(async () => {
        await result.getContext().handleExitClick();
      });

      expect(handlePlayerExit).toHaveBeenCalled();
      expect(onExitMock).toHaveBeenCalled();
    });
  });

  // --- handleConfirmExit ---
  describe('handleConfirmExit', () => {
    it('success: closes dialog, calls handlePlayerExit and onExit', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      handlePlayerExit.mockResolvedValue(undefined);
      const onExitMock = jest.fn();

      const result = renderProvider(gameState, { onExit: onExitMock });

      // Open confirm dialog
      await act(async () => {
        result.getContext().dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: true });
      });

      handlePlayerExit.mockClear();

      await act(async () => {
        await result.getContext().handleConfirmExit();
      });

      expect(result.getContext().uiState.dialogs.confirmExit).toBe(false);
      expect(handlePlayerExit).toHaveBeenCalled();
      expect(onExitMock).toHaveBeenCalled();
      expect(result.getContext().uiState.isExiting).toBe(false);
    });

    it('rejection: still calls onExit', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const error = new Error('Exit failed');
      handlePlayerExit.mockRejectedValueOnce(error);
      const onExitMock = jest.fn();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = renderProvider(gameState, { onExit: onExitMock });

      await act(async () => {
        result.getContext().dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: true });
      });

      handlePlayerExit.mockClear();
      handlePlayerExit.mockRejectedValueOnce(error);

      await act(async () => {
        await result.getContext().handleConfirmExit();
      });

      expect(errorSpy).toHaveBeenCalledWith('Error exiting game:', error);
      expect(onExitMock).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  // --- handleConfirmHostLeave ---
  describe('handleConfirmHostLeave', () => {
    it('success: closes dialog, calls handlePlayerExit and onExit', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      handlePlayerExit.mockResolvedValue(undefined);
      const onExitMock = jest.fn();

      const result = renderProvider(gameState, { onExit: onExitMock });

      await act(async () => {
        result.getContext().dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: true });
      });

      handlePlayerExit.mockClear();

      await act(async () => {
        await result.getContext().handleConfirmHostLeave();
      });

      expect(result.getContext().uiState.dialogs.hostLeave).toBe(false);
      expect(handlePlayerExit).toHaveBeenCalled();
      expect(onExitMock).toHaveBeenCalled();
    });

    it('rejection: still calls onExit', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const error = new Error('Host leave failed');
      const onExitMock = jest.fn();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = renderProvider(gameState, { onExit: onExitMock });

      await act(async () => {
        result.getContext().dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: true });
      });

      handlePlayerExit.mockClear();
      handlePlayerExit.mockRejectedValueOnce(error);

      await act(async () => {
        await result.getContext().handleConfirmHostLeave();
      });

      expect(errorSpy).toHaveBeenCalledWith('Error host leaving game:', error);
      expect(onExitMock).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  // --- onAction tests ---
  describe('onAction', () => {
    it('EndTurn with local state: calls setGameState once', async () => {
      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player] });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      const result = renderProvider(gameState, { isMyTurn: true, setGameState: setGameStateMock });

      setGameStateMock.mockClear();

      await act(async () => {
        await result.getContext().onAction(GameAction.EndTurn);
      });

      expect(setGameStateMock).toHaveBeenCalledTimes(1);
      expect(setGameStateMock).toHaveBeenCalledWith(
        expect.any(Object),
        GameAction.EndTurn,
        undefined
      );
    });

    it('EndTurn with isMyTurn false and no local state: does nothing', async () => {
      const player = buildPlayer({ id: 0, playerId: 'p0' });
      const gameState = buildGameState({ players: [player] });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      const result = renderProvider(gameState, { isMyTurn: false, setGameState: setGameStateMock });

      setGameStateMock.mockClear();

      await act(async () => {
        await result.getContext().onAction(GameAction.EndTurn);
      });

      expect(setGameStateMock).not.toHaveBeenCalled();
    });

    it('non-real-time action (Move): calls handleGameAction only, no setGameState', async () => {
      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player] });

      handleGameAction.mockClear();
      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      const result = renderProvider(gameState, { setGameState: setGameStateMock });

      setGameStateMock.mockClear();

      await act(async () => {
        await result.getContext().onAction(GameAction.Move, { army, x: 1, y: 0 });
      });

      expect(setGameStateMock).not.toHaveBeenCalled();
      expect(handleGameAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: GameAction.Move })
      );
    });
  });

  // --- Auto end-turn effect ---
  describe('Auto end-turn effect', () => {
    it('with no remaining actions: fires 700ms timer and calls setGameState', async () => {
      jest.useFakeTimers();
      hasPlayerRemainingActions.mockReturnValue(false);

      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player], status: 'playing' });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      mockToast.mockClear();
      renderProvider(gameState, { isMyTurn: true, setGameState: setGameStateMock });

      setGameStateMock.mockClear();
      mockToast.mockClear();

      act(() => {
        jest.advanceTimersByTime(700);
      });

      expect(setGameStateMock).toHaveBeenCalledWith(
        expect.any(Object),
        GameAction.EndTurn,
        undefined
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Turn Completed' })
      );

      jest.useRealTimers();
    });

    it('with remaining actions: timer does not fire', async () => {
      jest.useFakeTimers();
      hasPlayerRemainingActions.mockReturnValue(true);

      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player], status: 'playing' });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      renderProvider(gameState, { isMyTurn: true, setGameState: setGameStateMock });

      setGameStateMock.mockClear();

      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(setGameStateMock).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  // --- Turn timer wiring ---
  describe('Turn timer wiring', () => {
    it('advancing 120s on my turn calls setGameState with EndTurn', async () => {
      jest.useFakeTimers();
      hasPlayerRemainingActions.mockReturnValue(true);

      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player], status: 'playing' });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      const result = renderProvider(gameState, { isMyTurn: true, setGameState: setGameStateMock });

      expect(result.getContext().turnTimer).toBeDefined();

      setGameStateMock.mockClear();

      // Simulate 120 second timer expiration
      act(() => {
        jest.advanceTimersByTime(120000);
      });

      expect(setGameStateMock).toHaveBeenCalledWith(
        expect.any(Object),
        GameAction.EndTurn,
        undefined
      );

      jest.useRealTimers();
    });
  });

  // --- Context identity ---
  describe('Context identity (rerender with identical props)', () => {
    it('keeps handlers reference-equal across rerenders with identical props', () => {
      const { render: rtlRender } = require('@testing-library/react');

      const army: Army = { id: 1, position: { x: 0, y: 0 }, hasActed: false };
      const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
      const gameState = buildGameState({ players: [player] });

      const setGameStateMock = jest.fn().mockResolvedValue(undefined);
      const onExitMock = jest.fn();

      // Helper spy component to capture context
      let latestContext: any;
      function IdentityTestSpy() {
        const context = useGameBoard();
        latestContext = context;
        return null;
      }

      // First render
      const result = rtlRender(
        <GameBoardProvider
          gameId="game_test"
          playerId={player.playerId}
          serverGameState={gameState}
          localPlayerFromServer={player}
          isMyTurn
          isHost
          setGameState={setGameStateMock}
          onExit={onExitMock}
        >
          <IdentityTestSpy />
        </GameBoardProvider>
      );

      const {
        onAction: onAction1,
        onLocalAction: onLocalAction1,
        handleTileClick: handleTileClick1,
        handleStartGame: handleStartGame1,
        handleExitClick: handleExitClick1,
      } = latestContext;

      // Rerender with identical props
      result.rerender(
        <GameBoardProvider
          gameId="game_test"
          playerId={player.playerId}
          serverGameState={gameState}
          localPlayerFromServer={player}
          isMyTurn
          isHost
          setGameState={setGameStateMock}
          onExit={onExitMock}
        >
          <IdentityTestSpy />
        </GameBoardProvider>
      );

      const {
        onAction: onAction2,
        onLocalAction: onLocalAction2,
        handleTileClick: handleTileClick2,
        handleStartGame: handleStartGame2,
        handleExitClick: handleExitClick2,
      } = latestContext;

      // Handlers should maintain reference equality
      expect(onAction2).toBe(onAction1);
      expect(onLocalAction2).toBe(onLocalAction1);
      expect(handleTileClick2).toBe(handleTileClick1);
      expect(handleStartGame2).toBe(handleStartGame1);
      expect(handleExitClick2).toBe(handleExitClick1);
    });
  });
});
