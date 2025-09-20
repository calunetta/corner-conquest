

import { db, doc, deleteDoc, runTransaction, arrayUnion, getDoc } from '@/lib/firebase';
import type { GameState, GameAction, ResourceType, Monster, Army, PassiveAbilities, Player, FirestoreGameState, DeathAnimation, Island, IslandResource, BaseTileInfo } from './types';
import { MAP_COLS, MAP_ROWS } from './game-logic';
import { PLAYER_DATA } from './player-data';

export const getSelectedArmy = (state: GameState): Army | null => {
    const armyId = state.armySelectionDialogState?.armies[0]?.id ?? state.attackSelectionDialogState?.armies[0]?.id ?? null;
    if (armyId === null) return null;
    const player = state.players[state.currentPlayerIndex];
    if (!player) return null;
    return player.armies.find(a => a.id === armyId) || null;
}

function canPlayerPerformAnyAction(state: GameState): boolean {
    const player = state.players[state.currentPlayerIndex];

    if (player.armies.some(army => !army.hasActed)) {
        return true;
    }
    
    if (player.hasExtraMove) {
        return true;
    }

    const { settings, specialCardsDeck, discardPile } = state;
    const canUseCard = !player.actionsThisTurn.includes('use-card');

    const upgradeCost = player.masterBuilderActive ? Math.ceil(settings.upgradeCost / 2) : settings.upgradeCost;
    if (player.resources.iron >= upgradeCost && !player.actionsThisTurn.includes('upgrade') && player.attackPower < 4) {
        return true;
    }

    if (player.resources.gems >= 10 && !player.actionsThisTurn.includes('buy-card') && (specialCardsDeck.length > 0 || discardPile.length > 0)) {
        return true;
    }

    const deployCost = player.efficientActive ? Math.ceil(player.nextArmyCost / 2) : player.nextArmyCost;
    if ((player.resources.food >= deployCost || player.reinforceActive) && player.armyCount < 5 && !player.actionsThisTurn.includes('deploy')) {
        return true;
    }

    if (canUseCard && player.specialCards.length > 0) {
        return true;
    }
    
    if (player.resources.gems >= settings.abilityCost && settings.availableAbilities.length > 0) {
        const unownedAbilities = settings.availableAbilities.filter(a => !player.passiveAbilities[a as keyof PassiveAbilities]);
        if (unownedAbilities.length > 0) {
            return true;
        }
    }

    return false;
}

function checkAndEndTurnIfNoActions(state: GameState): GameState {
    if (!canPlayerPerformAnyAction(state)) {
        state.log.push(`${state.players[state.currentPlayerIndex].name} has no more actions. Ending turn automatically.`);
        return handleEndTurn(state);
    }
    return state;
}

export function handlePositionAction(state: GameState, selectedArmy: Army | null): GameState {
  const { players, currentPlayerIndex, map } = state;
  const player = players[currentPlayerIndex];
  
  if (!selectedArmy) throw new Error("No army selected.");
  if (selectedArmy.hasActed) throw new Error("This army has already acted this turn.");
  if (player.positions.some(p => p.armyId === selectedArmy.id)) {
    throw new Error("This army is already positioned.");
  }
  
  const tile = map[selectedArmy.position.y][selectedArmy.position.x];
  if ((tile.type !== 'resource' && tile.type !== 'base') || tile.resources.length === 0) {
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

  const hasProductiveCard = player.specialCards.includes('Productive') && !player.actionsThisTurn.includes('use-card');

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
        if (!player.specialCards.includes('Productive') || player.actionsThisTurn.includes('use-card')) {
            throw new Error("Cannot use 'Productive' card.");
        }
        amountToCollect *= 2;
        const cardIndex = player.specialCards.indexOf('Productive');
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
            player.actionsThisTurn.push('use-card');
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


export function handleDeployAction(state: GameState): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, discardPile, settings, baseTiles } = newState;
    const player = players[currentPlayerIndex];
    
    if (player.actionsThisTurn.includes('deploy')) throw new Error("You can only deploy one army per turn.");
    
    let cost = player.nextArmyCost;
    let isReinforceUsed = false;
    
    if (player.efficientActive) {
        cost = Math.ceil(cost / 2);
    }
    if (player.reinforceActive) {
        cost = 0;
        isReinforceUsed = true;
    }

    if (player.resources.food < cost) throw new Error(`Not enough food. Cost: ${cost}`);
    if (player.armyCount >= 5) throw new Error("You have reached the maximum army size.");

    player.resources.food -= cost;
    player.armyCount += 1;
    const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
    const newArmy: Army = { id: newArmyId, position: {x: 0, y: 0}, hasActed: true }; 
    
    const baseTile = baseTiles.find(b => b.owner === player.id);
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
          discardPile.push(usedCard);
      }
    }

    if (isReinforceUsed) {
      newState.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
      player.reinforceActive = false;
      if (canUseCard) {
          player.actionsThisTurn.push('use-card');
          const cardIndex = player.specialCards.indexOf('Reinforce');
          if (cardIndex > -1) {
              const usedCard = player.specialCards.splice(cardIndex, 1)[0];
              discardPile.push(usedCard);
          }
      }
    }

    if (!isReinforceUsed) {
        player.nextArmyCost += settings.deployCostIncrement;
    }
    
    player.actionsThisTurn.push('deploy');
    newState.log.push(`${player.name} deployed a new army!`);
    
    return checkAndEndTurnIfNoActions(newState);
}

