import type { GameState, Monster, Player } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { attackerWinProbability } from './bot-combat-odds';
import { MONSTER_VICTORY_POINTS_BY_LEVEL } from './combat-monster-resolve.reducer';

// Scoring constants, specified in docs/ai/tasks/2026-10-17-bot-decision-logic/game-design.md.
const ATTACK_PLAYER_BASE = 2;
const ATTACK_PLAYER_SCALE = 10;
const OWN_BASE_DEFENSE_BONUS = 4;
const ATTACK_MONSTER_BASE = 3;
const ATTACK_MONSTER_SCALE = 8;
const MONSTER_VP_WEIGHT = 0.15;
export const RESOURCE_SPOT_PRIORITY = 4;
const FOG_EXPLORE_PRIORITY = 6;
const OPEN_TILE_MOVE_PRIORITY = 3;
const OTHER_MOVE_PRIORITY = 2;
const DEFEND_BASE_NEAR = 5;
const DEFEND_BASE_FAR = 3;

/** Manhattan radius around the bot's base within which an enemy army counts as a threat. */
const DEFEND_NEAR_RADIUS = 1;
const DEFEND_FAR_RADIUS = 2;

export function scorePlayerAttack(attacker: Player, defender: Player, onOwnBase: boolean): number {
  const winProbability = attackerWinProbability(attacker.attackPower + 1, defender.attackPower + 1);
  return ATTACK_PLAYER_BASE + ATTACK_PLAYER_SCALE * (winProbability - 0.5) + (onOwnBase ? OWN_BASE_DEFENSE_BONUS : 0);
}

export function scoreMonsterAttack(attacker: Player, monster: Monster): number {
  const winProbability = attackerWinProbability(attacker.attackPower + 1, monster.level);
  const monsterVictoryPoints = MONSTER_VICTORY_POINTS_BY_LEVEL[monster.level] ?? 0;
  return ATTACK_MONSTER_BASE + ATTACK_MONSTER_SCALE * (winProbability - 0.5) + monsterVictoryPoints * MONSTER_VP_WEIGHT;
}

/** Whether the tile at (x, y) is the bot's own base. */
export function isOwnBaseTile(state: GameState, bot: Player, x: number, y: number): boolean {
  return state.baseTiles.some((b) => b.owner === bot.id && b.x === x && b.y === y);
}

/** Base-defence bonus for moving onto the bot's own base, based on enemy armies on tiles the bot has revealed. */
function defendBaseBonus(state: GameState, bot: Player, baseX: number, baseY: number): number {
  const cols = state.settings.gridSize.cols;
  let nearestEnemyDistance = Infinity;
  state.map.forEach((tile, index) => {
    const isEnemyHere = tile.occupants.some((o) => o.playerId !== bot.id);
    if (!isEnemyHere || !bot.revealedTiles.includes(tile.id)) return;
    const x = index % cols;
    const y = Math.floor(index / cols);
    nearestEnemyDistance = Math.min(nearestEnemyDistance, Math.abs(x - baseX) + Math.abs(y - baseY));
  });
  if (nearestEnemyDistance <= DEFEND_NEAR_RADIUS) return DEFEND_BASE_NEAR;
  if (nearestEnemyDistance <= DEFEND_FAR_RADIUS) return DEFEND_BASE_FAR;
  return 0;
}

export function scoreMove(state: GameState, bot: Player, targetX: number, targetY: number): number {
  const targetTile = state.map[targetY * state.settings.gridSize.cols + targetX];
  const isOpenResourceOrBase = (targetTile.type === IslandType.Resource || targetTile.type === IslandType.Base)
    && targetTile.resources.length > 0 && targetTile.occupants.length === 0
    && (!targetTile.monsters || targetTile.monsters.length === 0);

  let priority = OTHER_MOVE_PRIORITY;
  if (state.settings.fogOfWar && !bot.revealedTiles.includes(targetTile.id)) {
    priority = FOG_EXPLORE_PRIORITY;
  } else if (isOpenResourceOrBase || targetTile.type === IslandType.Special) {
    priority = OPEN_TILE_MOVE_PRIORITY;
  }

  const base = state.baseTiles.find((b) => b.owner === bot.id);
  if (base && base.x === targetX && base.y === targetY) {
    priority += defendBaseBonus(state, bot, base.x, base.y);
  }
  return priority;
}
