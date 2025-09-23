

import type { GameState, ActionHandlerResult, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleBuyAbility, handleUseProductiveCard, handleRollOnSpecialIsland, handleCloseSpecialIslandDialog } from './card';
import { handleMoveAction } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, handlePlayerExit, handleConfirmHostLeave, handleCancelAction } from './player';
import { handlePositionAction, handleSelectResourceForPosition } from './resource';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState;
    payload?: any;
}

export { handlePlayerExit, handleConfirmHostLeave };

export function handleGameAction({ action, gameState, payload }: HandleActionParams): ActionHandlerResult {

    let newState: GameState = gameState;
    let uiResult = null;

    switch(action) {
        // Player actions
        case GameAction.Deploy:
            newState = handleDeployAction(gameState);
            break;
        case GameAction.Upgrade:
            newState = handleUpgradeAction(gameState);
            break;
        case GameAction.EndTurn:
            newState = handleEndTurn(gameState);
            break;
        case GameAction.CancelAction:
            newState = handleCancelAction(gameState);
            break;

        // Resource actions
        case GameAction.Position:
            ({ newState, ...uiResult } = handlePositionAction(gameState, payload.army));
            break;
        case GameAction.SelectResourcePosition:
            ({ newState, ...uiResult } = handleSelectResourceForPosition(gameState, payload.resource, payload.army));
            break;
        
        // Movement Actions
        case GameAction.Move:
            newState = handleMoveAction(gameState, payload.x, payload.y, payload.army);
            break;

        // Attack actions
        case GameAction.Attack:
            ({ newState, ...uiResult } = handleAttackAction(gameState, payload.army));
            break;
        case GameAction.SelectDefender:
            newState = handleSelectDefender(gameState, payload.defenderArmyId, payload.attackingArmyId);
            break;
        case GameAction.CombatRoll:
            newState = handleCombatRoll(gameState, payload.useWarChief, payload.army);
            break;
        case GameAction.CloseCombat:
            ({newState, ...uiResult} = handleCloseCombat(gameState));
            break;
        case GameAction.MonsterCombatRoll:
            newState = handleMonsterCombatRoll(gameState, payload, payload.army);
            break;
        case GameAction.CloseMonsterCombat:
            ({newState, ...uiResult} = handleCloseMonsterCombat(gameState, payload.army));
            break;

        // Card actions
        case GameAction.BuyCard:
            newState = handleBuyCardAction(gameState);
            break;
        case GameAction.UseCard:
            newState = handleUseCard(gameState, payload.cardName);
            break;
        case GameAction.UseProductiveCard:
            newState = handleUseProductiveCard(gameState, payload.selectedResource);
            break;
        case GameAction.SabotagePlayer:
            newState = handleSabotagePlayer(gameState, payload.targetPlayerId);
            break;
        case GameAction.GainWealth:
            newState = handleGainWealth(gameState, payload.resource);
            break;
        case GameAction.StealResource:
            newState = handleStealResource(gameState, payload);
            break;
        case GameAction.RollOnSpecialIsland:
            newState = handleRollOnSpecialIsland(gameState);
            break;
        case GameAction.CloseSpecialIslandDialog:
            newState = handleCloseSpecialIslandDialog(gameState);
            break;
        
        // Abilities Shop
        case GameAction.BuyAbility:
            newState = handleBuyAbility(gameState, payload.abilityName);
            break;

        default:
            return { state: gameState, ui: null };
    }
    return { state: newState, ui: uiResult };
}