export function handleBuyCardAction(state: GameState): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, specialCardsDeck, discardPile, debugMode } = newState;
    const player = players[currentPlayerIndex];
    const HAND_LIMIT = 7;

    if (player.actionsThisTurn.includes('buy-card')) throw new Error("You can only buy one card per turn.");
    if (player.resources.gems < 10) throw new Error("Not enough gems to buy a card.");
    if (specialCardsDeck.length === 0 && discardPile.length === 0) throw new Error("There are no special cards left in the game.");
    if (player.specialCards.length >= HAND_LIMIT && !debugMode) {
        newState.log.push(`${player.name} tried to buy a card, but their hand is full!`);
        return newState;
    }

    if (specialCardsDeck.length === 0) {
        newState.log.push("The deck is empty. Reshuffling the discard pile...");
        for (let i = discardPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [discardPile[i], discardPile[j]] = [discardPile[j], discardPile[i]];
        }
        newState.specialCardsDeck = [...discardPile];
        newState.discardPile = [];
    }

    player.resources.gems -= 10;
    const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
    const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
    player.specialCards.push(drawnCard);
    player.actionsThisTurn.push('buy-card');
    newState.log.push(`${player.name} bought a special card: "${drawnCard}"!`);

    return checkAndEndTurnIfNoActions(newState);
}

