
import type { GameState, ActionHandlerResult, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleBuyAbility, handleUseProductiveCard, handleRollOnSpecialIsland, handleCloseSpecialIslandDialog } from './card';
import { handleMoveAction } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, handleCancelAction } from './player';
import { handlePositionAction, handleSelectResourceForPosition } from './resource';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState | null;
    payload?: any;
}

export function handleGameAction({ action, gameState, payload }: HandleActionParams): ActionHandlerResult {
    if (!gameState) {
        console.error("handleGameAction called with null gameState");
        return { state: null, ui: null };
    }

    let newState: GameState = JSON.parse(JSON.stringify(gameState));
    let uiResult = null;

    switch(action) {
        // Player actions
        case GameAction.Deploy:
            newState = handleDeployAction(newState);
            break;
        case GameAction.Upgrade:
            newState = handleUpgradeAction(newState);
            break;
        case GameAction.EndTurn:
            newState = handleEndTurn(newState);
            break;
        case GameAction.CancelAction: // Failsafe on backend
            newState = handleCancelAction(newState);
            break;

        // Resource actions
        case GameAction.Position:
            newState = handlePositionAction(newState, payload.army);
            break;
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
            newState = handleMonsterCombatRoll(newState, payload, payload.army);
            break;
        case GameAction.CloseMonsterCombat:
            newState = handleCloseMonsterCombat(newState, payload.army);
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
        
        // Abilities Shop
        case GameAction.BuyAbility:
            newState = handleBuyAbility(newState, payload.abilityName);
            break;

        default:
            console.warn(`Action ${action} is not a shared game state action or is unhandled.`);
            return { state: gameState, ui: null };
    }
    return { state: newState, ui: uiResult };
}
