

import type { GameState, Player, ResourceType, ActionHandlerResult } from '@/lib/types';
import { checkAndEndTurnIfNoActions } from './player';
import { GameAction, CardName, AbilityName, MAP_COLS } from '../types';

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

export const handleUseCard = (state: GameState, cardName: CardName): ActionHandlerResult => {
    let newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);
    if (!canUseCard) throw new Error("You can only use one card per turn.");
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
    
    newState.log.push(`${player.name} is using the '${cardName}' card.`);
    
    let selectedArmyId = null;

    switch (cardName) {
        case CardName.ExtraMove:
            player.hasExtraMove = true;
            player.actionsThisTurn.push(GameAction.UseCard);
            const emCardIndex = player.specialCards.indexOf(CardName.ExtraMove);
            if (emCardIndex > -1) newState.discardPile.push(player.specialCards.splice(emCardIndex, 1)[0]);
            newState.log.push(`${player.name} activated 'Extra Move'. One army can move again this turn.`);
            return { newState, selectedArmyId: null };
        case CardName.Teleport:
            newState.teleportState = { armyId: null, cardName: CardName.Teleport };
            break;
        case CardName.Scout:
            newState.scoutingState = { count: 3, cardName: CardName.Scout };
            newState.log.push(`${player.name} activated 'Scout'. Click 3 hidden tiles to reveal them.`);
            break;
        case CardName.Reinforce:
            player.reinforceActive = true;
            player.actionsThisTurn.push(GameAction.UseCard);
            const rCardIndex = player.specialCards.indexOf(CardName.Reinforce);
            if (rCardIndex > -1) newState.discardPile.push(player.specialCards.splice(rCardIndex, 1)[0]);
            newState.log.push(`${player.name} activated 'Reinforce'. Their next deployment is free.`);
            break;
        case CardName.Efficient:
            player.efficientActive = true;
            player.actionsThisTurn.push(GameAction.UseCard);
            const eCardIndex = player.specialCards.indexOf(CardName.Efficient);
            if (eCardIndex > -1) newState.discardPile.push(player.specialCards.splice(eCardIndex, 1)[0]);
            newState.log.push(`${player.name} activated 'Efficient'. Their next deployment costs 50% less.`);
            break;
        case CardName.MasterBuilder:
            player.masterBuilderActive = true;
            player.actionsThisTurn.push(GameAction.UseCard);
            const mbCardIndex = player.specialCards.indexOf(CardName.MasterBuilder);
            if (mbCardIndex > -1) newState.discardPile.push(player.specialCards.splice(mbCardIndex, 1)[0]);
            newState.log.push(`${player.name} activated 'Master Builder'. Their next upgrade costs 50% less.`);
            break;
        case CardName.Sabotage:
            newState.sabotageDialogState = { isOpen: true };
            break;
        case CardName.StealResource:
            newState.stealResourceDialogState = { isOpen: true };
            break;
        case CardName.Wealthy:
            newState.wealthyDialogState = { isOpen: true };
            break;
        default:
            throw new Error(`The card "${cardName}" does not have a defined use action.`);
    }

    return { newState, selectedArmyId };
};

export function handleUseProductiveCard(state: GameState, selectedResource: ResourceType | null): ActionHandlerResult {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    let collectedResources: Record<string, number> = {};
    let doubledResourceString = '';

    // Consume the card if a resource was selected to be doubled
    if (selectedResource) {
        player.actionsThisTurn.push(GameAction.UseCard);
        const cardIndex = player.specialCards.indexOf(CardName.Productive);
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

    newState.productiveCardDialogState = null;
    return { newState, selectedArmyId: null };
}

export function handleSabotagePlayer(state: GameState, targetPlayerId: number): ActionHandlerResult {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        targetPlayer.isSabotaged = true;
        newState.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
        
        player.actionsThisTurn.push(GameAction.UseCard);
        const cardIndex = player.specialCards.indexOf(CardName.Sabotage);
        if (cardIndex > -1) {
            newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
    }

    newState.sabotageDialogState = null;
    return { newState, selectedArmyId: null };
}

export function handleGainWealth(state: GameState, resource: ResourceType): ActionHandlerResult {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    player.resources[resource] += 5;
    newState.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    
    player.actionsThisTurn.push(GameAction.UseCard);
    const cardIndex = player.specialCards.indexOf(CardName.Wealthy);
    if (cardIndex > -1) {
        newState.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
    }

    newState.wealthyDialogState = null;
    return { newState, selectedArmyId: null };
}

export const handleStealResource = (state: GameState, payload: { targetPlayerId: number; resource: ResourceType }): ActionHandlerResult => {
    let newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === payload.targetPlayerId);

    if (!targetPlayer) {
        newState.stealResourceDialogState = null;
        return {newState, selectedArmyId: null};
    }
    
    const stolenAmount = Math.min(targetPlayer.resources[payload.resource], 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[payload.resource] -= stolenAmount;
        currentPlayer.resources[payload.resource] += stolenAmount;
        newState.log.push(`${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!`);
    } else {
        newState.log.push(`${currentPlayer.name} tried to steal ${payload.resource} from ${targetPlayer.name}, but they had none.`);
    }

    player.actionsThisTurn.push(GameAction.UseCard);
    const cardIndex = currentPlayer.specialCards.indexOf(CardName.StealResource);
    if (cardIndex > -1) {
        newState.discardPile.push(currentPlayer.specialCards.splice(cardIndex, 1)[0]);
    }

    newState.stealResourceDialogState = null;
    return { newState, selectedArmyId: null };
};

export function handleOpenAbilitiesShop(state: GameState): GameState {
    const availableAbilities = state.settings.availableAbilities;
    if (availableAbilities.length === 0) {
        throw new Error("The host has disabled all passive abilities for this match.");
    }
    return { ...state, abilitiesShopState: { isOpen: true } };
}

export function handleBuyAbility(state: GameState, abilityName: AbilityName): ActionHandlerResult {
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

    newState.abilitiesShopState = null;
    return {newState, selectedArmyId: null};
}