export function handleUpgradeAction(state: GameState): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, discardPile, settings } = newState;
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
              discardPile.push(usedCard);
          }
      }
    }

    player.actionsThisTurn.push('upgrade');
    newState.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower + 1}.`);
    
    return checkAndEndTurnIfNoActions(newState);
}

export function handleAttackAction(state: GameState, selectedArmy: Army | null): { newState: GameState; selectedArmyId: number | null } {
    let newState = { ...state };
    const { players, currentPlayerIndex, map } = newState;
    const attacker = players[currentPlayerIndex];

    if (!selectedArmy) throw new Error("No army selected.");
    if (selectedArmy.hasActed) throw new Error("This army has already acted this turn.");

    const army = attacker.armies.find(a => a.id === selectedArmy.id);
    if(army) army.hasActed = true;

    const currentTile = map[selectedArmy.position.y][selectedArmy.position.x];
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
                attackingArmyId: selectedArmy.id,
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
                x: selectedArmy.position.x,
                y: selectedArmy.position.y,
                attackingArmyId: selectedArmy.id,
                defendingPlayer: defendingPlayer,
                armies: defendingArmies,
            };
        }
    } else if (currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0) {
      newState.monsterCombatState = {
        attackerId: attacker.id,
        attackerPosition: selectedArmy.position,
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
    return { newState, selectedArmyId: selectedArmy.id };
}

export function handleEndTurn(state: GameState): GameState {
    let newState = JSON.parse(JSON.stringify(state)); 
    let currentPlayer = newState.players[newState.currentPlayerIndex];
    
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
    
    currentPlayer.hasExtraMove = false;
    currentPlayer.efficientActive = false;
    currentPlayer.masterBuilderActive = false;
    currentPlayer.reinforceActive = false;
    
    currentPlayer.armies.forEach((army: Army) => army.hasActed = false);
    currentPlayer.actionsThisTurn = [];


    // Determine the next player
    let nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    let nextPlayer = newState.players[nextPlayerIndex];

    // Handle Sabotage
    if (nextPlayer.isSabotaged) {
        nextPlayer.isSabotaged = false; 
        newState.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
        nextPlayer = newState.players[nextPlayerIndex];
    }
    
    newState.currentPlayerIndex = nextPlayerIndex;

    if (newState.currentPlayerIndex === 0) {
      newState.turn += 1;
    }
    
    newState.log.push(`It's now ${nextPlayer.name}'s turn.`);
    
    return { ...newState, teleportState: null };
}

type TileClickResult = {
    newState: GameState;
    selectedArmyId: number | null;
    selectedTile: {x: number, y: number} | null;
    possibleMoves: {x: number, y: number}[];
    currentAction: GameAction | null;
}

function getPossibleMoves(state: GameState, army: Army): { x: number, y: number }[] {
    const { x, y } = army.position;
    const { map } = state;
    const mapRows = map.length;
    const mapCols = map[0].length;
    const currentPlayer = state.players[state.currentPlayerIndex];
    
    if (army.hasActed && !currentPlayer.hasExtraMove) {
        return [];
    }

    let moves = [];
    const moveRadius = 2;
    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < mapCols && newY >= 0 && newY < mapRows) {
                    const targetTile = map[newY][newX];
                    if (targetTile.type === 'resource' && targetTile.resources.length === 0 && (!targetTile.monsters || targetTile.monsters.length === 0)) {
                        continue;
                    }
                    moves.push({ x: newX, y: newY });
                }
            }
        }
    }
    return moves.filter(move => {
        const tile = map[move.y][move.x];
        const baseTileInfo = state.baseTiles.find(b => b.x === tile.x && b.y === tile.y);
        return !baseTileInfo || baseTileInfo.owner === currentPlayer.id;
    });
}

export function handleTileClick(
    state: GameState, 
    x: number, 
    y: number, 
    localPlayerId: number, 
    currentSelectedArmy: Army | null,
    currentPossibleMoves: {x: number, y: number}[]
): TileClickResult {
    let newState = { ...state, id: state.id + `_tileclick_${Date.now()}` };
    const { players, currentPlayerIndex, teleportState, scoutingState } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const clickedTile = newState.map[y][x];
    
    let selectedArmyId: number | null = currentSelectedArmy?.id ?? null;
    let selectedTile: {x: number, y: number} | null = { x, y };
    let possibleMoves: {x: number, y: number}[] = currentPossibleMoves;
    let currentAction: GameAction | null = null;
    
    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);

    if (currentSelectedArmy && isPossibleMove) {
        newState = handleMoveAction(newState, x, y, currentSelectedArmy);
        return { newState, selectedArmyId: null, selectedTile: null, possibleMoves: [], currentAction: null };
    }
    
    if (scoutingState && scoutingState.count > 0 && clickedTile.isHidden) {
        newState = revealIsland(newState, x, y, currentPlayer);
        newState.scoutingState!.count--;
        newState.log.push(`${currentPlayer.name} revealed a tile at (${x},${y}) with Scout. ${newState.scoutingState.count} reveals left.`);
        if (newState.scoutingState!.count === 0) {
            newState.scoutingState = null;
            newState.log.push(`Scouting complete.`);
            currentPlayer.actionsThisTurn.push('use-card');
            const cardIndex = currentPlayer.specialCards.indexOf('Scout');
            if (cardIndex > -1) {
                const usedCard = currentPlayer.specialCards.splice(cardIndex, 1)[0];
                newState.discardPile.push(usedCard);
            }
             newState = checkAndEndTurnIfNoActions(newState);
        }
        return { newState, selectedArmyId, selectedTile: null, possibleMoves, currentAction: null };
    }
    
    if (teleportState) {
        if (teleportState.armyId === null) {
            const armiesOnTile = clickedTile.occupants
                .filter(o => o.playerId === currentPlayer.id)
                .map(o => currentPlayer.armies.find(a => a.id === o.armyId))
                .filter((a): a is Army => !!a);

            if (armiesOnTile.length === 0) throw new Error("You must select a tile with one of your own armies.");

            if (armiesOnTile.length === 1) {
                newState.teleportState.armyId = armiesOnTile[0]!.id;
            } else {
                 newState.armySelectionDialogState = { isOpen: true, x, y, armies: armiesOnTile };
            }
        } else {
            newState = handleTeleport(newState, x, y);
        }
        return { newState, selectedArmyId: null, selectedTile: null, possibleMoves: [], currentAction: null };
    }
    
    const armiesOnTile = clickedTile.occupants
        .filter(o => o.playerId === currentPlayer.id)
        .map(o => currentPlayer.armies.find(a => a.id === o.armyId))
        .filter((army): army is Army => !!army);

    if (armiesOnTile.length > 0) {
        if (armiesOnTile.length === 1) {
            const army = armiesOnTile[0];
            selectedArmyId = army.id;
            possibleMoves = getPossibleMoves(newState, army);
            currentAction = 'move';
        } else {
            newState.armySelectionDialogState = { isOpen: true, x, y, armies: armiesOnTile };
            selectedArmyId = null;
            possibleMoves = [];
            currentAction = null;
        }
    } else {
        selectedArmyId = null;
        possibleMoves = [];
        currentAction = null;
    }

    return { newState, selectedArmyId, selectedTile, possibleMoves, currentAction };
}

function revealIsland(state: GameState, x: number, y: number, player: Player): GameState {
    let newState = { ...state };
    const tile = newState.map[y][x];
    const HAND_LIMIT = 7;

    if (!tile.isHidden) return newState;
    
    tile.isHidden = false;
    player.victoryPoints += state.settings.vpPerIslandDiscovery;
    if (state.settings.vpPerIslandDiscovery > 0) {
        newState.log.push(`${player.name} discovered a new island and gains ${state.settings.vpPerIslandDiscovery} VP!`);
    }

    if (tile.type === 'special') {
        if (player.specialCards.length >= HAND_LIMIT && !newState.debugMode) {
             newState.log.push(`${player.name} discovered a special island, but their hand is full!`);
        } else if (newState.specialCardsDeck.length > 0 || newState.discardPile.length > 0) {
            if (newState.specialCardsDeck.length === 0) {
                 newState.log.push("The deck is empty. Reshuffling the discard pile...");
                 newState.specialCardsDeck = [...newState.discardPile];
                 newState.discardPile = [];
            }
            const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
            const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
            player.specialCards.push(drawnCard);
            newState.log.push(`${player.name} discovered a special island and found a card: "${drawnCard}"!`);
        }
    }
    
    return newState;
}

function handleMoveAction(state: GameState, x: number, y: number, army: Army): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, discardPile } = newState;
    const player = players[currentPlayerIndex];

    if (army.position.x === x && army.position.y === y) {
        throw new Error("Cannot move to the same tile.");
    }

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
    
    if (targetTile.isHidden) {
        newState = revealIsland(newState, x, y, player);
    }
    
    if (targetTile.type === 'special') {
         if (player.specialCards.length >= 7 && !newState.debugMode) {
             newState.log.push(`${player.name} landed on a special island, but their hand is full!`);
         } else if (newState.specialCardsDeck.length > 0 || newState.discardPile.length > 0) {
            if (newState.specialCardsDeck.length === 0) {
                 newState.log.push("The deck is empty. Reshuffling the discard pile...");
                 newState.specialCardsDeck = [...newState.discardPile];
                 newState.discardPile = [];
            }
            const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
            const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
            player.specialCards.push(drawnCard);
            newState.log.push(`${player.name} landed on a special island and found a card: "${drawnCard}"!`);
        }
    }
    
    if (player.hasExtraMove) {
        player.hasExtraMove = false; 
        newState.log.push(`${player.name} used their Extra Move!`);
        
        player.actionsThisTurn.push('use-card');
        const cardIndex = player.specialCards.indexOf('Extra Move');
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
        }
        
    } else {
        army.hasActed = true;
    }

    return checkAndEndTurnIfNoActions(newState);
}

export function handleSelectArmy(state: GameState, armyId: number): { newState: GameState; selectedArmyId: number | null, possibleMoves: {x:number, y:number}[], currentAction: GameAction | null } {
    let newState = { ...state };
    newState.armySelectionDialogState = null; 

    const player = newState.players[newState.currentPlayerIndex];
    const army = player.armies.find(a => a.id === armyId);

    if (!army) {
        return { newState, selectedArmyId: null, possibleMoves: [], currentAction: null };
    }
    
    if (newState.teleportState) {
        newState.teleportState.armyId = armyId;
        return { newState, selectedArmyId: armyId, possibleMoves: [], currentAction: 'teleport' };
    }

    const possibleMoves = getPossibleMoves(newState, army);
    const tile = newState.map[army.position.y][army.position.x];
    const canAttack = tile.occupants.some(o => o.playerId !== player.id) || (tile.type === 'monster' && !!tile.monsters && tile.monsters.length > 0);
    
    if (possibleMoves.length > 0) {
        return { newState, selectedArmyId: armyId, possibleMoves, currentAction: 'move' };
    } else if (canAttack) {
        const { newState: attackState } = handleAttackAction(newState, army);
        return { newState: attackState, selectedArmyId: armyId, possibleMoves: [], currentAction: 'attack' };
    }


    return { newState, selectedArmyId: armyId, possibleMoves, currentAction: null };
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

export function handleSelectDefender(state: GameState, defenderArmyId: number, attackingArmyId: number): GameState {
    let newState = { ...state };
    const { attackSelectionDialogState, players, currentPlayerIndex } = newState;

    if (!attackSelectionDialogState) return newState;

    const attacker = players[currentPlayerIndex];
    const defender = attackSelectionDialogState.defendingPlayer;

    newState.combatState = {
        attackerId: attacker.id,
        attackingArmyId: attackingArmyId,
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

export function handleCombatRoll(state: GameState, useWarChief: boolean, selectedArmy: Army | null): GameState {
    if (!state.combatState) return state;
    if (!selectedArmy) return state;

    const newState = { ...state };
    const { combatState, players, discardPile } = newState;
    const attacker = players[combatState.attackerId];
    const defender = players.find(p => p.id === combatState.defenderId);
    if(!defender) return state;

    let attackerBonusPower = 0;
    const canUseCard = !attacker.actionsThisTurn.includes('use-card');

    if (useWarChief && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf('War Chief');
        if (cardIndex > -1) {
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
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

    const army = attacker.armies.find(a => a.id === selectedArmy.id);
    if(army) army.hasActed = true;

    return newState;
};

export function handleCloseCombat(state: GameState): GameState {
    let newState = { ...state };
    const { combatState, players, map, baseTiles } = newState;
    if (!combatState || combatState.phase !== 'results' || combatState.winnerId === null) {
        return { ...newState, combatState: null };
    }
    
    const { winnerId, attackerId, defenderId, attackingArmyId, defendingArmyId } = combatState;
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players.find(p => p.id === winnerId)!;
    const loser = players.find(p => p.id === loserId)!;
    
    const attackingArmy = players.find(p=>p.id === attackerId)?.armies.find(a => a.id === attackingArmyId);

    if (!attackingArmy) return { ...newState, combatState: null };
    
    const combatTile = map[attackingArmy.position.y][attackingArmy.position.x];

    if (loserId === defenderId) {
        winner.victoryPoints += 5;
        newState.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);

        const losingArmy = loser.armies.find(a => a.id === defendingArmyId);
        const baseTile = baseTiles.find(b => b.owner === loserId);

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
        winner.victoryPoints += 5;
        newState.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);
        
        const baseTile = baseTiles.find(b => b.owner === loserId);
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
    newState.combatState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export function handleMonsterCombatRoll(state: GameState, payload: {monster: Monster, useDecideCard: boolean, decidedValue: number, useOvercomeCard: boolean, useWarChief: boolean}, selectedArmy: Army | null): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, discardPile } = newState;
    const attacker = players[currentPlayerIndex];

    if (!selectedArmy) return newState;
    const { monster, useDecideCard, decidedValue, useOvercomeCard, useWarChief } = payload;

    let attackerRolls: number[] = [];
    let monsterRolls: number[] = [];
    let winnerId: number | null = null;
    
    let cardUsedThisAction = false;
    const canUseCard = !attacker.actionsThisTurn.includes('use-card');

    if (useOvercomeCard && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf('Overcome');
        if (cardIndex > -1) {
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
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
                discardPile.push(usedCard);
                attacker.actionsThisTurn.push('use-card');
                attackerBonusPower += 2;
                cardUsedThisAction = true;
                newState.log.push(`${attacker.name} used 'War Chief' for +2 power!`);
             }
        }

        let canUseDecideCard = useDecideCard;
        if (useDecideCard && canUseCard && !cardUsedThisAction) {
            const cardIndex = attacker.specialCards.indexOf('Decide Dice Roll');
            if (cardIndex > -1) {
                const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
                discardPile.push(usedCard);
                attacker.actionsThisTurn.push('use-card');
                newState.log.push(`${attacker.name} used the 'Decide Dice Roll' card!`);
                cardUsedThisAction = true;
            } else {
                canUseDecideCard = false;
            }
        } else if (useDecideCard) {
            canUseDecideCard = false;
        }
        
        const rollDice = (count: number) => Array.from({ length: Math.max(1, Math.min(count, 6)) }, () => Math.floor(Math.random() * 6) + 1);

        attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
        if(canUseDecideCard) attackerRolls[0] = decidedValue; 

        monsterRolls = rollDice(monster.level);
        const attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
        const monsterScore = monsterRolls.reduce((a, b) => a + b, 0);
        winnerId = attackerScore >= monsterScore ? attacker.id : null;
    }
    
    const army = attacker.armies.find(a => a.id === selectedArmy.id);
    if(army) army.hasActed = true;

    newState.monsterCombatState = {
      attackerId: attacker.id,
      attackerPosition: selectedArmy.position,
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

export function handleCloseMonsterCombat(state: GameState, selectedArmy: Army | null): GameState {
    let newState = { ...state };
    const { monsterCombatState, baseTiles } = newState;
    if (!monsterCombatState || monsterCombatState.phase !== 'results') {
        return { ...newState, monsterCombatState: null };
    }
    
    const { winnerId, monster, attackerId } = newState.monsterCombatState;
    const attacker = newState.players[attackerId];
    if (!selectedArmy) return { ...newState, monsterCombatState: null };

    const currentTile = newState.map[selectedArmy.position.y][selectedArmy.position.x];

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
        const baseTile = baseTiles.find(t => t.owner === attacker.id);
        if (baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${attacker.id}-${selectedArmy.id}`,
                x: selectedArmy.position.x,
                y: selectedArmy.position.y,
                sprite: PLAYER_DATA[attacker.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);
            
            newState.map[selectedArmy.position.y][selectedArmy.position.x].occupants = newState.map[selectedArmy.position.y][selectedArmy.position.x].occupants.filter(o => o.armyId !== selectedArmy.id);
            selectedArmy.position = {x: baseTile.x, y: baseTile.y};
            newState.map[baseTile.y][baseTile.x].occupants.push({playerId: attacker.id, armyId: selectedArmy.id});
        }
        newState.log.push(`${attacker.name} was defeated by the monster!`);
    }

    newState.monsterCombatState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export const handleUseCard = (state: GameState, cardName: string) => {
    let newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    const canUseCard = !player.actionsThisTurn.includes('use-card');
    if (!canUseCard) throw new Error("You can only use one card per turn.");
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
    
    let shouldCheckEndTurn = true;

    switch (cardName) {
        case 'Extra Move':
            player.hasExtraMove = true;
            newState.log.push(`${player.name} activated 'Extra Move'. One army can move again this turn.`);
            shouldCheckEndTurn = false; // The player needs to take their extra move.
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
            newState.useCardDialogState = { cardName };
            return newState;
    }
    
    newState.useCardDialogState = null;

    if (shouldCheckEndTurn) {
        return checkAndEndTurnIfNoActions(newState);
    }
    return newState;
};

