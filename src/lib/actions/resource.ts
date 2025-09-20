
import type { GameState, Army, IslandResource, CardName } from '@/lib/types';
import { ResourceType, GameAction, IslandType } from '../enums';
import { checkAndEndTurnIfNoActions } from './player';

export function handlePositionAction(state: GameState, selectedArmy: Army | null): GameState {
  const { players, currentPlayerIndex, map } = state;
  const player = players[currentPlayerIndex];
  
  if (!selectedArmy) throw new Error("No army selected.");
  if (selectedArmy.hasActed) throw new Error("This army has already acted this turn.");
  if (player.positions.some(p => p.armyId === selectedArmy.id)) {
    throw new Error("This army is already positioned.");
  }
  
  const tile = map[selectedArmy.position.y][selectedArmy.position.x];
  if ((tile.type !== IslandType.Resource && tile.type !== IslandType.Base) || tile.resources.length === 0) {
    throw new Error("You can only position on an island with resources.");
  }
   if (tile.monsters && tile.monsters.length > 0) {
    throw new Error("You cannot position on an island with monsters.");
  }
  
  const availableResources = tile.resources.filter((resource: IslandResource) => {
    return !(tile.positionedBy || []).some(p => p.resource === resource.type);
  });
  if (availableResources.length === 0) {
    throw new Error("All resources on this island are already occupied.");
  }
  
  return { ...state, positionDialogState: { x: selectedArmy.position.x, y: selectedArmy.position.y, resources: availableResources }};
}

export function handleCollectAction(state: GameState, selectedArmy: Army | null): GameState {
  let newState = { ...state };
  const { players, currentPlayerIndex } = newState;
  const player = players[currentPlayerIndex];
  
  if (!selectedArmy) throw new Error("No army selected.");
  if (selectedArmy.hasActed) throw new Error("This army has already acted this turn.");

  const positionIndex = player.positions.findIndex(p => p.armyId === selectedArmy.id);
  if (positionIndex === -1) throw new Error("This army is not positioned on a resource.");

  const position = player.positions[positionIndex];
  const tile = newState.map[position.y][position.x];
  const resourceSpot = tile.resources.find(r => r.type === position.resource);
  if (!resourceSpot) throw new Error("Resource not found on this island.");
  
  const resourceToCollect = { type: resourceSpot.type, amount: resourceSpot.amount };

  const hasProductiveCard = player.specialCards.includes(CardName.Productive) && !player.actionsThisTurn.includes(GameAction.UseCard);

  if (hasProductiveCard) {
      newState.collectDialogState = {
        isOpen: true,
        x: position.x,
        y: position.y,
        resource: resourceToCollect,
        hasProductiveCard: true,
      };
      return newState;
  } else {
    return handleConfirmCollection(newState, false, selectedArmy);
  }
}

export function handleConfirmCollection(state: GameState, useProductive: boolean, selectedArmy: Army | null): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, collectDialogState, discardPile } = newState;
    const player = players[currentPlayerIndex];

    if (!selectedArmy) {
      throw new Error("No army provided for collection confirmation.");
    }
    
    const position = player.positions.find(p => p.armyId === selectedArmy.id);
    if (!position) {
      throw new Error("Position not found to collect from.");
    }

    let resourceToCollect: IslandResource;

    if (collectDialogState && collectDialogState.isOpen) {
        resourceToCollect = collectDialogState.resource;
    } else {
        const tile = map[position.y][position.x];
        const resourceSpot = tile.resources.find(r => r.type === position.resource);
        if (!resourceSpot) throw new Error("No resource information for collection.");
        resourceToCollect = { type: resourceSpot.type, amount: resourceSpot.amount };
    }
    
    let amountToCollect = resourceToCollect.amount;

    if (useProductive) {
        if (!player.specialCards.includes(CardName.Productive) || player.actionsThisTurn.includes(GameAction.UseCard)) {
            throw new Error("Cannot use 'Productive' card.");
        }
        amountToCollect *= 2;
        const cardIndex = player.specialCards.indexOf(CardName.Productive);
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
            player.actionsThisTurn.push(GameAction.UseCard);
        }
        newState.log.push(`${player.name} used 'Productive' to collect double!`);
    }

    player.resources[resourceToCollect.type] += amountToCollect;
    const army = player.armies.find(a => a.id === selectedArmy.id);
    if (army) army.hasActed = true;
    newState.log.push(`${player.name} collected ${amountToCollect} ${resourceToCollect.type}.`);

    const positionIndex = player.positions.findIndex(p => p.armyId === selectedArmy.id);
    if (positionIndex > -1) {
      player.positions.splice(positionIndex, 1);
    }
    
    const tile = map[selectedArmy.position.y][selectedArmy.position.x];
    if (tile.positionedBy) {
        tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === resourceToCollect.type));
    }
    newState.log.push(`${player.name}'s army must be repositioned to collect again.`);

    newState.collectDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export function handleSelectResourceForPosition(state: GameState, resource: ResourceType, selectedArmy: Army | null): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, positionDialogState } = newState;
    const player = players[currentPlayerIndex];

    if (!selectedArmy || !positionDialogState) return { ...state, positionDialogState: null };
    
    const { x, y } = selectedArmy.position;
    player.positions.push({ x, y, resource, armyId: selectedArmy.id });
    
    const tile = newState.map[y][x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    const army = player.armies.find(a => a.id === selectedArmy.id);
    if (army) army.hasActed = true;
    newState.log.push(`${player.name} positioned an army on ${resource}.`);
    
    newState.positionDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
};
