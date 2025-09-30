
import type { GameState, ActionHandlerResult, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';

import { handleAttackAction, handleSelectDefender, handleCombatRoll, handleCloseCombat, handleMonsterCombatRoll, handleCloseMonsterCombat } from './attack';
import { handleBuyCardAction, handleUseCard, handleSabotagePlayer, handleGainWealth, handleStealResource, handleBuyAbility, handleUseProductiveCard, handleRollOnSpecialIsland, handleCloseSpecialIslandDialog, handleScoutAction } from './card';
import { handleMoveAction } from './movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn, handleCancelAction, handlePlayerExit } from './player';
import { handleSelectResourceForPosition } from './resource';
import { cloneDeep } from 'lodash';

interface HandleActionParams {
    action: GameAction;
    gameState: GameState;
    payload?: any;
}

export { handlePlayerExit };

export function handleGameAction({ action, gameState, payload }: HandleActionParams): ActionHandlerResult {
    let state: GameState = cloneDeep(gameState);
    let ui: ActionHandlerResult['ui'] = null;

    try {
        switch(action) {
            case GameAction.Deploy:
                state = handleDeployAction(state);
                break;
            case GameAction.Upgrade:
                state = handleUpgradeAction(state);
                break;
            case GameAction.EndTurn:
                state = handleEndTurn(state);
                break;
            case GameAction.CancelAction:
                state = handleCancelAction(state, payload);
                break;
            case GameAction.SelectResourcePosition:
                state = handleSelectResourceForPosition(state, payload.resource, payload.armyId);
                break;
            case GameAction.Move:
                ({ state } = handleMoveAction(state, payload.x, payload.y, payload.army, payload.isTeleport));
                break;
            case GameAction.Attack:
                ({ state, ui } = handleAttackAction(state, payload.army));
                break;
            case GameAction.SelectDefender:
                 state = handleSelectDefender(state, payload.defenderArmyId, payload.attackingArmyId);
                break;
            case GameAction.CombatRoll:
                state = handleCombatRoll(state, payload.useWarChief);
                break;
            case GameAction.CloseCombat:
                state = handleCloseCombat(state);
                break;
            case GameAction.MonsterCombatRoll:
                state = handleMonsterCombatRoll(state, payload);
                break;
            case GameAction.CloseMonsterCombat:
                state = handleCloseMonsterCombat(state);
                break;
            case GameAction.BuyCard:
                state = handleBuyCardAction(state);
                break;
            case GameAction.UseCard:
                state = handleUseCard(state, payload);
                break;
            case GameAction.UseProductiveCard:
                state = handleUseProductiveCard(state, payload.selectedResource);
                break;
            case GameAction.SabotagePlayer:
                state = handleSabotagePlayer(state, payload.targetPlayerId);
                break;
            case GameAction.GainWealth:
                state = handleGainWealth(state, payload.resource);
                break;
            case GameAction.StealResource:
                state = handleStealResource(state, payload);
                break;
            case GameAction.RollOnSpecialIsland:
                state = handleRollOnSpecialIsland(state);
                break;
            case GameAction.CloseSpecialIslandDialog:
                state = handleCloseSpecialIslandDialog(state);
                break;
            case GameAction.Scout:
                state = handleScoutAction(state, payload.x, payload.y);
                break;
            case GameAction.BuyAbility:
                state = handleBuyAbility(state, payload.abilityName);
                break;
            default:
                console.warn(`Action ${action} is not a shared game state action or is unhandled.`);
                return { state: gameState, ui: null };
        }
    } catch (error: any) {
        console.error(`Error handling action ${action}:`, error);
        // Do not re-throw, instead return original state to prevent client crash
        return { state: gameState, ui: null };
    }
    return { state, ui };
}
