import { renderHook, act } from '@testing-library/react';
import { PlayerColor, CardName, GameAction } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';
import {
  addPlayerToGame,
  defaultGameSettings,
  handleGameAction,
  initializeGame,
  startGame,
} from '@/modules/game-rules';
import { useCardActions } from './game-board.card-actions.hook';
import { useLocalActions } from './game-board.local-actions.hook';
import type { OnAction, ToastFn, UIDispatch } from './game-board.hook.types';
import type { GameBoardUIState } from './game-board.types';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Local Actions Test',
    2,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  game = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' }).newGameState!;
  return startGame(game, 'Player 1');
}

function buildUiState(overrides: Partial<GameBoardUIState> = {}): GameBoardUIState {
  return {
    selectedArmyId: 0,
    possibleMoves: [],
    pendingAction: null,
    ...overrides,
  } as unknown as GameBoardUIState;
}

/** Renders useLocalActions with the real useCardActions wired in, the same way the board wires them. */
function renderLocalActions(options: {
  game: GameState;
  uiState: GameBoardUIState;
  localPlayer: Player;
  isMyTurn?: boolean;
  onAction?: OnAction;
  dispatch?: UIDispatch;
}) {
  const dispatch = options.dispatch ?? (jest.fn() as unknown as UIDispatch);
  const onAction = options.onAction ?? (jest.fn() as unknown as OnAction);
  const toast = jest.fn() as unknown as ToastFn;
  const { game, uiState, localPlayer, isMyTurn = true } = options;

  return renderHook(() => {
    const cardActions = useCardActions({
      localGameState: game,
      setLocalGameState: jest.fn(),
      localPlayer,
      uiState,
      dispatch,
      onAction,
      toast,
    });
    return useLocalActions({
      localGameState: game,
      gameStateForDisplay: game,
      localPlayer,
      isMyTurn,
      uiState,
      dispatch,
      onAction,
      toast,
      handleCancelAction: cardActions.handleCancelAction,
      handleUseCard: cardActions.handleUseCard,
    });
  });
}

describe('useLocalActions: local_DeselectArmy', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('clears the selected army and does not cancel anything when no card action is pending (empty input)', () => {
    const dispatch = jest.fn() as unknown as UIDispatch;
    const onAction = jest.fn() as unknown as OnAction;
    const { result } = renderLocalActions({
      game,
      uiState: buildUiState(),
      localPlayer: game.players[0],
      dispatch,
      onAction,
    });

    act(() => result.current(GameAction.local_DeselectArmy));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_ARMY', armyId: null });
    expect(onAction).not.toHaveBeenCalled();
  });

  it('clears the selected army and does nothing else when it is not the local player turn (boundary)', () => {
    const dispatch = jest.fn() as unknown as UIDispatch;
    const onAction = jest.fn() as unknown as OnAction;
    const localPlayer = { ...game.players[0], reinforceActive: true };
    const { result } = renderLocalActions({
      game: { ...game, players: [localPlayer, game.players[1]] },
      uiState: buildUiState(),
      localPlayer,
      isMyTurn: false,
      dispatch,
      onAction,
    });

    act(() => result.current(GameAction.local_DeselectArmy));

    expect(dispatch).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it.each([
    ['a pending Teleport pendingAction', { pendingAction: { type: 'teleport', cardName: CardName.Teleport } }, {}, CardName.Teleport],
    ['an active Reinforce flag', {}, { reinforceActive: true }, CardName.Reinforce],
    ['an active Efficient flag', {}, { efficientActive: true }, CardName.Efficient],
    ['an active Master Builder flag', {}, { masterBuilderActive: true }, CardName.MasterBuilder],
    ['an active Extra Move flag', {}, { hasExtraMove: true }, CardName.ExtraMove],
  ])(
    'cancels the pending card action when there is %s, and still deselects the army',
    (_label, uiOverrides, playerOverrides, expectedCard) => {
      const dispatch = jest.fn() as unknown as UIDispatch;
      const onAction = jest.fn() as unknown as OnAction;
      const localPlayer = { ...game.players[0], ...playerOverrides };
      const { result } = renderLocalActions({
        game: { ...game, players: [localPlayer, game.players[1]] },
        uiState: buildUiState(uiOverrides as Partial<GameBoardUIState>),
        localPlayer,
        dispatch,
        onAction,
      });

      act(() => result.current(GameAction.local_DeselectArmy));

      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_ARMY', armyId: null });
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PENDING_ACTION', pendingAction: null });
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith(GameAction.CancelAction, { cardName: expectedCard });
    },
  );

  it('refunds an in-progress Extra Move: card returns to hand, flag clears, UseCard is removed from actionsThisTurn', () => {
    game.players[0].specialCards = [CardName.ExtraMove];
    const afterUse = handleGameAction({
      action: GameAction.UseCard,
      gameState: game,
      payload: { cardName: CardName.ExtraMove },
    }).state!;
    const localPlayer = afterUse.players[0];
    expect(localPlayer.hasExtraMove).toBe(true); // sanity: the card action really is in progress
    let serverState = afterUse;
    const onAction = jest.fn((action: GameAction, payload?: unknown) => {
      serverState = handleGameAction({ action, gameState: serverState, payload }).state!;
    }) as unknown as OnAction;

    const { result } = renderLocalActions({ game: afterUse, uiState: buildUiState(), localPlayer, onAction });
    act(() => result.current(GameAction.local_DeselectArmy));

    const refunded = serverState.players[0];
    expect(refunded.specialCards).toContain(CardName.ExtraMove);
    expect(serverState.discardPile).not.toContain(CardName.ExtraMove);
    expect(refunded.hasExtraMove).toBe(false);
    expect(refunded.actionsThisTurn).not.toContain(GameAction.UseCard);
  });

  it('un-scouts the revealed tiles of an in-progress Scout pendingAction', () => {
    const scouting = buildGame();
    const player = scouting.players[0];
    player.specialCards = player.specialCards.filter((c) => c !== CardName.Scout);
    player.actionsThisTurn.push(GameAction.UseCard);
    player.revealedTiles = ['0-0', '1-1'];
    scouting.discardPile.push(CardName.Scout);
    let serverState = scouting;
    const onAction = jest.fn((action: GameAction, payload?: unknown) => {
      serverState = handleGameAction({ action, gameState: serverState, payload }).state!;
    }) as unknown as OnAction;
    const uiState = buildUiState({
      pendingAction: { type: 'scout', cardName: CardName.Scout, count: 1, scoutedTiles: ['1-1'] },
    });

    const { result } = renderLocalActions({ game: scouting, uiState, localPlayer: player, onAction });
    act(() => result.current(GameAction.local_DeselectArmy));

    expect(serverState.players[0].revealedTiles).toEqual(['0-0']);
    expect(serverState.players[0].specialCards).toContain(CardName.Scout);
    expect(serverState.discardPile).not.toContain(CardName.Scout);
  });
});
