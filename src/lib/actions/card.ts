
import type { GameState, Player, ResourceType, ActionHandlerResult, CardName, Army } from '@/lib/types';
import { checkAndEndTurnIfNoActions } from './player';
import { GameAction, AbilityName, MAP_COLS, HAND_LIMIT } from '../types';
import { cloneDeep } from 'lodash';

export function handleBuyCardAction(state: GameState): GameState {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex, specialCardsDeck, discardPile, debugMode } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes(GameAction.BuyCard)) throw new Error("You can only buy one card per turn.");
    if (player.resources.gems < 10) throw new Error("Not enough gems to buy a card.");
    if (specialCardsDeck.length === 0 && discardPile.length === 0) throw new Error("There are no special cards left in the game.");
    if (player.specialCards.length >= HAND_LIMIT && !debugMode) {
        newState.log.push(`${player.name} tried to buy a card, but their hand is full!`);
        return newState;
    }

    if (specialCardsDeck.length === 0) {
        newState.log.push("The deck is empty. Reshuffling the discard pile...");
        for (let i = discardPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [discardPile[i], discardPile[j]] = [discardPile[j], discardPile[i]];
        }
        newState.specialCardsDeck = [...discardPile];
        newState.discardPile = [];
    }

    player.resources.gems -= 10;
    const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
    const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
    player.specialCards.push(drawnCard);
    player.actionsThisTurn.push(GameAction.BuyCard);
    newState.log.push(`${player.name} bought a special card: "${drawnCard}"!`);

    return newState;
}

export const handleUseCard = (state: GameState, payload: { cardName: CardName, isScout?: boolean }): GameState => {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex, discardPile } = newState;
    const player = players[currentPlayerIndex];
    const { cardName, isScout } = payload;

    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);
    if (!canUseCard) throw new Error("You can only use one card per turn.");
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
    
    
    newState.log.push(`${player.name} is using the '${cardName}' card.`);
    
    const immediateConsumeCards: CardName[] = ['Extra Move', 'Reinforce', 'Efficient', 'Master Builder'];
    if (immediateConsumeCards.includes(cardName)) {
        player.actionsThisTurn.push(GameAction.UseCard); // Consume action now
        player.hasExtraMove = cardName === 'Extra Move';
        player.reinforceActive = cardName === 'Reinforce';
        player.efficientActive = cardName === 'Efficient';
        player.masterBuilderActive = cardName === 'Master Builder';
        newState.log.push(`${player.name} activated '${cardName}'.`);
    }

    // Only consume cards that have an immediate, single-turn effect, or after a multi-step action is complete (like scout).
    // Cards that open dialogs (Sabotage, Steal) are consumed in their own handlers.
    // Cards used in combat (Warchief, Overcome) are consumed in combat handlers.
    if (immediateConsumeCards.includes(cardName) || isScout) {
        if (!player.actionsThisTurn.includes(GameAction.UseCard)) {
            player.actionsThisTurn.push(GameAction.UseCard);
        }
        const cIndex = player.specialCards.indexOf(cardName);
        if(cIndex > -1) {
            discardPile.push(player.specialCards.splice(cIndex, 1)[0]);
        }
    }
    
    return newState;
};

export function handleUseProductiveCard(state: GameState, selectedResource: ResourceType | null): GameState {
    let newState = cloneDeep(state);
    const player = newState.players[newState.currentPlayerIndex];
    let collectedResources: Record<string, number> = {};
    let doubledResourceString = '';

    if (selectedResource) {
        player.actionsThisTurn.push(GameAction.UseCard);
        const cardIndex = player.specialCards.indexOf('Productive');
        if (cardIndex > -1) {
            newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
    }

    player.positions.forEach(pos => {
        const tile = newState.map[pos.y * MAP_COLS + pos.x];
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
        newState.log.push(`${player.name} collected ${collectedStrings.join(', ')}${doubledResourceString}.`);
    }

    player.positions.forEach(pos => {
        const tile = newState.map[pos.y * MAP_COLS + pos.x];
        if (tile && tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === pos.resource));
        }
    });
    player.positions = [];

    return newState;
}

