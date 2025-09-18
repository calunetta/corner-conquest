


import { doc, deleteDoc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, GameAction, ResourceType, Monster, Army, PassiveAbilities, Player, FirestoreGameState, DeathAnimation } from './types';
import { flattenMap, MAP_COLS, MAP_ROWS } from './game-logic';
import { PLAYER_DATA } from './player-data';

// --- Action Helpers ---

export const getSelectedArmy = (state: GameState): Army | null => {
    if (state.selectedArmyId === null) return null;
    const player = state.players[state.currentPlayerIndex];
    return player.armies.find(a => a.id === state.selectedArmyId) || null;
}


// --- Main Action Handlers ---

export function handlePositionAction(state: GameState): GameState {
  const { players, currentPlayerIndex, map } = state;
  const player = players[currentPlayerIndex];
  const army = getSelectedArmy(state);
  
  if (!army) throw new Error("No army selected.");
  if (army.hasActed) throw new Error("This army has already acted this turn.");
  
  const tile = map[army.position.y][army.position.x];
  if ((tile.type !== 'resource' && tile.type !== 'base') || tile.resources.length === 0) {
    throw new Error("You can only position on an island with resources.");
  }
  if (player.positions.some(p => p.armyId === army.id)) {
    throw new Error("This army is already positioned.");
  }
  
  const availableResources = tile.resources.filter(resource => {
    return !(tile.positionedBy || []).some(p => p.resource === resource.type);
  });
  if (availableResources.length === 0) {
    throw new Error("All resources on this island are already occupied.");
  }
  
  return { ...state, positionDialogState: { x: army.position.x, y: army.position.y, resources: availableResources }};
}

export function handleCollectAction(state: GameState): GameState {
  let newState = { ...state };
  const { players, currentPlayerIndex, map } = newState;
  const player = players[currentPlayerIndex];
  const army = getSelectedArmy(newState);
  
  if (!army) throw new Error("No army selected.");
  if (army.hasActed) throw new Error("This army has already acted this turn.");

  const positionIndex = player.positions.findIndex(p => p.armyId === army.id);
  if (positionIndex === -1) throw new Error("This army is not positioned on a resource.");

  const position = player.positions[positionIndex];
  const tile = map[position.y][position.x];
  const resourceSpot = tile.resources.find(r => r.type === position.resource);
  if (!resourceSpot) throw new Error("Resource not found on this island.");
  
  const resourceYield = newState.settings.baseResourceAmount;
  const resourceToCollect = { type: resourceSpot.type, amount: resourceSpot.amount * resourceYield };

  const hasProductiveCard = player.specialCards.includes('Productive') && !player.actionsThisTurn.includes('use-card');

  // If the player has the card, show the dialog. Otherwise, collect directly.
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
    // Perform collection directly
    player.resources[resourceToCollect.type] += resourceToCollect.amount;
    army.hasActed = true;
    newState.log.push(`${player.name} collected ${resourceToCollect.amount} ${resourceToCollect.type}.`);

    // Remove the position after collecting
    player.positions.splice(positionIndex, 1);
    if (tile.positionedBy) {
        tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === resourceToCollect.type));
    }
    newState.log.push(`${player.name}'s army must be repositioned to collect again.`);
    
    return { ...newState, currentAction: null, possibleMoves: [], selectedTile: null };
  }
}

export function handleConfirmCollection(state: GameState, useProductive: boolean): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map, collectDialogState, specialCardsDeck } = newState;
    const player = players[currentPlayerIndex];
    const army = getSelectedArmy(newState);

    if (!collectDialogState || !army) return newState;

    const { resource } = collectDialogState;

    const positionIndex = player.positions.findIndex(p => p.armyId === army.id);
    if (positionIndex === -1) {
        throw new Error("Position not found to collect from.");
    }
    
    let amountToCollect = resource.amount;

    if (useProductive) {
        if (!player.specialCards.includes('Productive') || player.actionsThisTurn.includes('use-card')) {
            throw new Error("Cannot use 'Productive' card.");
        }
        amountToCollect *= 2;
        const cardIndex = player.specialCards.indexOf('Productive');
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            specialCardsDeck.push(usedCard);
            player.actionsThisTurn.push('use-card');
        }
        newState.log.push(`${player.name} used 'Productive' to collect double!`);
    }

    player.resources[resource.type] += amountToCollect;
    army.hasActed = true;
    newState.log.push(`${player.name} collected ${amountToCollect} ${resource.type}.`);

    // Remove the position after collecting
    player.positions.splice(positionIndex, 1);
    const tile = map[army.position.y][army.position.x];
    if (tile.positionedBy) {
        tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === resource.type));
    }
    newState.log.push(`${player.name}'s army must be repositioned to collect again.`);

    // Close the dialog and reset state
    return { ...newState, collectDialogState: null, currentAction: null, possibleMoves: [], selectedTile: null };
}

