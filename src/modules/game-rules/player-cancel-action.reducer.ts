import type { GameState } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { pushLogEntry } from './log-entry';

/** Cancels an in-progress card action: restores the card to hand, reverts its flag, and un-scouts any tiles. */
export function handleCancelAction(
  state: GameState,
  payload?: { cardName?: CardName; scoutedTiles?: string[] },
): GameState {
  const player = state.players[state.currentPlayerIndex];

  if (payload?.cardName) {
    const { cardName } = payload;
    const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
    if (cardUseIndex > -1) {
      player.actionsThisTurn.splice(cardUseIndex, 1);
    }

    const discardIndex = state.discardPile.indexOf(cardName);
    if (discardIndex > -1) {
      const card = state.discardPile.splice(discardIndex, 1)[0];
      player.specialCards.push(card);
    }

    if (cardName === CardName.ExtraMove) player.hasExtraMove = false;
    if (cardName === CardName.Reinforce) player.reinforceActive = false;
    if (cardName === CardName.Efficient) player.efficientActive = false;
    if (cardName === CardName.MasterBuilder) player.masterBuilderActive = false;

    if (payload.scoutedTiles && Array.isArray(payload.scoutedTiles)) {
      const scoutedTiles = payload.scoutedTiles;
      player.revealedTiles = player.revealedTiles.filter((t) => !scoutedTiles.includes(t));
    }

    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name} cancelled their action with ${cardName}.`,
      playerId: player.playerId,
    });
  }

  return state;
}
