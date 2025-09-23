
import type { GameState, Player, ResourceType, ActionHandlerResult, CardName, Army } from '@/lib/types';
import { checkAndEndTurnIfNoActions } from './player';
import { GameAction, AbilityName, MAP_COLS } from '../types';

export function handleBuyCardAction(state: GameState): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, specialCardsDeck, discardPile, debugMode } = newState;
    const player = players[currentPlayerIndex];
    const HAND_LIMIT = 7;

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

export const handleUseCard = (state: GameState, payload: { cardName: CardName, army?: Army }): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex, discardPile } = newState;
    const player = players[currentPlayerIndex];
    const { cardName, army } = payload;

    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);
    if (!canUseCard) throw new Error("You can only use one card per turn.");
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
    
    newState.log.push(`${player.name} is using the '${cardName}' card.`);
    
    switch (cardName) {
        case 'Extra Move':
            player.hasExtraMove = true;
            newState.log.push(`${player.name} activated 'Extra Move'. One army can move again this turn.`);
            break;
        case 'Reinforce':
            player.reinforceActive = true;
            newState.log.push(`${player.name} activated 'Reinforce'. Their next deployment is free.`);
            break;
        case 'Efficient':
            player.efficientActive = true;
            newState.log.push(`${player.name} activated 'Efficient'. Their next deployment costs 50% less.`);
            break;
        case 'Master Builder':
            player.masterBuilderActive = true;
            newState.log.push(`${player.name} activated 'Master Builder'. Their next upgrade costs 50% less.`);
            break;
        case 'Sabotage':
             newState.sabotageDialogState = { isOpen: true };
             break;
        case 'Steal Resource':
             newState.stealResourceDialogState = { isOpen: true };
             break;
        case 'Wealthy':
             newState.wealthyDialogState = { isOpen: true };
             break;
        case 'Teleport':
        case 'Scout':
            // The card is only consumed when the action completes via a shared action (e.g., Move)
            break;
        default:
            throw new Error(`The card "${cardName}" does not have a defined use action.`);
    }

    // Mark the card as used for the turn
    player.actionsThisTurn.push(GameAction.UseCard);

    // Some cards are consumed immediately without a follow-up action.
    const immediateConsumeCards: CardName[] = ['Extra Move', 'Reinforce', 'Efficient', 'Master Builder'];
    if (immediateConsumeCards.includes(cardName)) {
        const cIndex = player.specialCards.indexOf(cardName);
        if(cIndex > -1) {
            discardPile.push(player.specialCards.splice(cIndex, 1)[0]);
        }
    }

    return newState;
};

export function handleUseProductiveCard(state: GameState, selectedResource: ResourceType | null): GameState {
    let newState = { ...state };
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


    newState.productiveCardDialogState = null;
    return newState;
}

export function handleSabotagePlayer(state: GameState, targetPlayerId: number): GameState {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        targetPlayer.isSabotaged = true;
        newState.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
        
        const cardIndex = player.specialCards.indexOf('Sabotage');
        if (cardIndex > -1) {
            newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
    }

    newState.sabotageDialogState = null;
    return newState;
}

export function handleGainWealth(state: GameState, resource: ResourceType): GameState {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    player.resources[resource] += 5;
    newState.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    
    const cardIndex = player.specialCards.indexOf('Wealthy');
    if (cardIndex > -1) {
        newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
    }

    newState.wealthyDialogState = null;
    return newState;
}

export const handleStealResource = (state: GameState, payload: { targetPlayerId: number; resource: ResourceType }): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === payload.targetPlayerId);

    if (!targetPlayer) {
        newState.stealResourceDialogState = null;
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
        newState.discardPile.push(currentPlayer.specialCards.splice(cardIndex, 1)[0]);
    }

    newState.stealResourceDialogState = null;
    return newState;
};

export function handleBuyAbility(state: GameState, abilityName: AbilityName): GameState {
    let newState = { ...state };
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


export function handleRollOnSpecialIsland(state: GameState): GameState {
  let newState = { ...state };
  const player = newState.players[newState.currentPlayerIndex];
  const HAND_LIMIT = 7;

  if (!newState.specialIslandRollDialogState) return newState;

  const roll = Math.floor(Math.random() * 6) + 1;
  let cardDrawn: CardName | null = null;

  if (roll === 3 || roll === 6) {
    if (player.specialCards.length >= HAND_LIMIT && !newState.debugMode) {
      newState.log.push(`${player.name} was lucky, but their hand is full!`);
    } else {
      if (newState.specialCardsDeck.length === 0 && newState.discardPile.length > 0) {
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

  newState.specialIslandRollDialogState = { isOpen: true, roll, cardDrawn };
  return newState;
}

export function handleCloseSpecialIslandDialog(state: GameState): GameState {
  return { ...state, specialIslandRollDialogState: null };
}