export function handleDeployAction(state: GameState): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map, specialCardsDeck, settings } = newState;
    const player = players[currentPlayerIndex];
    
    if (player.actionsThisTurn.includes('deploy')) throw new Error("You can only deploy one army per turn.");
    
    let cost = player.nextArmyCost;
    
    if (player.efficientActive) {
        cost = Math.ceil(cost / 2);
    }
    if (player.reinforceActive) {
        cost = 0;
    }

    if (player.resources.food < cost) throw new Error(`Not enough food. Cost: ${cost}`);
    if (player.armyCount >= 5) throw new Error("You have reached the maximum army size.");

    player.resources.food -= cost;
    player.armyCount += 1;
    const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
    const newArmy: Army = { id: newArmyId, position: {x: 0, y: 0}, hasActed: true }; // New army has "acted" this turn
    
    const baseTile = map.flat().find(t => t.type === 'base' && t.owner === player.id);
    if (!baseTile) throw new Error("Base not found!");
    newArmy.position = {x: baseTile.x, y: baseTile.y};

    player.armies.push(newArmy);
    map[baseTile.y][baseTile.x].occupants.push({ playerId: player.id, armyId: newArmy.id });
    
    const canUseCard = !player.actionsThisTurn.includes('use-card');

    if (player.efficientActive && canUseCard) {
      newState.log.push(`${player.name} used 'Efficient' for a cheaper deployment!`);
      player.efficientActive = false;
      player.actionsThisTurn.push('use-card');
      const cardIndex = player.specialCards.indexOf('Efficient');
      if (cardIndex > -1) {
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          specialCardsDeck.push(usedCard);
      }
    }

    if (player.reinforceActive && canUseCard) {
      newState.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
      player.reinforceActive = false;
      player.actionsThisTurn.push('use-card');
      const cardIndex = player.specialCards.indexOf('Reinforce');
      if (cardIndex > -1) {
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          specialCardsDeck.push(usedCard);
      }
    }

    if (!player.reinforceActive) {
        player.nextArmyCost += settings.deployCostIncrement;
    }
    
    player.actionsThisTurn.push('deploy');
    newState.log.push(`${player.name} deployed a new army!`);
    
    return { ...newState, currentAction: null };
}

export function handleBuyCardAction(state: GameState): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, specialCardsDeck } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes('buy-card')) throw new Error("You can only buy one card per turn.");
    if (player.resources.gems < 10) throw new Error("Not enough gems to buy a card.");
    if (specialCardsDeck.length === 0) throw new Error("There are no special cards left in the deck.");
    if (player.specialCards.length >= 10 && !newState.debugMode) throw new Error("You have reached the maximum of 10 cards.");

    player.resources.gems -= 10;
    const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
    const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
    player.specialCards.push(drawnCard);
    player.actionsThisTurn.push('buy-card');
    newState.log.push(`${player.name} bought a special card: "${drawnCard}"!`);

    return { ...newState, currentAction: null };
}

export function handleUpgradeAction(state: GameState): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, specialCardsDeck, settings } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes('upgrade')) throw new Error("You can only upgrade once per turn.");
    if (player.attackPower >= 4) throw new Error("You have reached the maximum attack power.");

    let cost = settings.upgradeCost;
    if (player.masterBuilderActive) {
        cost = Math.ceil(cost / 2);
    }
    if (player.resources.iron < cost) throw new Error(`Not enough iron. Cost: ${cost}`);
    
    player.resources.iron -= cost;
    player.attackPower += 1;

    if (player.masterBuilderActive) {
      newState.log.push(`${player.name} used 'Master Builder' for a cheaper upgrade!`);
      player.masterBuilderActive = false;
      const canUseCard = !player.actionsThisTurn.includes('use-card');
      if (canUseCard) {
          player.actionsThisTurn.push('use-card');
          const cardIndex = player.specialCards.indexOf('Master Builder');
          if (cardIndex > -1) {
              const usedCard = player.specialCards.splice(cardIndex, 1)[0];
              specialCardsDeck.push(usedCard);
          }
      }
    }

    player.actionsThisTurn.push('upgrade');
    newState.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower + 1}.`);
    
    return { ...newState, currentAction: null };
}

export function handleAttackAction(state: GameState): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map } = newState;
    const attacker = players[currentPlayerIndex];
    const army = getSelectedArmy(newState);

    if (!army) throw new Error("No army selected.");
    if (army.hasActed) throw new Error("This army has already acted this turn.");

    const currentTile = map[army.position.y][army.position.x];
    const otherPlayersOccupants = currentTile.occupants.filter(o => o.playerId !== attacker.id);

    if (otherPlayersOccupants.length > 0) {
        const defenderPlayerId = otherPlayersOccupants[0].playerId;
        const defendingPlayer = players.find(p => p.id === defenderPlayerId);

        if (!defendingPlayer) {
            throw new Error("Defending player not found.");
        }

        const defendingArmies = otherPlayersOccupants
            .map(o => defendingPlayer.armies.find(a => a.id === o.armyId))
            .filter((a): a is Army => !!a);

        if (defendingArmies.length === 1) {
            newState.combatState = {
                attackerId: attacker.id,
                defenderId: defendingPlayer.id,
                defendingArmyId: defendingArmies[0].id,
                attackerRolls: [],
                defenderRolls: [],
                winnerId: null,
                phase: 'rolling',
            };
        } else {
            newState.attackSelectionDialogState = {
                isOpen: true,
                x: army.position.x,
                y: army.position.y,
                defendingPlayer: defendingPlayer,
                armies: defendingArmies,
            };
        }
    } else if (currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0) {
      newState.monsterCombatState = {
        attackerId: attacker.id,
        monster: currentTile.monsters[0], 
        attackerRolls: [],
        monsterRolls: [],
        winnerId: null,
        phase: 'rolling',
        useDecideDiceRollCard: false,
        decidedRollValue: 1,
      };
    } else {
        throw new Error("There is nothing to attack on this island.");
    }
    return { ...newState, currentAction: 'attack', possibleMoves: [], selectedTile: null };
}

export function handleEndTurn(state: GameState): GameState {
    let newState = JSON.parse(JSON.stringify(state)); // Deep copy to prevent mutation issues
    let currentPlayer = newState.players[newState.currentPlayerIndex];
    
    // --- Passive Ability Logic at end of turn ---
    if (currentPlayer.passiveAbilities.explorer) {
        const occupiedIslands = new Set<string>();
        currentPlayer.armies.forEach((army: Army) => {
            const tile = newState.map[army.position.y][army.position.x];
            occupiedIslands.add(tile.id);
        });
        const vpGained = occupiedIslands.size;
        if (vpGained > 0) {
            currentPlayer.victoryPoints += vpGained;
            newState.log.push(`${currentPlayer.name}'s Explorer ability generated ${vpGained} VP.`);
        }
    }
    
    if (currentPlayer.passiveAbilities.collector) {
        let resourcesCollected: Partial<Record<ResourceType, number>> = {};
        const occupiedIslands = new Set<string>();
        
        currentPlayer.armies.forEach((army: Army) => {
            const tile = newState.map[army.position.y][army.position.x];
            if (occupiedIslands.has(tile.id)) return;
            
            if ((tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0) {
                occupiedIslands.add(tile.id);
                tile.resources.forEach((resource: { type: ResourceType; }) => {
                    currentPlayer.resources[resource.type] += 1;
                    resourcesCollected[resource.type] = (resourcesCollected[resource.type] || 0) + 1;
                });
            }
        });

        const collectedStrings = Object.entries(resourcesCollected).map(([type, amount]) => `${amount} ${type}`);
        if(collectedStrings.length > 0) {
            newState.log.push(`${currentPlayer.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`);
        }
    }
    
    // Reset flags for the player whose turn just ended
    currentPlayer.hasExtraMove = false;
    currentPlayer.efficientActive = false;
    currentPlayer.masterBuilderActive = false;
    currentPlayer.reinforceActive = false;


    // Determine the next player
    let nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;

    // Handle Sabotage by skipping turns
    let nextPlayer = newState.players[nextPlayerIndex];
    if (nextPlayer.isSabotaged) {
        nextPlayer.isSabotaged = false; // Consume the sabotage flag
        newState.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        
        // Advance to the player after the skipped one
        nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
    }
    
    // Set up for the new current player
    newState.currentPlayerIndex = nextPlayerIndex;
    const finalNextPlayer = newState.players[nextPlayerIndex];


    if (newState.currentPlayerIndex === 0) {
      newState.turn += 1;
    }

    // Reset action flags for the new player's armies
    finalNextPlayer.armies.forEach(army => army.hasActed = false);
    finalNextPlayer.actionsThisTurn = [];
    
    newState.log.push(`It's now ${finalNextPlayer.name}'s turn.`);
    
    if (finalNextPlayer.armies.length === 1) {
        newState.selectedArmyId = finalNextPlayer.armies[0].id;
    } else {
        newState.selectedArmyId = null;
    }

    return { ...newState, currentAction: null, possibleMoves: [], selectedTile: null, teleportState: null };
}

