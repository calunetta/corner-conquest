import type { GameState, Player } from './types';
import { GameAction, IslandType, HAND_LIMIT } from './types';
import { getPossibleMoves } from './actions/movement';

/**
 * Evaluates whether a player has any available actions remaining in their active turn:
 * 1. Any army that can move, attack, or position.
 * 2. Deploying a new army (if army cap < 5, deploy not used, and food/reinforce available).
 * 3. Upgrading attack power (if power < 4, upgrade not used, and wood/masterBuilder available).
 * 4. Buying a special card (if hand < 7, buy-card not used, gold >= 10, deck/discard available).
 * 5. Using a special card from hand (if use-card not used and cards available).
 * 6. Purchasing a passive ability (if unowned abilities exist and gold >= abilityCost).
 * 7. Active pending dialogs or multi-step interactions (scout, teleport, combat, etc.).
 */
export function hasPlayerRemainingActions(
  state: GameState,
  player: Player,
  hasActiveDialogOrPendingAction: boolean = false
): boolean {
  if (!state || state.status !== 'playing') return false;
  if (hasActiveDialogOrPendingAction) return true;

  // Active combat / productive states
  if (state.combatState || state.monsterCombatState || state.productiveDialogState) {
    return true;
  }

  // Active temporary card buffs (Extra Move, Reinforce, Efficient, Master Builder)
  if (player.hasExtraMove || player.reinforceActive || player.efficientActive || player.masterBuilderActive) {
    return true;
  }

  const { settings, map, specialCardsDeck, discardPile } = state;
  const cols = settings.gridSize.cols;

  // 1. Check if any army can Move, Attack, or Position
  for (const army of player.armies) {
    const canArmyAct = !army.hasActed || player.hasExtraMove;
    if (!canArmyAct) continue;

    // Can Move?
    const moves = getPossibleMoves(state, army);
    if (moves.length > 0) return true;

    // Can Attack or Position on current tile?
    const currentTile = map[army.position.y * cols + army.position.x];
    if (currentTile) {
      // Can Attack enemy player army or monsters?
      const hasEnemyArmy = currentTile.occupants.some(o => o.playerId !== player.id);
      const hasMonster = currentTile.type === IslandType.Monster && !!currentTile.monsters && currentTile.monsters.length > 0;
      if (hasEnemyArmy || hasMonster) return true;

      // Can Position on resource?
      const isPositionableTile = currentTile.type === IslandType.Resource || currentTile.type === IslandType.Base;
      const hasResources = currentTile.resources && currentTile.resources.length > 0;
      const hasNoMonsters = !currentTile.monsters || currentTile.monsters.length === 0;
      const notPositionedHere = !player.positions.some(p => p.armyId === army.id);
      if (isPositionableTile && hasResources && hasNoMonsters && notPositionedHere) {
        return true;
      }
    }
  }

  // 2. Can Deploy?
  if (player.armies.length < 5 && !player.actionsThisTurn.includes(GameAction.Deploy)) {
    const deployCost = player.reinforceActive
      ? 0
      : player.efficientActive
      ? Math.ceil(player.nextArmyCost / 2)
      : player.nextArmyCost;
    if (player.resources.food >= deployCost) return true;
  }

  // 3. Can Upgrade?
  if (player.attackPower < 4 && !player.actionsThisTurn.includes(GameAction.Upgrade)) {
    const upgradeCost = player.masterBuilderActive
      ? Math.ceil(settings.upgradeCost / 2)
      : settings.upgradeCost;
    if (player.resources.wood >= upgradeCost) return true;
  }

  // 4. Can Buy Card?
  if (
    player.specialCards.length < HAND_LIMIT &&
    !player.actionsThisTurn.includes(GameAction.BuyCard) &&
    player.resources.gold >= 10 &&
    (specialCardsDeck.length > 0 || discardPile.length > 0)
  ) {
    return true;
  }

  // 5. Can Use Card?
  if (player.specialCards.length > 0 && !player.actionsThisTurn.includes(GameAction.UseCard)) {
    return true;
  }

  // 6. Can Buy Ability?
  const hasUnownedAbilities = !player.passiveAbilities.explorer || !player.passiveAbilities.collector;
  if (hasUnownedAbilities && player.resources.gold >= settings.abilityCost) {
    return true;
  }

  return false;
}