export const handleSabotagePlayer = (state: GameState, targetPlayerId: number): GameState => {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);

    if (targetPlayer) {
        const canUseCard = !player.actionsThisTurn.includes('use-card');
        if (!canUseCard) throw new Error("You have already used a card this turn.");
        
        targetPlayer.isSabotaged = true;
        player.actionsThisTurn.push('use-card');
        const cardIndex = player.specialCards.indexOf('Sabatoge');
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            newState.discardPile.push(usedCard);
        }

        newState.log.push(`${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`);
    }

    newState.sabotageDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export const handleGainWealth = (state: GameState, resource: ResourceType): GameState => {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    const canUseCard = !player.actionsThisTurn.includes('use-card');
    if (!canUseCard) throw new Error("You have already used a card this turn.");
    
    player.resources[resource] += 5;
    player.actionsThisTurn.push('use-card');
    
    const cardIndex = player.specialCards.indexOf('Wealthy');
    if (cardIndex > -1) {
        const usedCard = player.specialCards.splice(cardIndex, 1)[0];
        newState.discardPile.push(usedCard);
    }
    
    newState.log.push(`${player.name} used 'Wealthy' to gain 5 ${resource}.`);
    newState.wealthyDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export const handleStealResource = (state: GameState, payload: { targetPlayerId: number; resource: ResourceType }): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex, discardPile } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === payload.targetPlayerId);

    const canUseCard = !currentPlayer.actionsThisTurn.includes('use-card');
    if (!canUseCard) throw new Error("You can only use one card per turn.");

    if (!targetPlayer) return { ...newState, stealResourceDialogState: null };
    
    const cardIndex = currentPlayer.specialCards.indexOf('Steal Resource');
    if (cardIndex === -1) throw new Error(`${currentPlayer.name} tried to steal without the card.`);
    
    const usedCard = currentPlayer.specialCards.splice(cardIndex, 1)[0];
    discardPile.push(usedCard);
    currentPlayer.actionsThisTurn.push('use-card');

    const stolenAmount = Math.min(targetPlayer.resources[payload.resource], 2);

    if (stolenAmount > 0) {
        targetPlayer.resources[payload.resource] -= stolenAmount;
        currentPlayer.resources[payload.resource] += stolenAmount;
        newState.log.push(`${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!`);
    } else {
        newState.log.push(`${currentPlayer.name} tried to steal ${payload.resource} from ${targetPlayer.name}, but they had none.`);
    }

    newState.stealResourceDialogState = null;
    return checkAndEndTurnIfNoActions(newState);
};