// --- UI Interaction Handlers ---

function setPossibleMoves(state: GameState, x: number, y: number): GameState {
    const newState = { ...state };
    const { map } = newState;
    const mapRows = map.length;
    const mapCols = map[0].length;
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    const newlySelectedArmy = getSelectedArmy(newState);

    if (newlySelectedArmy?.hasActed && !currentPlayer.hasExtraMove) {
        newState.possibleMoves = [];
        newState.currentAction = null;
        return newState;
    }

    newState.currentAction = 'move';
    let moves = [];
    const moveRadius = 2;
    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < mapCols && newY >= 0 && newY < mapRows) {
                    const targetTile = newState.map[newY][newX];
                    if (targetTile.type === 'resource' && targetTile.resources.length === 0 && (!targetTile.monsters || targetTile.monsters.length === 0)) {
                        continue;
                    }
                    moves.push({ x: newX, y: newY });
                }
            }
        }
    }
    newState.possibleMoves = moves.filter(move => {
        const tile = newState.map[move.y][move.x];
        return tile.type !== 'base' || tile.owner === currentPlayer.id;
    });
    return newState;
}

function revealIsland(state: GameState, x: number, y: number, player: Player): GameState {
    let newState = { ...state };
    const tile = newState.map[y][x];

    if (!tile.isHidden) return newState;
    
    tile.isHidden = false;
    player.victoryPoints += state.settings.vpPerIslandDiscovery;
    if (state.settings.vpPerIslandDiscovery > 0) {
        newState.log.push(`${player.name} discovered a new island and gains ${state.settings.vpPerIslandDiscovery} VP!`);
    }

    if (tile.type === 'special' && (player.specialCards.length < 10 || newState.debugMode) && newState.specialCardsDeck.length > 0) {
        const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
        const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
        player.specialCards.push(drawnCard);
        newState.log.push(`${player.name} discovered a special island and found a card: "${drawnCard}"!`);
    } else if (tile.type === 'special') {
        newState.log.push(`${player.name} discovered a special island, but their hand was full or no cards were left!`);
    }
    
    return newState;
}


