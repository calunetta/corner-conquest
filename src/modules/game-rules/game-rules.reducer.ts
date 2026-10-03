import type { AbilityName, ActionHandlerResult, Army, CardName, GameState, Monster, ResourceType } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { cloneDeep } from 'lodash';
import { handleInitiateCombatAction } from './combat-initiate.reducer';
import { handleCombatRoll } from './combat-player-roll.reducer';
import { handleCloseCombat } from './combat-player-resolve.reducer';
import { handleMonsterCombatRoll } from './combat-monster-roll.reducer';
import { handleCloseMonsterCombat } from './combat-monster-resolve.reducer';
import { handleMoveAction } from './movement.reducer';
import {
  handleBuyAbility,
  handleBuyCardAction,
  handleCloseSpecialIslandDialog,
  handleRollOnSpecialIsland,
} from './card-acquisition.reducer';
import { handleScoutAction, handleUseCard, handleUseProductiveCard } from './card-effects.reducer';
import { handleGainWealth, handleSabotagePlayer, handleStealResource } from './card-targeted-effects.reducer';
import { handleCancelAction, handleDeployAction, handleUpgradeAction } from './player-actions.reducer';
import { handleEndTurn } from './player-turn.reducer';
import { handleSelectResourceForPosition } from './resource-position.reducer';

export interface HandleActionParams {
  action: GameAction;
  gameState: GameState;
  payload?: unknown;
}

/**
 * Root dispatcher: clones gameState, runs the one reducer matching `action`, and catches any
 * handler error by returning the pre-clone original state instead of throwing, so a bad action
 * never crashes the client. Unchanged dispatch semantics from the legacy `src/lib/actions/index.ts`.
 */
export function handleGameAction({ action, gameState, payload }: HandleActionParams): ActionHandlerResult {
  let state: GameState = cloneDeep(gameState);

  try {
    switch (action) {
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
        state = handleCancelAction(state, payload as { cardName?: CardName; scoutedTiles?: string[] });
        break;
      case GameAction.SelectResourcePosition: {
        const p = payload as { resource: ResourceType; armyId: number };
        state = handleSelectResourceForPosition(state, p.resource, p.armyId);
        break;
      }
      case GameAction.Move: {
        const p = payload as { x: number; y: number; army: Army; isTeleport?: boolean };
        state = handleMoveAction(state, p.x, p.y, p.army, p.isTeleport);
        break;
      }
      case GameAction.InitiateCombat:
        state = handleInitiateCombatAction(
          state,
          payload as {
            attackingArmyId: number;
            target:
              | { type: 'player'; defenderId: number; defendingArmyId: number }
              | { type: 'monster'; monsterName: string };
          },
        );
        break;
      case GameAction.CombatRoll:
        state = handleCombatRoll(state, payload as { useWarChief?: boolean; useOvercome?: boolean } | boolean);
        break;
      case GameAction.CloseCombat:
        state = handleCloseCombat(state);
        break;
      case GameAction.MonsterCombatRoll:
        state = handleMonsterCombatRoll(
          state,
          payload as {
            monster: Monster;
            useDecideCard: boolean;
            decidedValue: number;
            useOvercomeCard: boolean;
            useWarChief: boolean;
          },
        );
        break;
      case GameAction.CloseMonsterCombat:
        state = handleCloseMonsterCombat(state);
        break;
      case GameAction.BuyCard:
        state = handleBuyCardAction(state);
        break;
      case GameAction.UseCard:
        state = handleUseCard(state, payload as { cardName: CardName; isScout?: boolean });
        break;
      case GameAction.UseProductiveCard: {
        const p = payload as { selectedResource: ResourceType | null };
        state = handleUseProductiveCard(state, p.selectedResource);
        break;
      }
      case GameAction.SabotagePlayer: {
        const p = payload as { targetPlayerId: number };
        state = handleSabotagePlayer(state, p.targetPlayerId);
        break;
      }
      case GameAction.GainWealth: {
        const p = payload as { resource: ResourceType };
        state = handleGainWealth(state, p.resource);
        break;
      }
      case GameAction.StealResource:
        state = handleStealResource(state, payload as { targetPlayerId: number; resource: ResourceType });
        break;
      case GameAction.RollOnSpecialIsland:
        state = handleRollOnSpecialIsland(state, payload as { roll?: number } | undefined);
        break;
      case GameAction.CloseSpecialIslandDialog:
        state = handleCloseSpecialIslandDialog(state);
        break;
      case GameAction.Scout: {
        const p = payload as { x: number; y: number };
        state = handleScoutAction(state, p.x, p.y);
        break;
      }
      case GameAction.BuyAbility: {
        const p = payload as { abilityName: AbilityName };
        state = handleBuyAbility(state, p.abilityName);
        break;
      }
      default:
        console.warn(`Action ${action} is not a shared game state action or is unhandled.`);
        return { state: gameState };
    }
  } catch (error) {
    console.error(`Error handling action ${action}:`, error);
    // Do not re-throw, instead return original state to prevent client crash
    return { state: gameState };
  }
  return { state };
}