export const handleTeleport = (state: GameState, x: number, y: number): GameState => {
    let newState = { ...state };
    const { players, currentPlayerIndex, teleportState, map, discardPile } = newState;
    const player = players[currentPlayerIndex];

    if (!teleportState || teleportState.armyId === null) return newState;
    
    const armyToMove = player.armies.find(a => a.id === teleportState.armyId);
    if (!armyToMove) return newState;
    
    const oldTile = map[armyToMove.position.y][armyToMove.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== armyToMove.id);

    armyToMove.position = { x, y };
    const targetTile = map[y][x];
    targetTile.occupants.push({ playerId: player.id, armyId: armyToMove.id });
    
    if (targetTile.isHidden) {
        newState = revealIsland(newState, x, y, player);
    }
    
    if (targetTile.type === 'special') {
        if (player.specialCards.length >= 7 && !newState.debugMode) {
             newState.log.push(`${player.name} teleported to a special island, but their hand is full!`);
        } else if (newState.specialCardsDeck.length > 0 || newState.discardPile.length > 0) {
            if (newState.specialCardsDeck.length === 0) {
                 newState.log.push("The deck is empty. Reshuffling the discard pile...");
                 newState.specialCardsDeck = [...newState.discardPile];
                 newState.discardPile = [];
            }
            const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
            const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
            player.specialCards.push(drawnCard);
            newState.log.push(`${player.name} teleported to a special island and found a card: "${drawnCard}"!`);
        }
    }
    
    const canUseCard = !player.actionsThisTurn.includes('use-card');
    if (canUseCard) {
        const cardIndex = player.specialCards.indexOf('Teleport');
        if (cardIndex > -1) {
            const usedCard = player.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
            player.actionsThisTurn.push('use-card');
        }
    }
    
    newState.log.push(`${player.name} used 'Teleport' to move an army!`);
    
    newState.teleportState = null;
    return checkAndEndTurnIfNoActions(newState);
}

