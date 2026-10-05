import type { GameState, ResourceType } from '@/lib/types';
import { pushLogEntry } from './log-entry';

/** Positions an army on a resource node so it yields that resource automatically each turn. */
export function handleSelectResourceForPosition(state: GameState, resource: ResourceType, armyId: number): GameState {
  const { players, currentPlayerIndex } = state;
  const player = players[currentPlayerIndex];

  const selectedArmy = player.armies.find((a) => a.id === armyId);
  if (!selectedArmy) {
    throw new Error('Army not found for positioning.');
  }
  if (selectedArmy.hasActed && !player.hasExtraMove) {
    throw new Error('This army has already acted this turn.');
  }

  const { x, y } = selectedArmy.position;
  const tile = state.map[y * state.settings.gridSize.cols + x];
  if (!tile) {
    throw new Error('Target tile not found.');
  }

  const resourceSpot = tile.resources.find((r) => r.type === resource);
  if (!resourceSpot) {
    throw new Error(`Resource ${resource} is not available on this island.`);
  }

  if (!tile.positionedBy) tile.positionedBy = [];
  const alreadyPositioned = tile.positionedBy.some((p) => p.resource === resource);
  if (alreadyPositioned) {
    throw new Error(`The ${resource} spot on this island is already occupied.`);
  }

  player.positions.push({ x, y, resource, armyId: selectedArmy.id });
  tile.positionedBy.push({ playerId: player.id, resource });

  selectedArmy.hasActed = true;
  if (player.hasExtraMove) {
    player.hasExtraMove = false;
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name} used their Extra Move to position Army #${selectedArmy.id + 1} on ${resource}.`,
      playerId: player.playerId,
    });
  } else {
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name} positioned an army on ${resource}.`,
      playerId: player.playerId,
    });
  }

  return state;
}
