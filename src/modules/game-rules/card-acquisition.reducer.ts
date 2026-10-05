import type { AbilityName, CardName, GameState } from '@/lib/types';
import { GameAction, HAND_LIMIT } from '@/lib/types';
import { pushLogEntry } from './log-entry';

/** Spends 10 gold to draw a special card, reshuffling the discard pile into the deck if it's empty. */
export function handleBuyCardAction(state: GameState): GameState {
  const { players, currentPlayerIndex, debugMode } = state;
  const player = players[currentPlayerIndex];

  if (player.actionsThisTurn.includes(GameAction.BuyCard)) throw new Error('You can only buy one card per turn.');
  if (player.resources.gold < 10) throw new Error('Not enough gold to buy a card.');
  if (player.specialCards.length >= HAND_LIMIT && !debugMode) {
    pushLogEntry(state, {
      category: 'cards',
      message: `${player.name} tried to buy a card, but their hand was full.`,
      playerId: player.playerId,
    });
    return state;
  }
  if (state.specialCardsDeck.length === 0 && state.discardPile.length === 0) {
    pushLogEntry(state, {
      category: 'cards',
      message: `${player.name} tried to buy a card, but there are none left!`,
      playerId: player.playerId,
    });
    return state;
  }

  if (state.specialCardsDeck.length === 0 && state.discardPile.length > 0) {
    pushLogEntry(state, {
      category: 'cards',
      message: 'The deck ran out; reshuffled the discard pile.',
      playerId: player.playerId,
    });
    const newDeck = [...state.discardPile];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    state.specialCardsDeck = newDeck;
    state.discardPile = [];
  }

  if (state.specialCardsDeck.length === 0) {
    pushLogEntry(state, {
      category: 'cards',
      message: `${player.name} tried to buy a card, but no cards could be drawn.`,
      playerId: player.playerId,
    });
    return state;
  }

  player.resources.gold -= 10;
  const cardIndex = Math.floor(Math.random() * state.specialCardsDeck.length);
  const drawnCard = state.specialCardsDeck.splice(cardIndex, 1)[0];
  player.specialCards.push(drawnCard);
  player.actionsThisTurn.push(GameAction.BuyCard);
  pushLogEntry(state, {
    category: 'cards',
    message: `${player.name} bought a special card: "${drawnCard}"!`,
    playerId: player.playerId,
  });

  return state;
}

/** Spends gold for a passive ability (Explorer/Collector); throws if already owned or unavailable this match. */
export function handleBuyAbility(state: GameState, abilityName: AbilityName): GameState {
  const player = state.players[state.currentPlayerIndex];
  const cost = state.settings.abilityCost;

  if (player.resources.gold < cost) throw new Error('Not enough gold to buy this ability.');
  if (player.passiveAbilities[abilityName]) throw new Error('You already have this ability.');
  if (!state.settings.availableAbilities.includes(abilityName)) {
    throw new Error('This ability is not available in this match.');
  }

  player.resources.gold -= cost;
  player.passiveAbilities[abilityName] = true;
  pushLogEntry(state, {
    category: 'cards',
    message: `${player.name} has acquired the '${abilityName.charAt(0).toUpperCase() + abilityName.slice(1)}' passive ability!`,
    playerId: player.playerId,
  });

  return state;
}

/** Rolls for a bonus card on a special island tile; a 3 or 6 draws, reshuffling the discard pile if needed. */
export function handleRollOnSpecialIsland(state: GameState, payload?: { roll?: number }): GameState {
  const player = state.players[state.currentPlayerIndex];

  const roll = payload?.roll ?? Math.floor(Math.random() * 6) + 1;
  let cardDrawn: CardName | null = null;

  if (roll === 3 || roll === 6) {
    if (player.specialCards.length >= HAND_LIMIT && !state.debugMode) {
      pushLogEntry(state, {
        category: 'cards',
        message: `${player.name} was lucky, but their hand is full!`,
        playerId: player.playerId,
      });
    } else if (state.specialCardsDeck.length > 0 || state.discardPile.length > 0) {
      if (state.specialCardsDeck.length === 0) {
        pushLogEntry(state, {
          category: 'cards',
          message: 'The deck is empty. Reshuffling the discard pile...',
          playerId: player.playerId,
        });
        const newDeck = [...state.discardPile];
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        state.specialCardsDeck = newDeck;
        state.discardPile = [];
      }
      if (state.specialCardsDeck.length > 0) {
        const cardIndex = Math.floor(Math.random() * state.specialCardsDeck.length);
        const drawnCardResult = state.specialCardsDeck.splice(cardIndex, 1)[0];
        player.specialCards.push(drawnCardResult);
        cardDrawn = drawnCardResult;
        pushLogEntry(state, {
          category: 'cards',
          message: `${player.name} rolled a ${roll} and found a card: "${cardDrawn}"!`,
          playerId: player.playerId,
        });
      }
    } else {
      pushLogEntry(state, {
        category: 'cards',
        message: `${player.name} rolled a ${roll} but the deck is completely empty!`,
        playerId: player.playerId,
      });
    }
  } else {
    pushLogEntry(state, {
      category: 'cards',
      message: `${player.name} rolled a ${roll} and found nothing.`,
      playerId: player.playerId,
    });
  }

  return state;
}

/** No-op close handler for the special-island roll dialog; kept so the dispatcher has one case per dialog. */
export function handleCloseSpecialIslandDialog(state: GameState): GameState {
  return state;
}