interface PlayerExitParams {
    gameId: string;
    localPlayer: Player;
    onExit: () => void;
}

export async function handlePlayerExit({ gameId, localPlayer, onExit }: PlayerExitParams): Promise<boolean> {
    try {
        const gameDocRef = doc(db, 'games', gameId);
        let isLastPlayer = false;
        
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);

            if (!gameDoc.exists()) return;

            const currentState = gameDoc.data() as FirestoreGameState;
            
            if (currentState.players.length <= 1) {
                isLastPlayer = true;
                return; 
            }

            let newPlayers = currentState.players.filter((p: Player) => p.playerId !== localPlayer.playerId);
            const newLog = arrayUnion(`${localPlayer.name} has left the room.`);
            
            transaction.update(gameDocRef, { 
                players: newPlayers, 
                log: newLog,
            });
        });

        if (isLastPlayer) {
             await deleteDoc(gameDocRef);
             const staticDocRef = doc(db, 'games', gameId, 'static', 'map');
             await deleteDoc(staticDocRef);
        }
        
        onExit();
        return true;
    } catch (error) {
        console.error("Error leaving game:", error);
        return false;
    }
}

export async function handleConfirmHostLeave(gameId: string, onExit: () => void) {
  try {
      const gameDocRef = doc(db, 'games', gameId);
      const staticDocRef = doc(db, 'games', gameId, 'static', 'map');
      await deleteDoc(gameDocRef);
      await deleteDoc(staticDocRef);
      onExit();
  } catch (error) {
    console.error("Error during host leave confirmation:", error);
  }
}

