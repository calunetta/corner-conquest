import type { DeathAnimation, GameState, IslandResource, ResourceType } from '@/lib/types';
import { GameStatus, IslandType, ResourceType as ResourceTypeValue } from '@/lib/types';
import { PLAYER_DATA } from './player-data';

const MONSTER_VICTORY_POINTS_BY_LEVEL = [0, 2, 5, 7, 10];
const TWO_RESOURCE_TYPES_CHANCE = 0.4;
const DOUBLE_AMOUNT_CHANCE = 0.5;

/** Applies the outcome of a resolved monster combat: VP, loot reveal, army respawn, win check. */
export function handleCloseMonsterCombat(state: GameState): GameState {
  const { monsterCombatState, baseTiles, settings } = state;
  if (!monsterCombatState || monsterCombatState.phase !== 'results') {
    state.monsterCombatState = null;
    return state;
  }

  const { winnerId, monster, attackerId, attackerPosition } = monsterCombatState;
  const attacker = state.players[attackerId];

  const currentTile = state.map[attackerPosition.y * settings.gridSize.cols + attackerPosition.x];

  if (winnerId === attacker.id) {
    const monsterVP = MONSTER_VICTORY_POINTS_BY_LEVEL[monster.level] || 0;
    attacker.victoryPoints += monsterVP;

    const deathAnim: DeathAnimation = {
      id: `monster-${currentTile.x}-${currentTile.y}-${monster.name}-${Date.now()}`,
      x: currentTile.x,
      y: currentTile.y,
      sprite: monster.sprite.death,
      createdAt: Date.now(),
    };
    state.deathAnimations.push(deathAnim);

    currentTile.monsters = (currentTile.monsters || []).filter((m) => m.name !== monster.name);
    state.log.push(`${attacker.name} defeated the ${monster.name} for ${monsterVP} VP!`);

    if (currentTile.monsters?.length === 0) {
      currentTile.type = IslandType.Resource;

      const resourceTypes: ResourceType[] = [ResourceTypeValue.Food, ResourceTypeValue.Wood, ResourceTypeValue.Gold];
      const availableResources = [...resourceTypes];
      const islandResources: IslandResource[] = [];

      const numResourceTypes = Math.random() < TWO_RESOURCE_TYPES_CHANCE ? 2 : 1;

      if (numResourceTypes === 1) {
        const randomIndex = Math.floor(Math.random() * availableResources.length);
        const selectedResourceType = availableResources[randomIndex];
        islandResources.push({ type: selectedResourceType, amount: 2 * settings.baseResourceAmount });
      } else {
        for (let i = 0; i < numResourceTypes; i++) {
          const randomIndex = Math.floor(Math.random() * availableResources.length);
          const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
          const amount = (Math.random() < DOUBLE_AMOUNT_CHANCE ? 1 : 2) * settings.baseResourceAmount;
          islandResources.push({ type: selectedResourceType, amount });
        }
      }

      currentTile.resources = islandResources;
      const resourceNames = islandResources.map((r) => r.type).join(' and ');
      state.log.push(`The defeated monster revealed new resources on the island: ${resourceNames}!`);
    }
  } else {
    state.log.push(`${attacker.name} was defeated by the ${monster.name}!`);
    const baseTile = baseTiles.find((t) => t.owner === attacker.id);
    const losingArmy = attacker.armies.find(
      (a) => a.position.x === attackerPosition.x && a.position.y === attackerPosition.y,
    );
    if (losingArmy && baseTile) {
      const deathAnim: DeathAnimation = {
        id: `army-${attacker.id}-${losingArmy.id}-${Date.now()}`,
        x: losingArmy.position.x,
        y: losingArmy.position.y,
        sprite: PLAYER_DATA[attacker.color].sprite.death,
        createdAt: Date.now(),
      };
      state.deathAnimations.push(deathAnim);

      const losingArmyTile = state.map[losingArmy.position.y * settings.gridSize.cols + losingArmy.position.x];
      losingArmyTile.occupants = losingArmyTile.occupants.filter((o) => o.armyId !== losingArmy.id);
      losingArmy.position = { x: baseTile.x, y: baseTile.y };
      losingArmy.hasActed = false; // Reset status on respawn
      state.map[baseTile.y * settings.gridSize.cols + baseTile.x].occupants.push({
        playerId: attacker.id,
        armyId: losingArmy.id,
      });
    }
  }

  if (attacker.victoryPoints >= settings.victoryPointGoal && !state.winner) {
    state.winner = attacker;
    state.status = GameStatus.Finished;
    state.log.push(`🎉 ${attacker.name} has reached ${attacker.victoryPoints} Victory Points and won the game!`);
  }

  state.monsterCombatState = null;
  return state;
}
