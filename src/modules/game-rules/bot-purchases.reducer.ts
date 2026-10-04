import type { AbilityName, GameState } from '@/lib/types';
import { GameAction, ResourceType as ResourceEnum } from '@/lib/types';
import { canAfford } from './bot-helpers';
import { handleGameAction } from './game-rules.reducer';

/** Strategic purchases, in order: ability, upgrade, army deploy, special card. */
export function applyBotPurchases(state: GameState): GameState {
  let currentState = state;
  let activeBot = currentState.players[currentState.currentPlayerIndex];

  const abilityCost = currentState.settings.abilityCost;
  const unownedAbilities = currentState.settings.availableAbilities.filter(
    (a) => !activeBot.passiveAbilities[a as AbilityName],
  );
  if (canAfford(activeBot, abilityCost, ResourceEnum.Gold) && unownedAbilities.length > 0) {
    const temp = handleGameAction({ action: GameAction.BuyAbility, gameState: currentState, payload: { abilityName: unownedAbilities[0] } });
    if (temp.state) currentState = temp.state;
  }
  activeBot = currentState.players[currentState.currentPlayerIndex];

  const upgradeCost = activeBot.masterBuilderActive
    ? Math.ceil(currentState.settings.upgradeCost / 2)
    : currentState.settings.upgradeCost;
  if (canAfford(activeBot, upgradeCost, ResourceEnum.Wood) && activeBot.attackPower < 4 && !activeBot.actionsThisTurn.includes(GameAction.Upgrade)) {
    const temp = handleGameAction({ action: GameAction.Upgrade, gameState: currentState });
    if (temp.state) currentState = temp.state;
  }
  activeBot = currentState.players[currentState.currentPlayerIndex];

  const deployCost = activeBot.efficientActive
    ? Math.ceil(activeBot.nextArmyCost / 2)
    : (activeBot.reinforceActive ? 0 : activeBot.nextArmyCost);
  if (canAfford(activeBot, deployCost, ResourceEnum.Food) && activeBot.armies.length < 5 && !activeBot.actionsThisTurn.includes(GameAction.Deploy)) {
    const temp = handleGameAction({ action: GameAction.Deploy, gameState: currentState });
    if (temp.state) currentState = temp.state;
  }
  activeBot = currentState.players[currentState.currentPlayerIndex];

  if (
    canAfford(activeBot, 10, ResourceEnum.Gold) &&
    activeBot.specialCards.length < 7 &&
    (currentState.specialCardsDeck.length > 0 || currentState.discardPile.length > 0) &&
    !activeBot.actionsThisTurn.includes(GameAction.BuyCard)
  ) {
    const temp = handleGameAction({ action: GameAction.BuyCard, gameState: currentState });
    if (temp.state) currentState = temp.state;
  }

  return currentState;
}
