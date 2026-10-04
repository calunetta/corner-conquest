import type { DeathAnimation, GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { PLAYER_DATA } from './player-data';

const COMBAT_WIN_VICTORY_POINTS = 5;

/** Applies the outcome of a resolved player-vs-player combat: VP, army respawn, win check. */
export function handleCloseCombat(state: GameState): GameState {
  const { combatState, players, map, baseTiles, settings } = state;
  if (!combatState || combatState.phase !== 'results' || combatState.winnerId === null) {
    state.combatState = null;
    return state;
  }

  const { winnerId, attackerId, defenderId, attackingArmyId, defendingArmyId } = combatState;
  const loserId = winnerId === attackerId ? defenderId : attackerId;
  // winnerId/loserId are always one of attackerId/defenderId, both guaranteed to be real players.
  const winner = players.find((p) => p.id === winnerId)!;
  const loser = players.find((p) => p.id === loserId)!;

  const attackingArmy = players.find((p) => p.id === attackerId)?.armies.find((a) => a.id === attackingArmyId);

  if (!attackingArmy) {
    state.combatState = null;
    return state;
  }

  const combatTile = map[attackingArmy.position.y * settings.gridSize.cols + attackingArmy.position.x];

  if (loserId === defenderId) {
    winner.victoryPoints += COMBAT_WIN_VICTORY_POINTS;
    state.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);

    const losingArmy = loser.armies.find((a) => a.id === defendingArmyId);
    const baseTile = baseTiles.find((b) => b.owner === loserId);

    if (losingArmy && baseTile) {
      const deathAnim: DeathAnimation = {
        id: `army-${loser.id}-${losingArmy.id}-${Date.now()}`,
        x: losingArmy.position.x,
        y: losingArmy.position.y,
        sprite: PLAYER_DATA[loser.color].sprite.death,
        createdAt: Date.now(),
      };
      state.deathAnimations.push(deathAnim);

      const oldPos = losingArmy.position;
      combatTile.occupants = combatTile.occupants.filter((o) => !(o.armyId === losingArmy.id && o.playerId === loserId));
      losingArmy.position = { x: baseTile.x, y: baseTile.y };
      losingArmy.hasActed = false; // Reset status on respawn
      map[baseTile.y * settings.gridSize.cols + baseTile.x].occupants.push({ playerId: loserId, armyId: losingArmy.id });

      const positionIndex = loser.positions.findIndex((p) => p.armyId === losingArmy.id);
      if (positionIndex > -1) {
        const removedPosition = loser.positions.splice(positionIndex, 1)[0];
        const oldTile = map[oldPos.y * settings.gridSize.cols + oldPos.x];
        if (oldTile?.positionedBy) {
          oldTile.positionedBy = oldTile.positionedBy.filter(
            (p) => !(p.playerId === loserId && p.resource === removedPosition.resource),
          );
        }
      }
    }
  } else {
    // Attacker lost
    winner.victoryPoints += COMBAT_WIN_VICTORY_POINTS;
    state.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);

    const loserArmy = loser.armies.find((a) => a.id === attackingArmyId);
    const baseTile = baseTiles.find((b) => b.owner === loserId);
    if (loserArmy && baseTile) {
      const oldPos = loserArmy.position;
      const deathAnim: DeathAnimation = {
        id: `army-${loser.id}-${loserArmy.id}-${Date.now()}`,
        x: loserArmy.position.x,
        y: loserArmy.position.y,
        sprite: PLAYER_DATA[loser.color].sprite.death,
        createdAt: Date.now(),
      };
      state.deathAnimations.push(deathAnim);

      combatTile.occupants = combatTile.occupants.filter((o) => !(o.armyId === loserArmy.id && o.playerId === loserId));
      loserArmy.position = { x: baseTile.x, y: baseTile.y };
      loserArmy.hasActed = false; // Reset status on respawn
      map[baseTile.y * settings.gridSize.cols + baseTile.x].occupants.push({ playerId: loserId, armyId: loserArmy.id });

      const positionIndex = loser.positions.findIndex((p) => p.armyId === loserArmy.id);
      if (positionIndex > -1) {
        const removedPosition = loser.positions.splice(positionIndex, 1)[0];
        const oldTile = map[oldPos.y * settings.gridSize.cols + oldPos.x];
        if (oldTile?.positionedBy) {
          oldTile.positionedBy = oldTile.positionedBy.filter(
            (p) => !(p.playerId === loserId && p.resource === removedPosition.resource),
          );
        }
      }
    }
  }

  if (winner.victoryPoints >= settings.victoryPointGoal && !state.winner) {
    state.winner = winner;
    state.status = GameStatus.Finished;
    state.log.push(`🎉 ${winner.name} has reached ${winner.victoryPoints} Victory Points and won the game!`);
  }

  state.log.push(`${winner.name} defeated ${loser.name} in battle!`);
  state.combatState = null;

  return state;
}
