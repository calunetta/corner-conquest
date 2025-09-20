
import type { GameState, PassiveAbilities, ResourceType, CardName, AbilityName } from '@/lib/types';
import { checkAndEndTurnIfNoActions } from './player';
import { GameAction, CardName as CardNameEnum } from '../enums';

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

    return checkAndEndTurnIfNoActions(newState);
}

export const handleUseCard = (state: GameState, cardName: CardName): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);
    if (!canUseCard) throw new Error("You can only use one card per turn.");
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
    
    let shouldCheckEndTurn = true;
    let shouldOpenConfirmation = false;

    switch (cardName) {
        case CardNameEnum.ExtraMove:
            player.hasExtraMove = true;
            newState.log.push(`${player.name} activated 'Extra Move'. One army can move again this turn.`);
            shouldCheckEndTurn = false;
            break;
        case CardNameEnum.Teleport:
            newState.teleportState = { armyId: null };
            shouldCheckEndTurn = false;
            break;
        case CardNameEnum.Scout:
            newState.scoutingState = { count: 3 };
            newState.log.push(`${player.name} activated 'Scout'. Click 3 hidden tiles to reveal them.`);
            shouldCheckEndTurn = false;
            break;
        case CardNameEnum.Reinforce:
            player.reinforceActive = true;
            newState.log.push(`${player.name} activated 'Reinforce'. Their next deployment is free.`);
            break;
        case CardNameEnum.Efficient:
            player.efficientActive = true;
            newState.log.push(`${player.name} activated 'Efficient'. Their next deployment costs 50% less.`);
            break;
        case CardNameEnum.MasterBuilder:
            player.masterBuilderActive = true;
            newState.log.push(`${player.name} activated 'Master Builder'. Their next upgrade costs 50% less.`);
            break;
        case CardNameEnum.Sabotage:
        case CardNameEnum.StealResource:
        case CardNameEnum.Wealthy:
            shouldOpenConfirmation = true;
            break;
        default:
            throw new Error(`The card "${cardName}" does not have a defined use action.`);
    }
    
    if (shouldOpenConfirmation) {
        newState.useCardDialogState = { cardName };
    } else {
         // For immediate effects, mark as used if it's not a delayed effect like Extra Move
        if (cardName !== CardNameEnum.ExtraMove) {
            player.actionsThisTurn.push(GameAction.UseCard);
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            newState.discardPile.push(usedCard);
        }
    }

    if (shouldCheckEndTurn) {
        return checkAndEndTurnIfNoActions(newState);
    }
    return newState;
};

export const handleConfirmUseCard = (state: GameState, cardName: CardName): GameState => {
    let newState = { ...state };
    let dialogState: Partial<GameState> = {};
    switch (cardName) {
        case CardNameEnum.StealResource:
            dialogState = { stealResourceDialogState: { targetPlayerId: null } };
            break;
        case CardNameEnum.Sabotage:
            dialogState = { sabotageDialogState: { isOpen: true } };
            break;
        case CardNameEnum.Wealthy:
            dialogState = { wealthyDialogState: { isOpen: true } };
            break;
        default:
            return handleUseCard(newState, cardName);
    }

    return { ...newState, ...dialogState, useCardDialogState: null };
}

export const handleSabotagePlayer = (state: GameState, targetPlayerId: number): GameState => {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        if (!player.actionsThisTurn.includes(GameAction.UseCard)) {
             player.actionsThisTurn.push(GameAction.UseCard);
        }
        
        targetPlayer.isSabotaged = true;
        const cardIndex = player.specialCards.indexOf(CardNameEnum.Sabotage);
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            newState.discardPile.push(usedCard);
        }

        newState.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
    }

    newState.sabotageDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export const handleGainWealth = (state: GameState, resource: ResourceType): GameState => {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    if (!player.actionsThisTurn.includes(GameAction.UseCard)) {
        player.actionsThisTurn.push(GameAction.UseCard);
    }
    
    player.resources[resource] += 5;
    
    const cardIndex = player.specialCards.indexOf(CardNameEnum.Wealthy);
    if (cardIndex > -1) {
        const usedCard = player.specialCards.splice(cardIndex, 1)[0];
        newState.discardPile.push(usedCard);
    }
    
    newState.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    newState.wealthyDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export const handleStealResource = (state: GameState, payload: { targetPlayerId: number; resource: ResourceType }): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex, discardPile } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === payload.targetPlayerId);

    if (!targetPlayer) return { ...newState, stealResourceDialogState: null };
    
    const cardIndex = currentPlayer.specialCards.indexOf(CardNameEnum.StealResource);
    if (cardIndex === -1) throw new Error(`${currentPlayer.name} tried to steal without the card.`);
    
    if (!currentPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        currentPlayer.actionsThisTurn.push(GameAction.UseCard);
    }
    const usedCard = currentPlayer.specialCards.splice(cardIndex, 1)[0];
    discardPile.push(usedCard);

    const stolenAmount = Math.min(targetPlayer.resources[payload.resource], 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[payload.resource] -= stolenAmount;
        currentPlayer.resources[payload.resource] += stolenAmount;
        newState.log.push(`${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!`);
    } else {
        newState.log.push(`${currentPlayer.name} tried to steal ${payload.resource} from ${targetPlayer.name}, but they had none.`);
    }

    newState.stealResourceDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
};

export function handleOpenAbilitiesShop(state: GameState): GameState {
    const availableAbilities = state.settings.availableAbilities;
    if (availableAbilities.length === 0) {
        throw new Error("The host has disabled all passive abilities for this match.");
    }
    return { ...state, abilitiesShopState: { isOpen: true } };
}

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

    newState.abilitiesShopState = null;
    return checkAndEndTurnIfNoActions(newState);
}
