
import type { GameState, ActionHandlerResult, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { cloneDeep } from 'lodash';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleBuyAbility, handleUseProductiveCard, handleRollOnSpecialIsland, handleCloseSpecialIslandDialog, handleScoutAction } from './card';
import { handleMoveAction } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, handleCancelAction, handlePlayerExit } from './player';
import { handleSelectResourceForPosition } from './resource';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState | null;
    payload?: any;
}

export { handlePlayerExit };

export function handleGameAction({ action, gameState, payload }: HandleActionParams): ActionHandlerResult {
    if (!gameState) {
        console.error("handleGameAction called with null gameState");
        return { state: null, ui: null };
    }

    // Use a deep clone to prevent direct state mutation, ensuring pure function behavior.
    let newState: GameState = cloneDeep(gameState);
    let uiResult = null;

    try {
        switch(action) {
            // Player actions
            case GameAction.Deploy:
                newState = handleDeployAction(newState);
                break;
            case GameAction.Upgrade:
                newState = handleUpgradeAction(newState);
                break;
            case GameAction.EndTurn:
                newState = handleEndTurn(newState, payload.isHost, payload.gameId);
                break;
            case GameAction.CancelAction:
                newState = handleCancelAction(newState);
                break;
            
            // Resource actions
            case GameAction.SelectResourcePosition:
                newState = handleSelectResourceForPosition(newState, payload.resource, payload.army);
                break;
            
            // Movement Actions
            case GameAction.Move:
                newState = handleMoveAction(newState, payload.x, payload.y, payload.army, payload.isTeleport);
                break;

            // Attack actions
            case GameAction.Attack:
                ({ state: newState, ui: uiResult } = handleAttackAction(newState, payload.army));
                break;
            case GameAction.SelectDefender:
                newState = handleSelectDefender(newState, payload.defenderArmyId, payload.attackingArmyId);
                break;
            case GameAction.CombatRoll:
                newState = handleCombatRoll(newState, payload.useWarChief, payload.army);
                break;
            case GameAction.CloseCombat:
                newState = handleCloseCombat(newState);
                break;
            case GameAction.MonsterCombatRoll:
                newState = handleMonsterCombatRoll(newState, payload);
                break;
            case GameAction.CloseMonsterCombat:
                newState = handleCloseMonsterCombat(newState);
                break;

            // Card actions
            case GameAction.BuyCard:
                newState = handleBuyCardAction(newState);
                break;
            case GameAction.UseCard:
                newState = handleUseCard(newState, payload);
                break;
            case GameAction.UseProductiveCard:
                newState = handleUseProductiveCard(newState, payload.selectedResource);
                break;
            case GameAction.SabotagePlayer:
                newState = handleSabotagePlayer(newState, payload.targetPlayerId);
                break;
            case GameAction.GainWealth:
                newState = handleGainWealth(newState, payload.resource);
                break;
            case GameAction.StealResource:
                newState = handleStealResource(newState, payload);
                break;
            case GameAction.RollOnSpecialIsland:
                newState = handleRollOnSpecialIsland(newState);
                break;
            case GameAction.CloseSpecialIslandDialog:
                newState = handleCloseSpecialIslandDialog(newState);
                break;
            case GameAction.Scout:
                newState = handleScoutAction(newState, payload.x, payload.y);
                break;
            
            // Abilities Shop
            case GameAction.BuyAbility:
                newState = handleBuyAbility(newState, payload.abilityName);
                break;

            default:
                console.warn(`Action ${action} is not a shared game state action or is unhandled.`);
                return { state: gameState, ui: null };
        }
    } catch (error: any) {
        console.error(`Error handling action ${action}:`, error);
        // Optionally, re-throw the error to be caught by the UI layer and shown in a toast.
        throw error;
    }
    return { state: newState, ui: uiResult };
}
