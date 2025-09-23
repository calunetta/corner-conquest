
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
        // This should not happen if called from a valid context, but it's a safe guard.
        console.error("handleGameAction called with null gameState");
        return { state: null, ui: null };
    }

    // Clone the state to ensure we don't mutate the original object.
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
        case GameAction.CancelAction:
            newState = handleCancelAction(newState);
            break;

        // Resource actions
        case GameAction.Position:
            ({ state: newState, ui: uiResult } = handlePositionAction(newState, payload.army));
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
            // For actions that are now local (like SelectArmy), we just return the state unmodified.
            // The UI will handle the local state change.
            console.warn(`Action ${action} is not a shared game state action.`);
            return { state: gameState, ui: null };
    }
    return { state: newState, ui: uiResult };
}