export function handleTileClick(state: GameState, x: number, y: number, localPlayerId: number): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, possibleMoves, teleportState, scoutingState } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const clickedTile = newState.map[y][x];

    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);
    const selectedArmy = getSelectedArmy(newState);
    
    // Priority 1: Handle a confirmed move action.
    if (selectedArmy && isPossibleMove) {
        return handleMoveAction(newState, x, y);
    }
    
    // Priority 2: Handle scouting.
    if (scoutingState && scoutingState.count > 0 && clickedTile.isHidden) {
        newState = revealIsland(newState, x, y, currentPlayer);
        scoutingState.count--;
        newState.log.push(`${currentPlayer.name} revealed a tile at (${x},${y}) with Scout. ${scoutingState.count} reveals left.`);
        if (scoutingState.count === 0) {
            newState.scoutingState = null;
            newState.log.push(`Scouting complete.`);
            const canUseCard = !currentPlayer.actionsThisTurn.includes('use-card');
            if (canUseCard) {
                currentPlayer.actionsThisTurn.push('use-card');
                const cardIndex = currentPlayer.specialCards.indexOf('Scout');
                if (cardIndex > -1) {
                    const usedCard = currentPlayer.specialCards.splice(cardIndex, 1)[0];
                    newState.specialCardsDeck.push(usedCard);
                }
            }
        }
        return newState;
    }
    
    // Priority 3: Handle special actions like teleporting.
    if (teleportState) {
        if (teleportState.armyId === null) {
            // First step of teleport: select an army
            const armiesOnTile = clickedTile.occupants
                .filter(o => o.playerId === currentPlayer.id)
                .map(o => currentPlayer.armies.find(a => a.id === o.armyId))
                .filter((a): a is Army => !!a);

            if (armiesOnTile.length === 0) {
                throw new Error("You must select a tile with one of your own armies.");
            }
            if (armiesOnTile.length === 1) {
                newState.teleportState.armyId = armiesOnTile[0]!.id;
                newState.currentAction = 'teleport-initiated';
            } else {
                 newState.armySelectionDialogState = { isOpen: true, x, y, armies: armiesOnTile };
            }
        } else {
            // Second step of teleport: select destination
            newState = handleTeleport(newState, x, y);
        }
        return newState;
    }
    
    // Priority 4: Handle selection of a new army.
    const armiesOnTile = clickedTile.occupants
        .filter(o => o.playerId === currentPlayer.id)
        .map(o => currentPlayer.armies.find(a => a.id === o.armyId))
        .filter((army): army is Army => !!army);

    if (armiesOnTile.length > 0) {
        if (armiesOnTile.length === 1) {
            newState.selectedArmyId = armiesOnTile[0].id;
            newState.selectedTile = {x, y};
            newState = setPossibleMoves(newState, x, y);
        } else {
            // Open selection dialog if multiple armies are on the same tile.
            newState.armySelectionDialogState = { isOpen: true, x, y, armies: armiesOnTile };
        }
        return newState;
    }
    
    // Fallback: If no action is taken, deselect everything.
    newState.selectedArmyId = null;
    newState.selectedTile = null;
    newState.possibleMoves = [];
    newState.currentAction = null;

    return newState;
}


export function handleSelectArmy(state: GameState, armyId: number): GameState {
    let newState = { ...state };
    const { armySelectionDialogState } = newState;
    
    if (!armySelectionDialogState) return newState;

    newState.selectedArmyId = armyId;
    newState.selectedTile = { x: armySelectionDialogState.x, y: armySelectionDialogState.y };

    if (newState.teleportState) {
        newState.teleportState.armyId = armyId;
        newState.currentAction = 'teleport-initiated';
    } else {
        newState = setPossibleMoves(newState, armySelectionDialogState.x, armySelectionDialogState.y);
    }
    
    newState.armySelectionDialogState = null; // Close dialog
    return newState;
}

function handleMoveAction(state: GameState, x: number, y: number): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, specialCardsDeck } = newState;
    const player = players[currentPlayerIndex];
    const army = getSelectedArmy(newState);

    if (!army) return state;
    
    if (army.hasActed && !player.hasExtraMove) {
        throw new Error("This army has already acted this turn.");
    }
    
    const oldTile = map[army.position.y][army.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== army.id);
    
    const positionIndex = player.positions.findIndex(p => p.armyId === army.id);
    if (positionIndex > -1) {
        const removedPosition = player.positions.splice(positionIndex, 1)[0];
        if(oldTile.positionedBy) {
            oldTile.positionedBy = oldTile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === removedPosition.resource));
        }
        newState.log.push(`${player.name}'s army moved and is no longer positioned on ${removedPosition.resource}.`);
    }

    army.position = { x, y };
    const targetTile = newState.map[y][x];
    targetTile.occupants.push({ playerId: player.id, armyId: army.id });
    
    const wasHidden = targetTile.isHidden;
    if (wasHidden) {
        newState = revealIsland(newState, x, y, player);
    }
    
    if (targetTile.type === 'special' && (player.specialCards.length < 10 || newState.debugMode) && newState.specialCardsDeck.length > 0) {
        const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
        const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
        player.specialCards.push(drawnCard);
        newState.log.push(`${player.name} landed on a special island and found a card: "${drawnCard}"!`);
    } else if (targetTile.type === 'special') {
        newState.log.push(`${player.name} landed on a special island, but their hand was full or no cards were left!`);
    }
    
    if (player.hasExtraMove) {
        player.hasExtraMove = false; // Consume the flag
        newState.log.push(`${player.name} used their Extra Move!`);
        
        const canUseCard = !player.actionsThisTurn.includes('use-card');
        if (canUseCard) {
            player.actionsThisTurn.push('use-card');
            const cardIndex = player.specialCards.indexOf('Extra Move');
            if (cardIndex > -1) {
                const usedCard = player.specialCards.splice(cardIndex, 1)[0];
                specialCardsDeck.push(usedCard);
            }
        }
        
        // After the extra move, mark all armies as having acted.
        player.armies.forEach(a => a.hasActed = true);

    } else {
        army.hasActed = true;
    }
    
    newState.currentAction = null;
    newState.possibleMoves = [];
    newState.selectedTile = {x, y};
    return newState;
}

