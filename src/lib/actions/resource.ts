

import type { GameState, Army, IslandResource, CardName, ActionHandlerResult } from '@/lib/types';
import { ResourceType, GameAction, IslandType, MAP_COLS } from '../types';
import { checkAndEndTurnIfNoActions, canArmyPerformAnyAction } from './player';


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
  
  const availableResources = tile.resources.filter((resource: IslandResource) => {
    return !(tile.positionedBy || []).some(p => p.resource === resource.type);
  });
  if (availableResources.length === 0) {
    throw new Error("All resources on this island are already occupied.");
  }
  
  return { newState: { ...state, positionDialogState: { x: selectedArmy.position.x, y: selectedArmy.position.y, resources: availableResources }}, selectedArmyId: selectedArmy.id };
}

export function handleCollectAction(state: GameState, selectedArmy: Army | null): ActionHandlerResult {
  let newState = { ...state };
  const { players, currentPlayerIndex } = newState;
  const player = players[currentPlayerIndex];
  
  if (!selectedArmy) throw new Error("No army selected.");
  if (selectedArmy.hasActed) throw new Error("This army has already acted this turn.");

  const position = player.positions.find(p => p.armyId === selectedArmy.id);
  if (!position) throw new Error("This army is not positioned on a resource.");

  const tile = newState.map[position.y * MAP_COLS + position.x];
  const resourceSpot = tile.resources.find(r => r.type === position.resource);
  if (!resourceSpot) throw new Error("Resource not found on this island.");
  
  const resourceToCollect = { type: resourceSpot.type, amount: resourceSpot.amount };

  const hasProductiveCard = player.specialCards.includes(CardName.Productive) && !player.actionsThisTurn.includes(GameAction.UseCard);

  newState.collectDialogState = {
    isOpen: true,
    x: position.x,
    y: position.y,
    resource: resourceToCollect,
    hasProductiveCard: hasProductiveCard,
  };
  return { newState, selectedArmyId: selectedArmy.id };
}

export function handleConfirmCollection(state: GameState, useProductive: boolean, armyForCollection: Army | null): ActionHandlerResult {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, collectDialogState, discardPile } = newState;
    const player = players[currentPlayerIndex];

    if (!armyForCollection) {
      throw new Error("No army provided for collection confirmation.");
    }
    
    const position = player.positions.find(p => p.armyId === armyForCollection.id);
    if (!position) {
      throw new Error("Position not found to collect from.");
    }

    let resourceToCollect: IslandResource;

    if (collectDialogState && collectDialogState.isOpen) {
        resourceToCollect = collectDialogState.resource;
    } else {
        const tile = map[position.y * MAP_COLS + position.x];
        const resourceSpot = tile.resources.find(r => r.type === position.resource);
        if (!resourceSpot) throw new Error("No resource information for collection.");
        resourceToCollect = { type: resourceSpot.type, amount: resourceSpot.amount };
    }
    
    let amountToCollect = resourceToCollect.amount;

    if (useProductive) {
        const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);
        if (!player.specialCards.includes(CardName.Productive) || !canUseCard) {
            throw new Error("Cannot use 'Productive' card.");
        }
        amountToCollect *= 2;
        const cardIndex = player.specialCards.indexOf(CardName.Productive);
        if (cardIndex > -1) {
            player.actionsThisTurn.push(GameAction.UseCard);
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
        }
        newState.log.push(`${player.name} used 'Productive' to collect double!`);
    }

    player.resources[resourceToCollect.type] += amountToCollect;
    const army = player.armies.find(a => a.id === armyForCollection.id);
    if (army) army.hasActed = true;
    newState.log.push(`${player.name} collected ${amountToCollect} ${resourceToCollect.type}.`);

    const positionIndex = player.positions.findIndex(p => p.armyId === armyForCollection.id);
    if (positionIndex > -1) {
      player.positions.splice(positionIndex, 1);
    }
    
    const tile = map[armyForCollection.position.y * MAP_COLS + armyForCollection.position.x];
    if (tile.positionedBy) {
        tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === resourceToCollect.type));
    }
    newState.log.push(`${player.name}'s army must be repositioned to collect again.`);

    newState.collectDialogState = null;
    
    const canStillAct = army ? canArmyPerformAnyAction(newState, army) : false;
    if (!canStillAct) {
        newState = checkAndEndTurnIfNoActions(newState);
        return {newState, selectedArmyId: null};
    }

    return {newState, selectedArmyId: army?.id ?? null };
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

    const canStillAct = army ? canArmyPerformAnyAction(newState, army) : false;
    if (!canStillAct) {
        newState = checkAndEndTurnIfNoActions(newState);
        return {newState, selectedArmyId: null};
    }
    
    return {newState, selectedArmyId: selectedArmy.id };
};