export function handleSabotagePlayer(state: GameState, targetPlayerId: number): GameState {
    let newState = cloneDeep(state);
    const player = newState.players[newState.currentPlayerIndex];
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        targetPlayer.isSabotaged = true;
        newState.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
        
        const cardIndex = player.specialCards.indexOf('Sabotage');
        if (cardIndex > -1) {
            player.actionsThisTurn.push(GameAction.UseCard);
            newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
    }
    return newState;
}

export function handleGainWealth(state: GameState, resource: ResourceType): GameState {
    let newState = cloneDeep(state);
    const player = newState.players[newState.currentPlayerIndex];
    
    player.resources[resource] += 5;
    newState.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    
    const cardIndex = player.specialCards.indexOf('Wealthy');
    if (cardIndex > -1) {
        player.actionsThisTurn.push(GameAction.UseCard);
        newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
    }

    return newState;
}

export const handleStealResource = (state: GameState, payload: { targetPlayerId: number; resource: ResourceType }): GameState => {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === payload.targetPlayerId);

    if (!targetPlayer) {
        return newState;
    }
    
    const stolenAmount = Math.min(targetPlayer.resources[payload.resource], 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[payload.resource] -= stolenAmount;
        currentPlayer.resources[payload.resource] += stolenAmount;
        newState.log.push(`${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!`);
    } else {
        newState.log.push(`${currentPlayer.name} tried to steal ${payload.resource} from ${targetPlayer.name}, but they had none.`);
    }

    const cardIndex = currentPlayer.specialCards.indexOf('Steal Resource');
    if (cardIndex > -1) {
        currentPlayer.actionsThisTurn.push(GameAction.UseCard);
        newState.discardPile.push(currentPlayer.specialCards.splice(cardIndex, 1)[0]);
    }

    return newState;
};

export function handleBuyAbility(state: GameState, abilityName: AbilityName): GameState {
    let newState = cloneDeep(state);
    const player = newState.players[newState.currentPlayerIndex];
    const cost = newState.settings.abilityCost;

    if (player.resources.gems < cost) {
        throw new Error("Not enough gems to buy this ability.");
    }
    if (player.passiveAbilities[abilityName]) {
        throw new Error("You already have this ability.");
    }
    if (!newState.settings.availableAbilities.includes(abilityName)) {
        throw new Error("This ability is not available in this match.");
    }

    player.resources.gems -= cost;
    player.passiveAbilities[abilityName] = true;
    newState.log.push(`${player.name} has acquired the '${abilityName.charAt(0).toUpperCase() + abilityName.slice(1)}' passive ability!`);

    return newState;
}


export function handleRollOnSpecialIsland(state: GameState): {state: GameState, cardDrawn: CardName | null, roll: number} {
  let newState = cloneDeep(state);
  const player = newState.players[newState.currentPlayerIndex];

  const roll = Math.floor(Math.random() * 6) + 1;
  let cardDrawn: CardName | null = null;

  if (roll === 3 || roll === 6) {
    if (player.specialCards.length >= HAND_LIMIT && !newState.debugMode) {
      newState.log.push(`${player.name} was lucky, but their hand is full!`);
    } else if (newState.specialCardsDeck.length > 0 || newState.discardPile.length > 0) {
      if (newState.specialCardsDeck.length === 0) {
        newState.log.push("The deck is empty. Reshuffling the discard pile...");
        newState.specialCardsDeck = [...newState.discardPile];
        newState.discardPile = [];
      }
      if (newState.specialCardsDeck.length > 0) {
          const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
          const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
          player.specialCards.push(drawnCard);
          cardDrawn = drawnCard;
          newState.log.push(`${player.name} rolled a ${roll} and found a card: "${drawnCard}"!`);
      }
    }
  } else {
    newState.log.push(`${player.name} rolled a ${roll} and found nothing.`);
  }

  return { state: newState, cardDrawn, roll };
}

export function handleCloseSpecialIslandDialog(state: GameState): GameState {
  let newState = cloneDeep(state);
  return checkAndEndTurnIfNoActions(newState);
}

export function handleScoutAction(state: GameState, x: number, y: number): GameState {
    let newState = cloneDeep(state);
    const player = newState.players[newState.currentPlayerIndex];
    const tileId = `${x}-${y}`;

    if (!player.revealedTiles.includes(tileId)) {
        player.revealedTiles.push(tileId);
        newState.log.push(`${player.name} revealed a tile at (${x},${y}) with Scout.`);
    }
    return newState;
}