// --- Dialog-related Actions ---

export function handleSelectResourceForPosition(state: GameState, resource: ResourceType): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, positionDialogState } = newState;
    const player = players[currentPlayerIndex];
    const army = getSelectedArmy(newState);

    if (!army || !positionDialogState) return { ...state, positionDialogState: null, currentAction: null };
    
    const { x, y } = army.position;
    player.positions.push({ x, y, resource, armyId: army.id });
    
    const tile = newState.map[y][x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    army.hasActed = true;
    newState.log.push(`${player.name} positioned an army on ${resource}.`);
    
    return { ...state, positionDialogState: null, currentAction: null, possibleMoves: [], selectedTile: null };
};

export function handleSelectDefender(state: GameState, defenderArmyId: number): GameState {
    let newState = { ...state };
    const { attackSelectionDialogState, players, currentPlayerIndex } = newState;

    if (!attackSelectionDialogState) return newState;

    const attacker = players[currentPlayerIndex];
    const defender = attackSelectionDialogState.defendingPlayer;

    newState.combatState = {
        attackerId: attacker.id,
        defenderId: defender.id,
        defendingArmyId: defenderArmyId,
        attackerRolls: [],
        defenderRolls: [],
        winnerId: null,
        phase: 'rolling',
    };

    newState.attackSelectionDialogState = null;
    return newState;
}

export function handleCombatRoll(state: GameState, useWarChief: boolean): GameState {
    if (!state.combatState) return state;
    const newState = { ...state };
    const { combatState, players, specialCardsDeck } = newState;
    const attacker = players[combatState.attackerId];
    const defender = players[combatState.defenderId];

    let attackerBonusPower = 0;
    const canUseCard = !attacker.actionsThisTurn.includes('use-card');

    if (useWarChief && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf('War Chief');
        if (cardIndex > -1) {
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            specialCardsDeck.push(usedCard);
            attacker.actionsThisTurn.push('use-card');
            attackerBonusPower += 2;
            newState.log.push(`${attacker.name} used 'War Chief' for +2 power!`);
        }
    }

    const rollDice = (count: number) => Array.from({ length: Math.max(1, Math.min(count, 6)) }, () => Math.floor(Math.random() * 6) + 1);

    combatState.attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
    combatState.defenderRolls = rollDice(defender.attackPower + 1);
    
    const attackerScore = combatState.attackerRolls.reduce((a, b) => a + b, 0);
    const defenderScore = combatState.defenderRolls.reduce((a, b) => a + b, 0);

    combatState.winnerId = attackerScore > defenderScore ? combatState.attackerId : combatState.defenderId;
    combatState.phase = 'results';
    return newState;
};

export function handleCloseCombat(state: GameState): GameState {
    const newState = { ...state };
    const { combatState, players, map } = newState;
    if (!combatState) return { ...newState, combatState: null, currentAction: null };

    if (combatState.winnerId === null) return { ...newState, combatState: null, currentAction: null };
    
    const { winnerId, attackerId, defenderId, defendingArmyId } = combatState;
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players.find(p => p.id === winnerId)!;
    const loser = players.find(p => p.id === loserId)!;
    
    const attackingArmy = players[attackerId].armies.find(a => a.id === state.selectedArmyId);
    if (!attackingArmy) return { ...newState, combatState: null, currentAction: null };
    
    attackingArmy.hasActed = true;

    const combatTile = map[attackingArmy.position.y][attackingArmy.position.x];

    if (loserId === defenderId) {
        const losingArmy = loser.armies.find(a => a.id === defendingArmyId);
        const baseTile = map.flat().find(t => t.type === 'base' && t.owner === loserId);

        if (losingArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${loser.id}-${losingArmy.id}`,
                x: losingArmy.position.x,
                y: losingArmy.position.y,
                sprite: PLAYER_DATA[loser.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);

            const oldPos = losingArmy.position;
            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === losingArmy.id && o.playerId === loserId));
            losingArmy.position = {x: baseTile.x, y: baseTile.y};
            map[baseTile.y][baseTile.x].occupants.push({playerId: loserId, armyId: losingArmy.id});
            
            const positionIndex = loser.positions.findIndex(p => p.armyId === losingArmy.id);
            if (positionIndex > -1) {
                const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                if (map[oldPos.y][oldPos.x].positionedBy) {
                    map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x]!.filter(p => !(p.playerId === loserId && p.resource === removedPosition.resource));
                }
            }
        }
    } else { // Attacker lost
        const baseTile = map.flat().find(t => t.type === 'base' && t.owner === loserId);
         if (attackingArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${loser.id}-${attackingArmy.id}`,
                x: attackingArmy.position.x,
                y: attackingArmy.position.y,
                sprite: PLAYER_DATA[loser.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);

            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === attackingArmy.id && o.playerId === loserId));
            attackingArmy.position = {x: baseTile.x, y: baseTile.y};
            map[baseTile.y][baseTile.x].occupants.push({playerId: loserId, armyId: attackingArmy.id});
         }
    }


    newState.log.push(`${winner.name} defeated ${loser.name} in battle!`);
    return { ...newState, combatState: null, currentAction: null };
}

