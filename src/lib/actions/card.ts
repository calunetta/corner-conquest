
import type { GameState, Player, ResourceType, ActionHandlerResult, CardName, Army } from '@/lib/types';
import { GameAction, AbilityName, HAND_LIMIT, ResourceType as ResourceTypeEnum } from '../types';

export function handleBuyCardAction(state: GameState): GameState {
    const { players, currentPlayerIndex, debugMode } = state;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes(GameAction.BuyCard)) throw new Error("You can only buy one card per turn.");
    if (player.resources.gems < 10) throw new Error("Not enough gems to buy a card.");
    if (player.specialCards.length >= HAND_LIMIT && !debugMode) {
        state.log.push(`${player.name} tried to buy a card, but their hand is full!`);
        return state;
    }
    if (state.specialCardsDeck.length === 0 && state.discardPile.length === 0) {
        state.log.push(`${player.name} tried to buy a card, but there are none left!`);
        return state;
    }

    if (state.specialCardsDeck.length === 0 && state.discardPile.length > 0) {
        state.log.push("The deck is empty. Reshuffling the discard pile...");
        const newDeck = [...state.discardPile];
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        state.specialCardsDeck = newDeck;
        state.discardPile = [];
    }

    if (state.specialCardsDeck.length === 0) {
        state.log.push(`${player.name} tried to buy a card, but no cards could be drawn.`);
        return state;
    }

    player.resources.gems -= 10;
    const cardIndex = Math.floor(Math.random() * state.specialCardsDeck.length);
    const drawnCard = state.specialCardsDeck.splice(cardIndex, 1)[0];
    player.specialCards.push(drawnCard);
    player.actionsThisTurn.push(GameAction.BuyCard);
    state.log.push(`${player.name} bought a special card: "${drawnCard}"!`);

    return state;
}

export const handleUseCard = (state: GameState, payload: { cardName: CardName, isScout?: boolean }): GameState => {
    const { players, currentPlayerIndex, discardPile } = state;
    const player = players[currentPlayerIndex];
    const { cardName, isScout } = payload;
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
    if (player.actionsThisTurn.includes(GameAction.UseCard)) throw new Error("You can only use one card per turn.");
    
    // Defer consuming the card action for cards that have a follow-up step
    const immediateEffectCards: CardName[] = ['Reinforce', 'Efficient', 'Master Builder'];
    if (immediateEffectCards.includes(cardName)) {
        if (cardName === 'Reinforce') player.reinforceActive = true;
        if (cardName === 'Efficient') player.efficientActive = true;
        if (cardName === 'Master Builder') player.masterBuilderActive = true;
        state.log.push(`${player.name} activated '${cardName}'.`);
    } else if (cardName === 'Extra Move') {
        player.hasExtraMove = true;
        player.actionsThisTurn.push(GameAction.UseCard);
        const usedCard = player.specialCards.splice(cardIndex, 1)[0];
        discardPile.push(usedCard);
        state.log.push(`${player.name} used 'Extra Move'.`);
    } else if (isScout) {
        player.actionsThisTurn.push(GameAction.UseCard);
        state.log.push(`${player.name} used the '${cardName}' card to scout ahead.`);
        const usedCard = player.specialCards.splice(cardIndex, 1)[0];
        discardPile.push(usedCard);
    }
    
    return state;
};

export function handleUseProductiveCard(state: GameState, selectedResource: ResourceType | null): GameState {
    const player = state.players[state.currentPlayerIndex];
    let collectedResources: Record<string, number> = {};
    let doubledResourceString = '';

    if (selectedResource) {
        player.actionsThisTurn.push(GameAction.UseCard);
        const cardIndex = player.specialCards.indexOf('Productive');
        if (cardIndex > -1) {
            state.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
    }

    player.positions.forEach(pos => {
        const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
        const resourceSpot = tile?.resources.find(r => r.type === pos.resource);
        if (resourceSpot) {
            let amount = resourceSpot.amount;
            if (pos.resource === selectedResource) {
                amount *= 2;
                doubledResourceString = ` (doubled ${pos.resource})`;
            }
            player.resources[resourceSpot.type] += amount;
            collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + amount;
        }
    });

    const collectedStrings = Object.entries(collectedResources).map(([type, amount]) => `${amount} ${type}`);
    if (collectedStrings.length > 0) {
        state.log.push(`${player.name} collected ${collectedStrings.join(', ')}${doubledResourceString}.`);
    }

    player.positions.forEach(pos => {
        const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
        if (tile && tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === pos.resource));
        }
    });
    player.positions = [];
    
    state.productiveDialogState = null;
    return state;
}

