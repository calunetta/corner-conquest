import { toCardUseLogEntry } from './CardPlaySandbox.map';
import { SANDBOX_STARTING_HAND } from './CardPlaySandbox.fixtures';
import type { SandboxGame, SandboxGameAction } from './CardPlaySandbox.types';

function removeOneCopy(cards: SandboxGame['cards'], cardName: SandboxGame['cards'][number]) {
  const index = cards.indexOf(cardName);
  if (index === -1) return cards;
  return [...cards.slice(0, index), ...cards.slice(index + 1)];
}

export function sandboxGameReducer(game: SandboxGame, action: SandboxGameAction): SandboxGame {
  switch (action.type) {
    case 'use-card':
      return {
        ...game,
        cards: removeOneCopy(game.cards, action.cardName),
        hasUsedCard: true,
        log: [...game.log, toCardUseLogEntry(action.cardName, game.turn)],
      };
    case 'log-combat-card':
      return { ...game, log: [...game.log, toCardUseLogEntry(action.cardName, game.turn)] };
    case 'next-turn':
      return { ...game, turn: game.turn + 1, cards: SANDBOX_STARTING_HAND, hasUsedCard: false };
  }
}