export function handleOpenAbilitiesShop(state: GameState): GameState {
    const availableAbilities = state.settings.availableAbilities;
    if (availableAbilities.length === 0) {
        throw new Error("The host has disabled all passive abilities for this match.");
    }
    return { ...state, abilitiesShopState: { isOpen: true } };
}

export function handleBuyAbility(state: GameState, abilityName: keyof PassiveAbilities): GameState {
    let newState = { ...state };
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

    newState.abilitiesShopState = null;
    return checkAndEndTurnIfNoActions(newState);
}

export function handleCancelAction(state: GameState): GameState {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    // Reverse card consumption if applicable
    if (newState.teleportState || newState.scoutingState) {
        const cardName = newState.teleportState ? 'Teleport' : 'Scout';
        const usedCardIndex = player.actionsThisTurn.indexOf('use-card');
        if (usedCardIndex > -1) player.actionsThisTurn.splice(usedCardIndex, 1);
        
        const cardFromDiscard = newState.discardPile.pop();
        if(cardFromDiscard) player.specialCards.push(cardFromDiscard);
    }
    
    newState.teleportState = null;
    newState.scoutingState = null;
    newState.monsterCombatState = null;
    newState.attackSelectionDialogState = null;
    newState.positionDialogState = null;
    newState.collectDialogState = null;
    newState.useCardDialogState = null;
    newState.sabotageDialogState = null;
    newState.wealthyDialogState = null;
    newState.stealResourceDialogState = null;
    newState.showHostLeaveDialog = false;
    
    player.hasExtraMove = false;
    
    return newState;
}

