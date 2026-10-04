import type { GameState } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { cloneDeep } from 'lodash';
import { applyBotCardStrategy } from './bot-card-strategy.reducer';
import { applyBotPurchases } from './bot-purchases.reducer';
import { applyBotArmyActions } from './bot-army-actions.reducer';
import { handleGameAction } from './game-rules.reducer';

/**
 * Pure bot decision tree: clones `initialState`, then runs pre-turn card strategy, purchases and
 * army actions in that order, then ends the turn. No guard — callers must ensure it is a valid
 * in-progress bot turn before calling (see `services/bot-turn.service.ts`'s `takeBotTurn`).
 */
export function decideBotTurn(initialState: GameState): GameState {
  let state: GameState = cloneDeep(initialState);

  state = applyBotCardStrategy(state);
  state = applyBotPurchases(state);
  state = applyBotArmyActions(state);

  const endTurnRes = handleGameAction({ action: GameAction.EndTurn, gameState: state });
  if (endTurnRes.state) {
    state = endTurnRes.state;
  }

  return state;
}
