import type { GameState, ResourceType } from '@/lib/types';
import { CardName, GameAction, ResourceType as ResourceEnum } from '@/lib/types';
import { canAfford } from './bot-helpers';
import { handleGameAction } from './game-rules.reducer';

/**
 * Pre-turn strategic card activations: Reinforce, Efficient and MasterBuilder (unconditional),
 * then Wealthy (picks the resource the bot needs most) and Sabotage (targets the first human
 * opponent found).
 */
export function applyBotCardStrategy(state: GameState): GameState {
  let currentState = state;
  const botPlayer = currentState.players[currentState.currentPlayerIndex];

  if (botPlayer.specialCards.includes(CardName.Reinforce) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
    const temp = handleGameAction({ action: GameAction.UseCard, gameState: currentState, payload: { cardName: CardName.Reinforce } });
    if (temp.state) currentState = temp.state;
  }
  if (botPlayer.specialCards.includes(CardName.Efficient) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
    const temp = handleGameAction({ action: GameAction.UseCard, gameState: currentState, payload: { cardName: CardName.Efficient } });
    if (temp.state) currentState = temp.state;
  }
  if (botPlayer.specialCards.includes(CardName.MasterBuilder) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
    const temp = handleGameAction({ action: GameAction.UseCard, gameState: currentState, payload: { cardName: CardName.MasterBuilder } });
    if (temp.state) currentState = temp.state;
  }

  let activeBot = currentState.players[currentState.currentPlayerIndex];

  if (activeBot.specialCards.includes(CardName.Wealthy) && !activeBot.actionsThisTurn.includes(GameAction.UseCard)) {
    const deployCost = activeBot.efficientActive
      ? Math.ceil(activeBot.nextArmyCost / 2)
      : (activeBot.reinforceActive ? 0 : activeBot.nextArmyCost);
    const upgradeCost = activeBot.masterBuilderActive
      ? Math.ceil(currentState.settings.upgradeCost / 2)
      : currentState.settings.upgradeCost;
    let neededResource: ResourceType | null = null;
    if (!canAfford(activeBot, deployCost, ResourceEnum.Food) && activeBot.armies.length < 5) neededResource = ResourceEnum.Food;
    else if (!canAfford(activeBot, upgradeCost, ResourceEnum.Wood) && activeBot.attackPower < 4) neededResource = ResourceEnum.Wood;
    else neededResource = ResourceEnum.Gold;

    if (neededResource) {
      const temp = handleGameAction({ action: GameAction.GainWealth, gameState: currentState, payload: { resource: neededResource } });
      if (temp.state) currentState = temp.state;
    }
  }

  activeBot = currentState.players[currentState.currentPlayerIndex];

  if (activeBot.specialCards.includes(CardName.Sabotage) && !activeBot.actionsThisTurn.includes(GameAction.UseCard)) {
    const opponent = currentState.players.find((p) => !p.isBot && p.id !== activeBot.id);
    if (opponent) {
      const temp = handleGameAction({ action: GameAction.SabotagePlayer, gameState: currentState, payload: { targetPlayerId: opponent.id } });
      if (temp.state) currentState = temp.state;
    }
  }

  return currentState;
}