interface HandleActionParams {
    action: GameAction;
    gameState: GameState;
    selectedArmy: Army | null;
    payload?: any;
}

export function handleGameAction({ action, gameState, selectedArmy, payload }: HandleActionParams): { newState: GameState, selectedArmyId?: number | null, possibleMoves?: {x:number, y:number}[], currentAction?: GameAction | null } {
    let resultState = gameState;
    let resultSelectedArmyId: number | null = selectedArmy?.id ?? null;
    let resultPossibleMoves: {x:number, y:number}[] = [];
    let resultCurrentAction: GameAction | null = null;


    switch(action) {
        case 'position':
            resultState = handlePositionAction(gameState, selectedArmy);
            break;
        case 'collect':
            resultState = handleCollectAction(gameState, selectedArmy);
            break;
        case 'deploy':
            resultState = handleDeployAction(gameState);
            break;
        case 'buy-card':
            resultState = handleBuyCardAction(gameState);
            break;
        case 'upgrade':
            resultState = handleUpgradeAction(gameState);
            break;
        case 'attack':
            const attackResult = handleAttackAction(gameState, selectedArmy);
            resultState = attackResult.newState;
            resultSelectedArmyId = attackResult.selectedArmyId;
            break;
        case 'end-turn':
            resultState = handleEndTurn(gameState);
            resultSelectedArmyId = null;
            break;
        case 'open-abilities-shop':
            resultState = handleOpenAbilitiesShop(gameState);
            break;
        case 'close-abilities-shop':
             resultState = { ...gameState, abilitiesShopState: null };
            break;
        case 'use-card':
            resultState = handleUseCard(gameState, payload);
            break;
        case 'confirm-use-card':
             if (['Steal Resource', 'Sabatoge', 'Wealthy'].includes(payload)) {
                let dialogState: Partial<GameState> = {};
                if (payload === 'Steal Resource') dialogState = { stealResourceDialogState: { targetPlayerId: null } };
                if (payload === 'Sabatoge') dialogState = { sabotageDialogState: { isOpen: true } };
                if (payload === 'Wealthy') dialogState = { wealthyDialogState: { isOpen: true } };
                resultState = { ...gameState, ...dialogState, useCardDialogState: null };
            } else {
                 resultState = handleUseCard(gameState, payload);
            }
            break;
        case 'select-resource-position':
            resultState = handleSelectResourceForPosition(gameState, payload, selectedArmy);
            break;
        case 'confirm-collection':
            resultState = handleConfirmCollection(gameState, payload, selectedArmy);
            break;
        case 'select-army':
            const selectResult = handleSelectArmy(gameState, payload);
            resultState = selectResult.newState;
            resultSelectedArmyId = selectResult.selectedArmyId;
            resultPossibleMoves = selectResult.possibleMoves;
            resultCurrentAction = selectResult.currentAction;
            break;
        case 'select-defender':
             const { defenderArmyId, attackingArmyId } = payload;
             resultState = handleSelectDefender(gameState, defenderArmyId, attackingArmyId);
             resultSelectedArmyId = attackingArmyId;
            break;
        case 'combat-roll':
            resultState = handleCombatRoll(gameState, payload, selectedArmy);
            break;
        case 'close-combat':
            resultState = handleCloseCombat(gameState);
            resultSelectedArmyId = null;
            break;
        case 'close-combat-viewer':
            resultState = { ...gameState, combatState: null };
            break;
        case 'monster-combat-roll':
            resultState = handleMonsterCombatRoll(gameState, payload, selectedArmy);
            break;
        case 'close-monster-combat':
            resultState = handleCloseMonsterCombat(gameState, selectedArmy);
            resultSelectedArmyId = null;
            break;
        case 'close-monster-combat-viewer':
            resultState = { ...gameState, monsterCombatState: null };
            break;
        case 'buy-ability':
            resultState = handleBuyAbility(gameState, payload);
            break;
        case 'steal-resource':
            resultState = handleStealResource(gameState, payload);
            break;
        case 'sabotage-player':
            resultState = handleSabotagePlayer(gameState, payload);
            break;
        case 'gain-wealth':
            resultState = handleGainWealth(gameState, payload);
            break;
        case 'cancel-action':
            resultState = handleCancelAction(gameState);
            resultSelectedArmyId = null;
            break;
        default:
            return { newState: gameState, selectedArmyId: resultSelectedArmyId };
    }
    
    return { newState: resultState, selectedArmyId: resultSelectedArmyId, possibleMoves: resultPossibleMoves, currentAction: resultCurrentAction };
}

    
