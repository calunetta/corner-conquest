

import type { GameState, ActionHandlerResult, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleBuyAbility, handleUseProductiveCard, handleRollOnSpecialIsland, handleCloseSpecialIslandDialog } from './card';
import { handleMoveAction } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, handlePlayerExit, handleConfirmHostLeave } from './player';
import { handlePositionAction, handleSelectResourceForPosition } from './resource';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState;
    payload?: any;
}

export { handlePlayerExit, handleConfirmHostLeave };

export function handleGameAction({ action, gameState, payload }: HandleActionParams): GameState {

    switch(action) {
        // Player actions
        case GameAction.Deploy:
            return handleDeployAction(gameState);
        case GameAction.Upgrade:
            return handleUpgradeAction(gameState);
        case GameAction.EndTurn:
            return handleEndTurn(gameState);

        // Resource actions
        case GameAction.Position:
            return handlePositionAction(gameState, payload.army);
        case GameAction.SelectResourcePosition:
            return handleSelectResourceForPosition(gameState, payload.resource, payload.army);
        
        // Movement Actions
        case GameAction.Move:
            return handleMoveAction(gameState, payload.x, payload.y, payload.army);
        case GameAction.Teleport:
            // This case might be simplified if teleport state is handled locally
             return gameState; 

        // Attack actions
        case GameAction.Attack:
            return handleAttackAction(gameState, payload.army);
        case GameAction.SelectDefender:
            return handleSelectDefender(gameState, payload.defenderArmyId, payload.attackingArmyId);
        case GameAction.CombatRoll:
            return handleCombatRoll(gameState, payload.useWarChief, payload.army);
        case GameAction.CloseCombat:
            return handleCloseCombat(gameState);
        case GameAction.MonsterCombatRoll:
            return handleMonsterCombatRoll(gameState, payload, payload.army);
        case GameAction.CloseMonsterCombat:
            return handleCloseMonsterCombat(gameState);

        // Card actions
        case GameAction.BuyCard:
            return handleBuyCardAction(gameState);
        case GameAction.UseCard:
             // The initial card use action might just set a local state.
             // The actual effect is a separate shared action.
            return handleUseCard(gameState, payload.cardName);
        case GameAction.UseProductiveCard:
            return handleUseProductiveCard(gameState, payload.selectedResource);
        case GameAction.SabotagePlayer:
            return handleSabotagePlayer(gameState, payload.targetPlayerId);
        case GameAction.GainWealth:
            return handleGainWealth(gameState, payload.resource);
        case GameAction.StealResource:
            return handleStealResource(gameState, payload);
        case GameAction.RollOnSpecialIsland:
            return handleRollOnSpecialIsland(gameState);
        case GameAction.CloseSpecialIslandDialog:
            return handleCloseSpecialIslandDialog(gameState);
        
        // Abilities Shop
        case GameAction.BuyAbility:
            return handleBuyAbility(gameState, payload.abilityName);

        default:
            return gameState;
    }
}
