
import type { GameState, ActionHandlerResult, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleConfirmUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleOpenAbilitiesShop, handleBuyAbility } from './card';
import { handleTileClick, handleSelectArmy } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, handlePlayerExit, handleConfirmHostLeave, handleCancelAction, handleDeselectArmy } from './player';
import { handlePositionAction, handleCollectAction, handleConfirmCollection, handleSelectResourceForPosition } from './resource';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState;
    selectedArmyId: number | null;
    payload?: any;
}

export { handlePlayerExit, handleConfirmHostLeave };

export function handleGameAction({ action, gameState, selectedArmyId, payload }: HandleActionParams): ActionHandlerResult {
    const selectedArmy = selectedArmyId !== null 
        ? gameState.players[gameState.currentPlayerIndex]?.armies.find(a => a.id === selectedArmyId) ?? null
        : null;

    switch(action) {
        // Player actions
        case GameAction.Deploy:
            return { newState: handleDeployAction(gameState), selectedArmyId: null };
        case GameAction.Upgrade:
            return { newState: handleUpgradeAction(gameState), selectedArmyId: null };
        case GameAction.EndTurn:
            return { newState: handleEndTurn(gameState), selectedArmyId: null };
        case GameAction.DeselectArmy:
            return { newState: gameState, ...handleDeselectArmy() };
        case GameAction.CancelAction:
             return { newState: handleCancelAction(gameState), selectedArmyId: selectedArmy?.id ?? null };

        // Resource actions
        case GameAction.Position:
            return handlePositionAction(gameState, selectedArmy);
        case GameAction.Collect:
            return handleCollectAction(gameState, selectedArmy);
        case GameAction.SelectResourcePosition:
            return handleSelectResourceForPosition(gameState, payload, selectedArmy);
        case GameAction.ConfirmCollection:
            return handleConfirmCollection(gameState, payload.useProductive, selectedArmy);

        // Movement & Tile actions
        case GameAction.TileClick:
            const { x, y, possibleMoves } = payload;
            return handleTileClick(gameState, x, y, selectedArmy, possibleMoves);
        case GameAction.SelectArmy:
            return handleSelectArmy(gameState, payload.armyId);

        // Attack actions
        case GameAction.Attack:
            return handleAttackAction(gameState, selectedArmy);
        case GameAction.SelectDefender:
            const { defenderArmyId, attackingArmyId } = payload;
            return { newState: handleSelectDefender(gameState, defenderArmyId, attackingArmyId), selectedArmyId: attackingArmyId };
        case GameAction.CombatRoll:
            return { newState: handleCombatRoll(gameState, payload.useWarChief, selectedArmy) };
        case GameAction.CloseCombat:
            return handleCloseCombat(gameState);
        case GameAction.CloseCombatViewer:
            return { newState: { ...gameState, combatState: null } };
        case GameAction.MonsterCombatRoll:
            return { newState: handleMonsterCombatRoll(gameState, payload, selectedArmy) };
        case GameAction.CloseMonsterCombat:
            return handleCloseMonsterCombat(gameState, selectedArmy);
        case GameAction.CloseMonsterCombatViewer:
            return { newState: { ...gameState, monsterCombatState: null } };

        // Card actions
        case GameAction.BuyCard:
            return { newState: handleBuyCardAction(gameState), selectedArmyId: null };
        case GameAction.UseCard:
            return handleUseCard(gameState, payload.cardName);
        case GameAction.ConfirmUseCard:
            return { newState: handleConfirmUseCard(gameState, payload.cardName) };
        case GameAction.SabotagePlayer:
            return handleSabotagePlayer(gameState, payload.targetPlayerId);
        case GameAction.GainWealth:
            return handleGainWealth(gameState, payload.resource);
        case GameAction.StealResource:
            return handleStealResource(gameState, payload);
        
        // Abilities Shop
        case GameAction.OpenAbilitiesShop:
            return { newState: handleOpenAbilitiesShop(gameState) };
        case GameAction.CloseAbilitiesShop:
             return { newState: { ...gameState, abilitiesShopState: null } };
        case GameAction.BuyAbility:
            return handleBuyAbility(gameState, payload.abilityName);

        default:
            return { newState: gameState };
    }
}
