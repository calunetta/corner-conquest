import type { Army, GameState } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';

const MAX_ARMY_SIZE = 5;
const MAX_ATTACK_POWER = 4;

/** Cancels an in-progress card action: restores the card to hand, reverts its flag, and un-scouts any tiles. */
export function handleCancelAction(
  state: GameState,
  payload?: { cardName?: CardName; scoutedTiles?: string[] },
): GameState {
  const player = state.players[state.currentPlayerIndex];

  if (payload?.cardName) {
    const { cardName } = payload;
    const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
    if (cardUseIndex > -1) {
      player.actionsThisTurn.splice(cardUseIndex, 1);
    }

    const discardIndex = state.discardPile.indexOf(cardName);
    if (discardIndex > -1) {
      const card = state.discardPile.splice(discardIndex, 1)[0];
      player.specialCards.push(card);
    }

    if (cardName === CardName.ExtraMove) player.hasExtraMove = false;
    if (cardName === CardName.Reinforce) player.reinforceActive = false;
    if (cardName === CardName.Efficient) player.efficientActive = false;
    if (cardName === CardName.MasterBuilder) player.masterBuilderActive = false;

    if (payload.scoutedTiles && Array.isArray(payload.scoutedTiles)) {
      const scoutedTiles = payload.scoutedTiles;
      player.revealedTiles = player.revealedTiles.filter((t) => !scoutedTiles.includes(t));
    }

    state.log.push(`${player.name} cancelled their action with ${cardName}.`);
  }

  return state;
}

/** Deploys a new army at the player's base, applying Reinforce (free) or Efficient (half cost) if active. */
export function handleDeployAction(state: GameState): GameState {
  const { players, currentPlayerIndex, map, discardPile, settings, baseTiles } = state;
  const player = players[currentPlayerIndex];

  if (player.actionsThisTurn.includes(GameAction.Deploy)) throw new Error('You can only deploy one army per turn.');

  let cost = player.nextArmyCost;
  let isReinforceUsed = false;
  let isEfficientUsed = false;

  const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

  if (player.reinforceActive && canUseCard) {
    cost = 0;
    isReinforceUsed = true;
  } else if (player.efficientActive && canUseCard) {
    cost = Math.ceil(cost / 2);
    isEfficientUsed = true;
  }

  if (player.resources.food < cost) throw new Error(`Not enough food. Cost: ${cost}`);
  if (player.armies.length >= MAX_ARMY_SIZE) throw new Error('You have reached the maximum army size.');

  player.resources.food -= cost;
  player.armyCount = player.armies.length + 1;
  const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map((a) => a.id)) + 1 : 0;
  const newArmy: Army = { id: newArmyId, position: { x: 0, y: 0 }, hasActed: true };

  const baseTileInfo = baseTiles.find((b) => b.owner === player.id);
  if (!baseTileInfo) throw new Error('Base not found!');
  newArmy.position = { x: baseTileInfo.x, y: baseTileInfo.y };

  player.armies.push(newArmy);
  map[baseTileInfo.y * settings.gridSize.cols + baseTileInfo.x].occupants.push({
    playerId: player.id,
    armyId: newArmy.id,
  });

  if (isEfficientUsed) {
    state.log.push(`${player.name} used 'Efficient' to deploy!`);
    player.efficientActive = false;
    const cardIndex = player.specialCards.indexOf(CardName.Efficient);
    if (cardIndex > -1) {
      player.actionsThisTurn.push(GameAction.UseCard);
      const usedCard = player.specialCards.splice(cardIndex, 1)[0];
      discardPile.push(usedCard);
    }
  }

  if (isReinforceUsed) {
    state.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
    player.reinforceActive = false;
    const cardIndex = player.specialCards.indexOf(CardName.Reinforce);
    if (cardIndex > -1) {
      player.actionsThisTurn.push(GameAction.UseCard);
      const usedCard = player.specialCards.splice(cardIndex, 1)[0];
      discardPile.push(usedCard);
    }
  }

  if (!isReinforceUsed) {
    player.nextArmyCost += settings.deployCostIncrement;
  }

  player.actionsThisTurn.push(GameAction.Deploy);
  state.log.push(`${player.name} deployed a new army!`);

  return state;
}

/** Upgrades the player's attack power by 1 (capped), applying Master Builder's half cost if active. */
export function handleUpgradeAction(state: GameState): GameState {
  const { players, currentPlayerIndex, discardPile, settings } = state;
  const player = players[currentPlayerIndex];

  if (player.actionsThisTurn.includes(GameAction.Upgrade)) throw new Error('You can only upgrade once per turn.');
  if (player.attackPower >= MAX_ATTACK_POWER) throw new Error('You have reached the maximum attack power.');

  const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

  let cost = settings.upgradeCost;
  if (player.masterBuilderActive && canUseCard) {
    cost = Math.ceil(cost / 2);
  }
  if (player.resources.wood < cost) throw new Error(`Not enough wood. Cost: ${cost}`);

  player.resources.wood -= cost;
  player.attackPower += 1;

  if (player.masterBuilderActive && canUseCard) {
    state.log.push(`${player.name} used 'Master Builder' for a cheaper upgrade!`);
    player.masterBuilderActive = false;
    const cardIndex = player.specialCards.indexOf(CardName.MasterBuilder);
    if (cardIndex > -1) {
      player.actionsThisTurn.push(GameAction.UseCard);
      const usedCard = player.specialCards.splice(cardIndex, 1)[0];
      discardPile.push(usedCard);
    }
  }

  player.actionsThisTurn.push(GameAction.Upgrade);
  state.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower}.`);

  return state;
}
