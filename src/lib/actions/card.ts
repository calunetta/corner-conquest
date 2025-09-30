
import type { GameState, Player, ResourceType, ActionHandlerResult, CardName, Army } from '@/lib/types';
import { GameAction, AbilityName, MAP_COLS, HAND_LIMIT } from '../types';

export function handleBuyCardAction(state: GameState): GameState {
    const { players, currentPlayerIndex, specialCardsDeck, discardPile, debugMode } = state;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes(GameAction.BuyCard)) throw new Error("You can only buy one card per turn.");
    if (player.resources.gems < 10) throw new Error("Not enough gems to buy a card.");
    if (player.specialCards.length >= HAND_LIMIT && !debugMode) {
        state.log.push(`${player.name} tried to buy a card, but their hand is full!`);
        return state;
    }
    if (specialCardsDeck.length === 0 && discardPile.length === 0) {
        state.log.push(`${player.name} tried to buy a card, but there are none left!`);
        return state;
    }

    if (specialCardsDeck.length === 0) {
        state.log.push("The deck is empty. Reshuffling the discard pile...");
        for (let i = discardPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [discardPile[i], discardPile[j]] = [discardPile[j], discardPile[i]];
        }
        state.specialCardsDeck = [...discardPile];
        state.discardPile = [];
    }

    player.resources.gems -= 10;
    const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
    const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
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
    
    // Defer consuming the card action for cards that have a follow-up step
    const immediateEffectCards: CardName[] = ['Extra Move', 'Reinforce', 'Efficient', 'Master Builder'];
    if (immediateEffectCards.includes(cardName)) {
        player.actionsThisTurn.push(GameAction.UseCard);
        player.hasExtraMove = cardName === 'Extra Move';
        player.reinforceActive = cardName === 'Reinforce';
        player.efficientActive = cardName === 'Efficient';
        player.masterBuilderActive = cardName === 'Master Builder';
        state.log.push(`${player.name} activated '${cardName}'.`);
        
        // Extra Move is consumed on activation, others on use.
        if (cardName === 'Extra Move') {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
        }
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
        const tile = state.map[pos.y * MAP_COLS + pos.x];
        const resourceSpot = tile.resources.find(r => r.type === pos.resource);
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
        const tile = state.map[pos.y * MAP_COLS + pos.x];
        if (tile && tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === pos.resource));
        }
    });
    player.positions = [];

    if (player.dialogState?.productiveCard) {
        player.dialogState.productiveCard = null;
    }
    
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
    
    player.resources[resource] += 5;
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
    
    const stolenAmount = Math.min(targetPlayer.resources[payload.resource], 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[payload.resource] -= stolenAmount;
        currentPlayer.resources[payload.resource] += stolenAmount;
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


export function handleRollOnSpecialIsland(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];

  const roll = Math.floor(Math.random() * 6) + 1;
  let cardDrawn: CardName | null = null;

  if (roll === 3 || roll === 6) {
    if (player.specialCards.length >= HAND_LIMIT && !state.debugMode) {
      state.log.push(`${player.name} was lucky, but their hand is full!`);
    } else if (state.specialCardsDeck.length > 0 || state.discardPile.length > 0) {
      if (state.specialCardsDeck.length === 0) {
        state.log.push("The deck is empty. Reshuffling the discard pile...");
        state.specialCardsDeck = [...state.discardPile];
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
  
  if(player.dialogState) {
      player.dialogState.specialIslandRoll = { isOpen: true, roll, cardDrawn };
  } else {
      player.dialogState = { specialIslandRoll: { isOpen: true, roll, cardDrawn } };
  }

  return state;
}

export function handleCloseSpecialIslandDialog(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  if(player.dialogState?.specialIslandRoll) {
      player.dialogState.specialIslandRoll = null;
  }
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
