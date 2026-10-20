import type { CardName, LogEntry, Player } from '@/lib/types';
import type { GameBoardUIState } from '@/modules/game-board';
import type { CardPlay } from '@/modules/cards';

export type SandboxVariant = 'desktop' | 'mobile';
export interface CardPlaySandboxProps {
  variant: SandboxVariant;
}

/** Fake match state: no Firestore, no map. */
export interface SandboxGame {
  turn: number;
  /** Cards in hand; a duplicate is one entry per copy. */
  cards: CardName[];
  /** True after a card was consumed this turn (mirrors actionsThisTurn including GameAction.UseCard). */
  hasUsedCard: boolean;
  log: LogEntry[];
}

export type SandboxGameAction =
  | { type: 'use-card'; cardName: CardName } // consume one copy, hasUsedCard = true, append card-use log entry
  | { type: 'log-combat-card'; cardName: CardName } // append entry only; hand and hasUsedCard unchanged
  | { type: 'next-turn' }; // turn + 1, hand = starting hand, hasUsedCard = false, log kept

export interface CardPlaySandboxState {
  localPlayer: Player;
  opponents: Player[];
  uiState: GameBoardUIState;
  game: SandboxGame;
  /** Result of the real isCardPlayBlocked for the current uiState. */
  isBlocked: boolean;
  play: CardPlay | null;
  endPlay: () => void;
  handleOpenCards: () => void;
  handleCloseCards: () => void;
  /** Mirrors GameDialogManager: closes the Cards dialog, then runs the card's first step. */
  handleUseCard: (cardName: CardName) => void;
  /** Sabotage / Wealthy / Steal Resource target chosen, or Teleport / Scout finished: consume card, clear pending and dialogs. */
  handleResolveCard: () => void;
  /** Sabotage / Wealthy / Steal Resource dialog closed, or Teleport / Scout cancelled: clear pending and dialogs, card stays in hand. */
  handleCancelCard: () => void;
  handleLogCombatCard: (cardName: CardName) => void;
  handleNextTurn: () => void;
  /** Opens the special-island dialog already rolled with that card. */
  handleFindCard: (cardName: CardName) => void;
  /** Closes it; the found play starts after this. */
  handleCloseFoundCard: () => void;
}
