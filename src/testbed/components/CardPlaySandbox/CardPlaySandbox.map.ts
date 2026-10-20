import { GameAction } from '@/lib/types';
import type { CardName, Player, StructuredLogEntry } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import type { GameBoardUIAction } from '@/modules/game-board';
import { buildPlayer } from '@/modules/map/board-context.fixtures';
import { SANDBOX_LOCAL_PLAYER_ID } from './CardPlaySandbox.fixtures';

const SCOUT_TILE_COUNT = 3;

export function toSandboxPlayer(cards: CardName[], hasUsedCard: boolean): Player {
  return buildPlayer({
    id: 0,
    playerId: SANDBOX_LOCAL_PLAYER_ID,
    name: 'You',
    specialCards: cards,
    actionsThisTurn: hasUsedCard ? [GameAction.UseCard] : [],
  });
}

export function toCardUseLogEntry(cardName: CardName, turn: number): StructuredLogEntry {
  return {
    kind: 'structured',
    turn,
    category: 'cards',
    message: `You used '${cardName}'.`,
    playerId: SANDBOX_LOCAL_PLAYER_ID,
    cardName,
  };
}

/** First step of a multi-step card, as the real use-card handler sets it; null for immediate cards. */
export function toPendingActionForCard(cardName: CardName): PendingAction {
  switch (cardName) {
    case 'Teleport':
      return { type: 'teleport', cardName };
    case 'Scout':
      return { type: 'scout', cardName, count: SCOUT_TILE_COUNT, scoutedTiles: [] };
    case 'Sabotage':
    case 'Wealthy':
    case 'Steal Resource':
      // Runtime types missing from the PendingAction union, as in the real hook.
      return { type: cardName.toLowerCase().replace(/ /g, '-'), cardName } as unknown as PendingAction;
    default:
      return null;
  }
}

export function toFollowUpDialogAction(cardName: CardName): GameBoardUIAction | null {
  switch (cardName) {
    case 'Sabotage':
      return { type: 'SET_SABOTAGE_DIALOG', state: { isOpen: true } };
    case 'Wealthy':
      return { type: 'SET_WEALTHY_DIALOG', state: { isOpen: true } };
    case 'Steal Resource':
      return { type: 'SET_STEAL_RESOURCE_DIALOG', state: { isOpen: true } };
    default:
      return null;
  }
}