export function handleMonsterCombatRoll(state: GameState, monster: Monster, useDecideCard: boolean, decidedValue: number, useOvercomeCard: boolean, useWarChief: boolean): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map, specialCardsDeck } = newState;
    const attacker = players[currentPlayerIndex];
    const attackingArmy = getSelectedArmy(newState);
    if (!attackingArmy) return newState;

    let attackerRolls: number[] = [];
    let monsterRolls: number[] = [];
    let winnerId: number | null = null;
    
    const canUseCard = !attacker.actionsThisTurn.includes('use-card');
    let cardUsedThisAction = false;

    if (useOvercomeCard && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf('Overcome');
        if (cardIndex > -1) {
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            specialCardsDeck.push(usedCard);
            attacker.actionsThisTurn.push('use-card');
            newState.log.push(`${attacker.name} used the 'Overcome' card to win automatically!`);
            winnerId = attacker.id;
            cardUsedThisAction = true;
        } else {
             throw new Error("Overcome card not found, but was attempted to be used.");
        }
    }

    if (winnerId === null) { 
        let attackerBonusPower = 0;
        
        if (useWarChief && canUseCard && !cardUsedThisAction) {
             const cardIndex = attacker.specialCards.indexOf('War Chief');
             if (cardIndex > -1) {
                const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
                specialCardsDeck.push(usedCard);
                attacker.actionsThisTurn.push('use-card');
                attackerBonusPower += 2;
                cardUsedThisAction = true;
                newState.log.push(`${attacker.name} used 'War Chief' for +2 power!`);
             }
        }

        if (useDecideCard && canUseCard && !cardUsedThisAction) {
            const cardIndex = attacker.specialCards.indexOf('Decide Dice Roll');
            if (cardIndex > -1) {
                const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
                specialCardsDeck.push(usedCard);
                attacker.actionsThisTurn.push('use-card');
                newState.log.push(`${attacker.name} used the 'Decide Dice Roll' card!`);
                cardUsedThisAction = true;
            } else {
                useDecideCard = false;
            }
        } else if (useDecideCard) {
            useDecideCard = false;
        }
        
        const rollDice = (count: number) => Array.from({ length: Math.max(1, Math.min(count, 6)) }, () => Math.floor(Math.random() * 6) + 1);

        attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
        if(useDecideCard) attackerRolls[0] = decidedValue; 

        monsterRolls = rollDice(monster.level);
        const attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
        const monsterScore = monsterRolls.reduce((a, b) => a + b, 0);
        winnerId = attackerScore >= monsterScore ? attacker.id : null;
    }
    
    attackingArmy.hasActed = true;

    newState.monsterCombatState = {
      attackerId: attacker.id,
      monster,
      attackerRolls,
      monsterRolls,
      winnerId: winnerId,
      phase: 'results',
      useDecideDiceRollCard: useDecideCard,
      decidedRollValue: decidedValue,
    };
    return newState;
};

