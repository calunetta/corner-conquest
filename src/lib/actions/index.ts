

import type { GameState, GameAction, ActionHandlerResult, Army } from '@/lib/types';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleConfirmUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleOpenAbilitiesShop, handleBuyAbility } from './card';
import { handleMoveAction, handleTileClick, handleSelectArmy, getPossibleMoves, revealIsland, handleTeleport, handleScout } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, checkAndEndTurnIfNoActions, handlePlayerExit, handleConfirmHostLeave, handleCancelAction, handleDeselectArmy } from './player';
import { handlePositionAction, handleCollectAction, handleConfirmCollection, handleSelectResourceForPosition } from './resource';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState;
    selectedArmy: Army | null;
    payload?: any;
}

export { handlePlayerExit, handleConfirmHostLeave };

export function handleGameAction({ action, gameState, selectedArmy, payload }: HandleActionParams): ActionHandlerResult {
    switch(action) {
        // Player actions
        case 'deploy':
            return { newState: handleDeployAction(gameState) };
        case 'upgrade':
            return { newState: handleUpgradeAction(gameState) };
        case 'end-turn':
            return { newState: handleEndTurn(gameState), selectedArmyId: null };
        case 'deselect-army':
            return { newState: gameState, ...handleDeselectArmy() };
        case 'cancel-action':
            return { newState: handleCancelAction(gameState) };

        // Resource actions
        case 'position':
            return { newState: handlePositionAction(gameState, selectedArmy) };
        case 'collect':
            return { newState: handleCollectAction(gameState, selectedArmy) };
        case 'select-resource-position':
            return { newState: handleSelectResourceForPosition(gameState, payload, selectedArmy) };
        case 'confirm-collection':
            return { newState: handleConfirmCollection(gameState, payload.useProductive, selectedArmy) };

        // Movement & Tile actions
        case 'tile-click':
            const { x, y, possibleMoves } = payload;
            return handleTileClick(gameState, x, y, selectedArmy, possibleMoves);
        case 'select-army':
            return handleSelectArmy(gameState, payload.armyId);

        // Attack actions
        case 'attack':
            return handleAttackAction(gameState, selectedArmy);
        case 'select-defender':
            const { defenderArmyId, attackingArmyId } = payload;
            return { newState: handleSelectDefender(gameState, defenderArmyId, attackingArmyId), selectedArmyId: attackingArmyId };
        case 'combat-roll':
            return { newState: handleCombatRoll(gameState, payload.useWarChief, selectedArmy) };
        case 'close-combat':
            return { newState: handleCloseCombat(gameState), selectedArmyId: null };
        case 'close-combat-viewer':
            return { newState: { ...gameState, combatState: null } };
        case 'monster-combat-roll':
            return { newState: handleMonsterCombatRoll(gameState, payload, selectedArmy) };
        case 'close-monster-combat':
            return { newState: handleCloseMonsterCombat(gameState, selectedArmy), selectedArmyId: null };
        case 'close-monster-combat-viewer':
            return { newState: { ...gameState, monsterCombatState: null } };

        // Card actions
        case 'buy-card':
            return { newState: handleBuyCardAction(gameState) };
        case 'use-card':
            return { newState: handleUseCard(gameState, payload.cardName) };
        case 'confirm-use-card':
            return { newState: handleConfirmUseCard(gameState, payload.cardName) };
        case 'sabotage-player':
            return { newState: handleSabotagePlayer(gameState, payload.targetPlayerId) };
        case 'gain-wealth':
            return { newState: handleGainWealth(gameState, payload.resource) };
        case 'steal-resource':
            return { newState: handleStealResource(gameState, payload) };
        
        // Abilities Shop
        case 'open-abilities-shop':
            return { newState: handleOpenAbilitiesShop(gameState) };
        case 'close-abilities-shop':
             return { newState: { ...gameState, abilitiesShopState: null } };
        case 'buy-ability':
            return { newState: handleBuyAbility(gameState, payload.abilityName) };

        default:
            return { newState: gameState };
    }
}