export function handleSabotagePlayer(state: GameState, targetPlayerId: number): GameState {
    const player = state.players[state.currentPlayerIndex];
    const targetPlayer = state.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        targetPlayer.isSabotaged = true;
        state.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
        
        player.actionsThisTurn.push(GameAction.UseCard);
        const cardIndex = player.specialCards.indexOf('Sabotage');
        if (cardIndex > -1) {
            state.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
    }
    return state;
}

export function handleGainWealth(state: GameState, resource: ResourceType): GameState {
    const player = state.players[state.currentPlayerIndex];
    
    const validResources = [ResourceTypeEnum.Gems, ResourceTypeEnum.Iron, ResourceTypeEnum.Wheat];
    if (!validResources.includes(resource)) {
        throw new Error(`Invalid resource type: ${resource}`);
    }

    player.resources[resource] = (player.resources[resource] || 0) + 5;
    state.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    
    player.actionsThisTurn.push(GameAction.UseCard);
    const cardIndex = player.specialCards.indexOf('Wealthy');
    if (cardIndex > -1) {
        state.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
    }

    return state;
}

export const handleStealResource = (state: GameState, payload: { targetPlayerId: number; resource: ResourceType }): GameState => {
    const { players, currentPlayerIndex } = state;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === payload.targetPlayerId);

    if (!targetPlayer) {
        return state;
    }
    
    const availableAmount = targetPlayer.resources[payload.resource] || 0;
    const stolenAmount = Math.min(availableAmount, 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[payload.resource] -= stolenAmount;
        currentPlayer.resources[payload.resource] = (currentPlayer.resources[payload.resource] || 0) + stolenAmount;
        state.log.push(`${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!`);
    } else {
        state.log.push(`${currentPlayer.name} tried to steal ${payload.resource} from ${targetPlayer.name}, but they had none.`);
    }

    currentPlayer.actionsThisTurn.push(GameAction.UseCard);
    const cardIndex = currentPlayer.specialCards.indexOf('Steal Resource');
    if (cardIndex > -1) {
        state.discardPile.push(currentPlayer.specialCards.splice(cardIndex, 1)[0]);
    }

    return state;
};

export function handleBuyAbility(state: GameState, abilityName: AbilityName): GameState {
    const player = state.players[state.currentPlayerIndex];
    const cost = state.settings.abilityCost;

    if (player.resources.gems < cost) {
        throw new Error("Not enough gems to buy this ability.");
    }
    if (player.passiveAbilities[abilityName]) {
        throw new Error("You already have this ability.");
    }
    if (!state.settings.availableAbilities.includes(abilityName)) {
        throw new Error("This ability is not available in this match.");
    }

    player.resources.gems -= cost;
    player.passiveAbilities[abilityName] = true;
    state.log.push(`${player.name} has acquired the '${abilityName.charAt(0).toUpperCase() + abilityName.slice(1)}' passive ability!`);

    return state;
}

export function handleRollOnSpecialIsland(state: GameState, payload?: { roll?: number }): GameState {
  const player = state.players[state.currentPlayerIndex];

  const roll = payload?.roll ?? (Math.floor(Math.random() * 6) + 1);
  let cardDrawn: CardName | null = null;

  if (roll === 3 || roll === 6) {
    if (player.specialCards.length >= HAND_LIMIT && !state.debugMode) {
      state.log.push(`${player.name} was lucky, but their hand is full!`);
    } else if (state.specialCardsDeck.length > 0 || state.discardPile.length > 0) {
      if (state.specialCardsDeck.length === 0) {
        state.log.push("The deck is empty. Reshuffling the discard pile...");
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
          state.log.push(`${player.name} rolled a ${roll} and found a card: "${cardDrawn}"!`);
      }
    } else {
        state.log.push(`${player.name} rolled a ${roll} but the deck is completely empty!`);
    }
  } else {
    state.log.push(`${player.name} rolled a ${roll} and found nothing.`);
  }

  return state;
}

export function handleCloseSpecialIslandDialog(state: GameState): GameState {
  return state;
}

export function handleScoutAction(state: GameState, x: number, y: number): GameState {
    const player = state.players[state.currentPlayerIndex];
    const tileId = `${x}-${y}`;

    if (!player.revealedTiles.includes(tileId)) {
        player.revealedTiles.push(tileId);
    }
    return state;
}