export function handleCloseMonsterCombat(state: GameState): GameState {
    const newState = { ...state };
    if (!newState.monsterCombatState) return { ...newState, monsterCombatState: null, currentAction: null };
    
    const { winnerId, monster, attackerId } = newState.monsterCombatState;
    const attacker = newState.players[attackerId];
    const attackingArmy = getSelectedArmy(newState);
    if (!attackingArmy) return { ...newState, monsterCombatState: null, currentAction: null };

    const currentTile = newState.map[attackingArmy.position.y][attackingArmy.position.x];

    if (winnerId === attacker.id) {
        const monsterVP = [0, 2, 5, 7, 10][monster.level] || 0;
        attacker.victoryPoints += monsterVP;
        
        const deathAnim: DeathAnimation = {
            id: `monster-${currentTile.x}-${currentTile.y}-${monster.name}`,
            x: currentTile.x,
            y: currentTile.y,
            sprite: monster.sprite.death
        };
        newState.deathAnimations.push(deathAnim);

        currentTile.monsters = (currentTile.monsters || []).filter(m => m.name !== monster.name);
        newState.log.push(`${attacker.name} defeated the ${monster.name} for ${monsterVP} VP!`);
        
        if (currentTile.monsters?.length === 0) {
          currentTile.type = 'resource';
          const resourceTypes: ResourceType[] = ['food', 'iron', 'gems'];
          const randomResource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
          currentTile.resources.push({ type: randomResource, amount: 1 });
          newState.log.push(`The defeated monster's den revealed a cache of ${randomResource}!`);
        }
    } else {
        const baseTile = newState.map.flat().find(t => t.type === 'base' && t.owner === attacker.id);
        if (baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${attacker.id}-${attackingArmy.id}`,
                x: attackingArmy.position.x,
                y: attackingArmy.position.y,
                sprite: PLAYER_DATA[attacker.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);
            
            const oldPos = attackingArmy.position;
            newState.map[oldPos.y][oldPos.x].occupants = newState.map[oldPos.y][oldPos.x].occupants.filter(o => o.armyId !== attackingArmy.id);
            attackingArmy.position = {x: baseTile.x, y: baseTile.y};
            newState.map[baseTile.y][baseTile.x].occupants.push({playerId: attacker.id, armyId: attackingArmy.id});
        }
        newState.log.push(`${attacker.name} was defeated by the monster!`);
    }

    return { ...newState, monsterCombatState: null, currentAction: null };
}

export const handleOpenUseCardDialog = (state: GameState, cardName: string) => {
    return { ...state, useCardDialogState: { cardName }, showCardsDialogForPlayer: null };
};

export const handleUseCard = (state: GameState, cardName: string) => {
    let newState = { ...state };
    const { players, currentPlayerIndex, specialCardsDeck } = newState;
    const player = players[currentPlayerIndex];

    const canUseCard = !player.actionsThisTurn.includes('use-card');

    if (!canUseCard) {
        newState.log.push(`Error: You can only use one card per turn.`);
        return { ...newState, useCardDialogState: null, showCardsDialogForPlayer: null };
    }
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) {
         newState.log.push(`Error: You do not have the ${cardName} card.`);
         return { ...newState, useCardDialogState: null, showCardsDialogForPlayer: null };
    }
    
    switch (cardName) {
        case 'Extra Move':
            player.hasExtraMove = true;
            newState.log.push(`${player.name} activated 'Extra Move'. One army can move again this turn.`);
            break;
        case 'Teleport':
            newState.teleportState = { armyId: null };
            break;
        case 'Sabatoge':
            newState.sabotageDialogState = { isOpen: true };
            break;
        case 'Reinforce':
            player.reinforceActive = true;
            newState.log.push(`${player.name} activated 'Reinforce'. Their next deployment is free.`);
            break;
        case 'Scout':
            newState.scoutingState = { count: 3 };
            newState.log.push(`${player.name} activated 'Scout'. Click 3 hidden tiles to reveal them.`);
            break;
        case 'Wealthy':
            newState.wealthyDialogState = { isOpen: true };
            break;
        case 'Efficient':
            player.efficientActive = true;
            newState.log.push(`${player.name} activated 'Efficient'. Their next deployment costs 50% less.`);
            break;
        case 'Master Builder':
            player.masterBuilderActive = true;
            newState.log.push(`${player.name} activated 'Master Builder'. Their next upgrade costs 50% less.`);
            break;
        default:
            // For cards with no immediate state change, we still need to recycle them.
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            specialCardsDeck.push(usedCard);
            player.actionsThisTurn.push('use-card');
            newState.log.push(`${player.name} used the '${cardName}' card.`);
            break;
    }

    return { ...newState, useCardDialogState: null, showCardsDialogForPlayer: null };
};

export const handleSabotagePlayer = (state: GameState, targetPlayerId: number): GameState => {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        const canUseCard = !player.actionsThisTurn.includes('use-card');
        if (!canUseCard) {
            throw new Error("You have already used a card this turn.");
        }
        targetPlayer.isSabotaged = true;
        player.actionsThisTurn.push('use-card');
        const cardIndex = player.specialCards.indexOf('Sabatoge');
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            newState.specialCardsDeck.push(usedCard);
        }

        newState.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
    }
    return { ...newState, sabotageDialogState: null };
}

export const handleGainWealth = (state: GameState, resource: ResourceType): GameState => {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    const canUseCard = !player.actionsThisTurn.includes('use-card');
    if (!canUseCard) {
        throw new Error("You have already used a card this turn.");
    }
    
    player.resources[resource] += 5;
    player.actionsThisTurn.push('use-card');
    
    const cardIndex = player.specialCards.indexOf('Wealthy');
    if (cardIndex > -1) {
        const usedCard = player.specialCards.splice(cardIndex, 1)[0];
        newState.specialCardsDeck.push(usedCard);
    }
    
    newState.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    return { ...newState, wealthyDialogState: null };
}


export const handleStealResource = (state: GameState, targetPlayerId: number, resource: ResourceType) => {
    const newState = { ...state };
    const { players, currentPlayerIndex, specialCardsDeck } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === targetPlayerId);

    const canUseCard = !currentPlayer.actionsThisTurn.includes('use-card');
    if (!canUseCard) {
        newState.log.push(`Error: You can only use one card per turn.`);
        return { ...newState, stealResourceDialogState: null };
    }

    if (!targetPlayer) return { ...newState, stealResourceDialogState: null };
    
    const cardIndex = currentPlayer.specialCards.indexOf('Steal Resource');
    if (cardIndex === -1) {
        newState.log.push(`Error: ${currentPlayer.name} tried to steal without the card.`);
        return { ...newState, stealResourceDialogState: null };
    }
    
    const usedCard = currentPlayer.specialCards.splice(cardIndex, 1)[0];
    specialCardsDeck.push(usedCard);
    currentPlayer.actionsThisTurn.push('use-card');

    const stolenAmount = Math.min(targetPlayer.resources[resource], 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[resource] -= stolenAmount;
        currentPlayer.resources[resource] += stolenAmount;
        newState.log.push(`${currentPlayer.name} stole ${stolenAmount} ${resource} from ${targetPlayer.name}!`);
    } else {
        newState.log.push(`${currentPlayer.name} tried to steal ${resource} from ${targetPlayer.name}, but they had none.`);
    }

    return { ...newState, stealResourceDialogState: null };
};

export const handleTeleport = (state: GameState, x: number, y: number): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex, teleportState, map, specialCardsDeck } = newState;
    const player = players[currentPlayerIndex];

    if (!teleportState || teleportState.armyId === null) return newState;
    
    const canUseCard = !player.actionsThisTurn.includes('use-card');
    if (!canUseCard) {
        throw new Error("You have already used a card this turn.");
    }

    const armyToMove = player.armies.find(a => a.id === teleportState.armyId);
    if (!armyToMove) return newState;

    const cardIndex = player.specialCards.indexOf('Teleport');
    if (cardIndex === -1) {
        throw new Error('Teleport card not found.');
    }
    
    const usedCard = player.specialCards.splice(cardIndex, 1)[0];
    specialCardsDeck.push(usedCard);
    player.actionsThisTurn.push('use-card');
    
    const oldTile = map[armyToMove.position.y][armyToMove.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== armyToMove.id);

    armyToMove.position = { x, y };
    const targetTile = map[y][x];
    targetTile.occupants.push({ playerId: player.id, armyId: armyToMove.id });
    
    const wasHidden = targetTile.isHidden;
    if (wasHidden) {
        newState = revealIsland(newState, x, y, player);
    }
    
    if (targetTile.type === 'special' && (player.specialCards.length < 10 || newState.debugMode) && newState.specialCardsDeck.length > 0) {
        const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
        const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
        player.specialCards.push(drawnCard);
        newState.log.push(`${player.name} teleported to a special island and found a card: "${drawnCard}"!`);
    } else if (targetTile.type === 'special') {
        newState.log.push(`${player.name} teleported to a special island, but their hand was full or no cards were left!`);
    }
    
    newState.log.push(`${player.name} used 'Teleport' to move an army!`);
    
    return { ...newState, teleportState: null, possibleMoves: [], selectedTile: {x, y}, selectedArmyId: armyToMove.id };
}

// --- Player Exit Logic ---

interface PlayerExitParams {
    gameId: string;
    gameState: GameState;
    setGameState: (newState: GameState) => void;
    localPlayer: Player;
    isHost: boolean;
    onExit: () => void;
}

export async function handlePlayerExit({ gameId, gameState, setGameState, localPlayer, isHost, onExit }: PlayerExitParams): Promise<boolean> {
    if (gameState.status === 'playing') {
        return false; // Can't leave a game in progress
    }

    try {
        await runTransaction(db, async (transaction) => {
            const gameDocRef = doc(db, 'games', gameId);
            const gameDoc = await transaction.get(gameDocRef);

            if (!gameDoc.exists()) return;

            const currentState = gameDoc.data() as FirestoreGameState;
            
            // If only one player is left and they are leaving, delete the game
            if (currentState.players.length === 1) {
                transaction.delete(gameDocRef);
                return;
            }

            let newPlayers = currentState.players.filter((p: Player) => p.playerId !== localPlayer.playerId);
            
            // If the host is leaving, we might need to assign a new host
            if (isHost) {
                // Simple reassignment: make the next player in the list the new host (player.id = 0)
                // A more robust system would be needed for complex host migration
            }
            
            // Create the log message before updating the state
            const newLog = arrayUnion(`${localPlayer.name} has left the room.`);
            
            transaction.update(gameDocRef, { 
                players: newPlayers, 
                log: newLog,
            });
        });
        
        onExit(); // This navigates the user away
        return true;
    } catch (error) {
        console.error("Error leaving game:", error);
        return false;
    }
}

export async function handleConfirmHostLeave(gameState: GameState, gameId: string, onExit: () => void) {
    try {
      await runTransaction(db, async (transaction) => {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await transaction.get(gameDocRef);
        if (!gameDoc.exists()) return;
  
        const currentState = gameDoc.data() as FirestoreGameState;
  
        // If host is the last player, delete the game.
        if (currentState.players.length === 1 && currentState.players[0].id === 0) {
          transaction.delete(gameDocRef);
        } else {
          // Otherwise, just remove the host.
          const updatedPlayers = currentState.players.filter((p: Player) => p.id !== 0);
          const newLog = arrayUnion(`${currentState.players[0].name} (host) has left the room.`);
          transaction.update(gameDocRef, { players: updatedPlayers, log: newLog });
        }
      });
  
      onExit(); // Navigate away after the transaction is successful
    } catch (error) {
      console.error("Error during host leave confirmation:", error);
      // Optionally, show a toast to the user here.
    }
  }


// --- Abilities Shop ---
export function handleOpenAbilitiesShop(state: GameState): GameState {
    const availableAbilities = state.settings.availableAbilities;
    if (availableAbilities.length === 0) {
        throw new Error("The host has disabled all passive abilities for this match.");
    }
    return { ...state, abilitiesShopState: { isOpen: true } };
}

export function handleBuyAbility(state: GameState, abilityName: keyof PassiveAbilities): GameState {
    const newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const cost = newState.settings.abilityCost;

    if (player.resources.gems < cost) {
        throw new Error("Not enough gems to buy this ability.");
    }

    if (player.passiveAbilities[abilityName]) {
        throw new Error("You already have this ability.");
    }
    
    if (!newState.settings.availableAbilities.includes(abilityName)) {
        throw new Error("This ability is not available in this match.");
    }

    player.resources.gems -= cost;
    player.passiveAbilities[abilityName] = true;
    newState.log.push(`${player.name} has acquired the '${abilityName.charAt(0).toUpperCase() + abilityName.slice(1)}' passive ability!`);

    return newState;
}

// --- Generic Cancel ---
export function handleCancelAction(state: GameState): { newState: GameState, toastMessage: string } {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    let toastMessage = "";

    if (newState.teleportState) {
        newState.teleportState = null;
        toastMessage = "Teleport cancelled.";
    } else if (newState.scoutingState) {
        newState.scoutingState = null;
        toastMessage = "Scouting cancelled.";
    } else if (player.hasExtraMove) {
        player.hasExtraMove = false;
        toastMessage = "Extra Move cancelled.";
    }

    // Reset any active card flags that were not consumed
    player.efficientActive = false;
    player.masterBuilderActive = false;
    player.reinforceActive = false;

    newState.currentAction = null;
    newState.possibleMoves = [];
    
    return { newState, toastMessage };
}
