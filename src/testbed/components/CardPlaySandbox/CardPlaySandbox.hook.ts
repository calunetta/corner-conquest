import { useCallback, useMemo, useReducer } from 'react';
import type { CardName } from '@/lib/types';
import { toSelectionPlay, useCardPlayTrigger } from '@/modules/cards';
import { gameBoardReducer, initialUIState, isCardPlayBlocked } from '@/modules/game-board';
import {
  SANDBOX_INITIAL_GAME,
  SANDBOX_LOCAL_PLAYER_ID,
  SANDBOX_OPPONENTS,
} from './CardPlaySandbox.fixtures';
import { toFollowUpDialogAction, toPendingActionForCard, toSandboxPlayer } from './CardPlaySandbox.map';
import { sandboxGameReducer } from './CardPlaySandbox.reducer';
import type { CardPlaySandboxState } from './CardPlaySandbox.types';

/** Any rolled value shows the dialog's result state. */
const FOUND_CARD_ROLL = 6;
const NO_COMBAT = { combatState: null, monsterCombatState: null, productiveDialogState: null };

export function useCardPlaySandbox(): CardPlaySandboxState {
  const [uiState, dispatchUi] = useReducer(gameBoardReducer, initialUIState);
  const [game, dispatchGame] = useReducer(sandboxGameReducer, SANDBOX_INITIAL_GAME);

  const isBlocked = isCardPlayBlocked(uiState, NO_COMBAT);
  const { play, endPlay } = useCardPlayTrigger({
    log: game.log,
    localPlayerId: SANDBOX_LOCAL_PLAYER_ID,
    isBlocked,
    selectionPlay: toSelectionPlay(uiState.pendingAction, game.turn),
    foundCard: uiState.dialogs.specialIslandRoll?.cardDrawn ?? null,
  });

  const localPlayer = useMemo(
    () => toSandboxPlayer(game.cards, game.hasUsedCard),
    [game.cards, game.hasUsedCard],
  );

  const handleOpenCards = useCallback(() => dispatchUi({ type: 'TOGGLE_CARDS_DIALOG', playerId: 0 }), []);
  const handleCloseCards = useCallback(() => dispatchUi({ type: 'TOGGLE_CARDS_DIALOG', playerId: null }), []);

  const clearPendingStep = useCallback(() => {
    dispatchUi({ type: 'SET_SABOTAGE_DIALOG', state: null });
    dispatchUi({ type: 'SET_WEALTHY_DIALOG', state: null });
    dispatchUi({ type: 'SET_STEAL_RESOURCE_DIALOG', state: null });
    dispatchUi({ type: 'SET_PENDING_ACTION', pendingAction: null });
  }, []);

  const handleUseCard = useCallback((cardName: CardName) => {
    dispatchUi({ type: 'TOGGLE_CARDS_DIALOG', playerId: null });
    const pendingAction = toPendingActionForCard(cardName);
    if (!pendingAction) {
      dispatchGame({ type: 'use-card', cardName });
      return;
    }
    dispatchUi({ type: 'SET_PENDING_ACTION', pendingAction });
    const followUp = toFollowUpDialogAction(cardName);
    if (followUp) dispatchUi(followUp);
  }, []);

  const handleResolveCard = useCallback(() => {
    const cardName = uiState.pendingAction?.cardName;
    if (cardName === undefined) return;
    dispatchGame({ type: 'use-card', cardName });
    clearPendingStep();
  }, [uiState.pendingAction, clearPendingStep]);

  const handleLogCombatCard = useCallback(
    (cardName: CardName) => dispatchGame({ type: 'log-combat-card', cardName }),
    [],
  );

  const handleNextTurn = useCallback(() => {
    dispatchGame({ type: 'next-turn' });
    clearPendingStep();
  }, [clearPendingStep]);

  const handleFindCard = useCallback(
    (cardName: CardName) =>
      dispatchUi({
        type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG',
        state: { isOpen: true, roll: FOUND_CARD_ROLL, cardDrawn: cardName, x: 0, y: 0 },
      }),
    [],
  );
  const handleCloseFoundCard = useCallback(
    () => dispatchUi({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: null }),
    [],
  );

  return {
    localPlayer,
    opponents: SANDBOX_OPPONENTS,
    uiState,
    game,
    isBlocked,
    play,
    endPlay,
    handleOpenCards,
    handleCloseCards,
    handleUseCard,
    handleResolveCard,
    handleCancelCard: clearPendingStep,
    handleLogCombatCard,
    handleNextTurn,
    handleFindCard,
    handleCloseFoundCard,
  };
}
