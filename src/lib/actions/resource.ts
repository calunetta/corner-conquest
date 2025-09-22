
import type { GameState, Army, ResourceType, ActionHandlerResult } from '@/lib/types';
import { IslandType, MAP_COLS } from '../types';
import { checkAndEndTurnIfNoActions } from './player';


export function handlePositionAction(state: GameState, selectedArmy: Army | null): ActionHandlerResult {
  const { players, currentPlayerIndex, map } = state;
  const player = players[currentPlayerIndex];
  
  if (!selectedArmy) throw new Error("No army selected.");
  if (selectedArmy.hasActed) throw new Error("This army has already acted this turn.");
  if (player.positions.some(p => p.armyId === selectedArmy.id)) {
    throw new Error("This army is already positioned.");
  }
  
  const tile = map[selectedArmy.position.y * MAP_COLS + selectedArmy.position.x];
  if ((tile.type !== IslandType.Resource && tile.type !== IslandType.Base) || tile.resources.length === 0) {
    throw new Error("You can only position on an island with resources.");
  }
   if (tile.monsters && tile.monsters.length > 0) {
    throw new Error("You cannot position on an island with monsters.");
  }
  
  const availableResources = tile.resources.filter(resource => {
    return !(tile.positionedBy || []).some(p => p.resource === resource.type);
  });
  if (availableResources.length === 0) {
    throw new Error("All resources on this island are already occupied.");
  }
  
  return { newState: { ...state, positionDialogState: { x: selectedArmy.position.x, y: selectedArmy.position.y, resources: availableResources }}, selectedArmyId: selectedArmy.id };
}

export function handleSelectResourceForPosition(state: GameState, resource: ResourceType, selectedArmy: Army | null): ActionHandlerResult {
    let newState = { ...state };
    const { players, currentPlayerIndex, positionDialogState } = newState;
    const player = players[currentPlayerIndex];

    if (!selectedArmy || !positionDialogState) {
        return { newState: { ...state, positionDialogState: null }, selectedArmyId: selectedArmy?.id ?? null };
    }
    
    const { x, y } = selectedArmy.position;
    player.positions.push({ x, y, resource, armyId: selectedArmy.id });
    
    const tile = newState.map[y * MAP_COLS + x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    const army = player.armies.find(a => a.id === selectedArmy.id);
    if (army) army.hasActed = true;
    newState.log.push(`${player.name} positioned an army on ${resource}.`);
    
    newState.positionDialogState = null;

    newState = checkAndEndTurnIfNoActions(newState);
    
    return {newState, selectedArmyId: selectedArmy.id };
};
