

import { doc, deleteDoc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, GameAction, ResourceType, Monster, Army } from './types';
import { MAP_SIZE } from './game-logic';

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
  if (player.lastAction) throw new Error("You have already performed a main action this turn.");
  
  const tile = map[army.position.y][army.position.x];
  if ((tile.type !== 'resource' && tile.type !== 'base') || tile.resources.length === 0) {
    throw new Error("You can only position on an island with resources.");
  }
  if (player.positions.some(p => p.x === army.position.x && p.y === army.position.y)) {
    throw new Error("You already have an army positioned here.");
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
  const newState = { ...state };
  const { players, currentPlayerIndex, map } = newState;
  const player = players[currentPlayerIndex];
  const army = getSelectedArmy(newState);
  
  if (!army) throw new Error("No army selected.");
  if (player.lastAction) throw new Error("You have already performed a main action this turn.");

  const positionIndex = player.positions.findIndex(p => p.x === army.position.x && p.y === army.position.y);
  if (positionIndex === -1) throw new Error("You have no army positioned on this island to collect from.");

  const position = player.positions[positionIndex];
  const tile = map[position.y][position.x];
  const resource = tile.resources.find(r => r.type === position.resource);
  if (!resource) throw new Error("Resource not found on this island.");

  player.resources[position.resource] += resource.amount;
  player.lastAction = 'collect';
  newState.log.push(`${player.name} collected ${resource.amount} ${position.resource}.`);
  
  // Remove the position after collecting
  player.positions.splice(positionIndex, 1);
  if(tile.positionedBy) {
      tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === position.resource));
  }
  newState.log.push(`${player.name}'s army must be repositioned to collect again.`);

  return { ...newState, currentAction: null, possibleMoves: [], selectedTile: null };
}

export function handleDeployAction(state: GameState): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map } = newState;
    const player = players[currentPlayerIndex];
    
    if (player.actionsThisTurn.includes('deploy')) throw new Error("You can only deploy one army per turn.");
    if (player.resources.food < player.nextArmyCost) throw new Error("Not enough food to deploy a new army.");
    if (player.armyCount >= 5) throw new Error("You have reached the maximum army size.");

    const baseTile = map.flat().find(t => t.type === 'base' && t.owner === player.id);
    if (!baseTile) throw new Error("Base not found!");

    player.resources.food -= player.nextArmyCost;
    player.armyCount += 1;
    const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
    const newArmy: Army = { id: newArmyId, position: {x: baseTile.x, y: baseTile.y} };
    player.armies.push(newArmy);
    map[baseTile.y][baseTile.x].occupants.push({playerId: player.id, armyId: newArmy.id});
    
    player.nextArmyCost += 1;
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
    if (player.specialCards.length >= 10) throw new Error("You have reached the maximum of 10 cards.");

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
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes('upgrade')) throw new Error("You can only upgrade once per turn.");
    if (player.resources.iron < 5) throw new Error("Not enough iron to upgrade.");
    
    player.resources.iron -= 5;
    player.attackPower += 1;
    player.actionsThisTurn.push('upgrade');
    newState.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower}.`);
    
    return { ...newState, currentAction: null };
}

export function handleAttackAction(state: GameState): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map } = newState;
    const attacker = players[currentPlayerIndex];
    const army = getSelectedArmy(newState);

    if (!army) throw new Error("No army selected.");
    if (attacker.lastAction) throw new Error("You have already performed a main action this turn.");

    const currentTile = map[army.position.y][army.position.x];
    const otherPlayersOccupants = currentTile.occupants.filter(o => o.playerId !== attacker.id);

    if (otherPlayersOccupants.length > 0) {
      const defenderId = otherPlayersOccupants[0].playerId; 
      newState.combatState = {
        attackerId: attacker.id,
        defenderId: defenderId,
        attackerRolls: [],
        defenderRolls: [],
        winnerId: null,
        phase: 'rolling',
      };
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
    const newState = { ...state };
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    if (newState.currentPlayerIndex === 0) {
      newState.turn += 1;
    }

    const nextPlayer = newState.players[newState.currentPlayerIndex];
    nextPlayer.lastAction = null;
    nextPlayer.actionsThisTurn = [];
    nextPlayer.hasExtraMove = false; // Ensure extra move is cleared at turn end
    
    newState.log.push(`It's now ${nextPlayer.name}'s turn.`);
    
    if (nextPlayer.armies.length === 1) {
        newState.selectedArmyId = nextPlayer.armies[0].id;
    } else {
        newState.selectedArmyId = null;
    }

    return { ...newState, currentAction: null, possibleMoves: [], selectedTile: null };
}

// --- UI Interaction Handlers ---

export function handleTileClick(state: GameState, x: number, y: number): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, selectedArmyId, possibleMoves } = newState;
    const currentPlayer = players[currentPlayerIndex];

    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);
    const clickedTile = newState.map[y][x];
    const armyOnTile = clickedTile.occupants.find(o => o.playerId === currentPlayer.id);

    if (selectedArmyId !== null && isPossibleMove) {
      return handleMoveAction(newState, x, y);
    } else if (armyOnTile) {
        newState.selectedArmyId = armyOnTile.armyId;
        newState.selectedTile = {x, y};
        newState.currentAction = 'move';
        
        // Don't show moves if a main action has already been completed (and no extra move)
        if (currentPlayer.lastAction && !currentPlayer.hasExtraMove) {
            newState.possibleMoves = [];
            return newState;
        }

        let moves = [];
        const moveRadius = 2;
        for (let i = -moveRadius; i <= moveRadius; i++) {
          for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
              const newX = x + i;
              const newY = y + j;
              if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
                moves.push({ x: newX, y: newY });
              }
            }
          }
        }
        newState.possibleMoves = moves.filter(move => {
          const tile = newState.map[move.y][move.x];
          return tile.type !== 'base' || tile.owner === currentPlayer.id;
        });
    } else {
      newState.selectedArmyId = null;
      newState.selectedTile = null;
      newState.possibleMoves = [];
      newState.currentAction = null;
    }
    return newState;
}

function handleMoveAction(state: GameState, x: number, y: number): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex, map, specialCardsDeck } = newState;
    const player = players[currentPlayerIndex];
    const army = getSelectedArmy(newState);

    if (!army) return state;
    
    if (player.lastAction !== null && !player.hasExtraMove) {
        throw new Error("You have already completed a main action this turn.");
    }
    
    const oldTile = map[army.position.y][army.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== army.id);
    
    const positionIndex = player.positions.findIndex(p => p.x === army.position.x && p.y === army.position.y);
    if (positionIndex > -1) {
        const removedPosition = player.positions.splice(positionIndex, 1)[0];
        if(oldTile.positionedBy) {
            oldTile.positionedBy = oldTile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === removedPosition.resource));
        }
        newState.log.push(`${player.name}'s army moved and is no longer positioned on ${removedPosition.resource}.`);
    }

    army.position = { x, y };
    map[y][x].occupants.push({ playerId: player.id, armyId: army.id });
    
    const revealedIsland = map[y][x];
    if(revealedIsland.isHidden) {
      revealedIsland.isHidden = false;
      player.victoryPoints += 1;
      newState.log.push(`${player.name} discovered a new island and gains 1 VP!`);
      
      if (revealedIsland.type === 'special' && player.specialCards.length < 10 && specialCardsDeck.length > 0) {
        const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
        const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
        player.specialCards.push(drawnCard);
        newState.log.push(`${player.name} found a special card: "${drawnCard}"!`);
      }
    }
    
    if (player.hasExtraMove) {
        player.hasExtraMove = false; 
        player.lastAction = 'move'; 
        newState.log.push(`${player.name} used their Extra Move!`);
        
        // Consume the card now that the move is complete
        const cardIndex = player.specialCards.indexOf('Extra Move');
        if (cardIndex > -1) {
            player.specialCards.splice(cardIndex, 1);
        }
    } else {
        player.lastAction = 'move';
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
    player.positions.push({ x, y, resource });
    
    const tile = newState.map[y][x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    player.lastAction = 'position';
    newState.log.push(`${player.name} positioned an army on ${resource}.`);
    
    return { ...newState, positionDialogState: null, currentAction: null, possibleMoves: [], selectedTile: null };
};

export function handleCombatRoll(state: GameState): GameState {
    if (!state.combatState) return state;
    const newState = { ...state };
    const { combatState, players } = newState;
    const attacker = players[combatState.attackerId];
    const defender = players[combatState.defenderId];

    const rollDice = (count: number) => Array.from({ length: Math.min(count, 4) }, () => Math.floor(Math.random() * 6) + 1);

    combatState.attackerRolls = rollDice(attacker.armyCount + attacker.attackPower);
    combatState.defenderRolls = rollDice(defender.armyCount + defender.attackPower);
    
    const attackerScore = combatState.attackerRolls.reduce((a, b) => a + b, 0);
    const defenderScore = combatState.defenderRolls.reduce((a, b) => a + b, 0);

    combatState.winnerId = attackerScore > defenderScore ? combatState.attackerId : combatState.defenderId;
    combatState.phase = 'results';
    return newState;
};

export function handleCloseCombat(state: GameState): GameState {
    const newState = { ...state };
    const { combatState, players, map, selectedArmyId } = newState;
    if (!combatState || combatState.winnerId === null) return { ...newState, combatState: null, currentAction: null };
    
    const { winnerId, attackerId, defenderId } = combatState;
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players.find(p => p.id === winnerId)!;
    const loser = players.find(p => p.id === loserId)!;
    
    const attackingArmy = players[attackerId].armies.find(a => a.id === selectedArmyId);
    if (!attackingArmy) return { ...newState, combatState: null, currentAction: null };

    const combatTile = map[attackingArmy.position.y][attackingArmy.position.x];
    const loserOccupantInfo = combatTile.occupants.find(o => o.playerId === loserId);
    
    if (loserOccupantInfo) {
        const losingArmy = loser.armies.find(a => a.id === loserOccupantInfo.armyId);
        const baseTile = map.flat().find(t => t.type === 'base' && t.owner === loserId);
        if (losingArmy && baseTile) {
            const oldPos = losingArmy.position;
            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === losingArmy.id && o.playerId === loserId));
            losingArmy.position = {x: baseTile.x, y: baseTile.y};
            map[baseTile.y][baseTile.x].occupants.push({playerId: loserId, armyId: losingArmy.id});
            
            const positionIndex = loser.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
            if (positionIndex > -1) {
                const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                if (map[oldPos.y][oldPos.x].positionedBy) {
                    map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x].positionedBy!.filter(p => !(p.playerId === loserId && p.resource === removedPosition.resource));
                }
            }
        }
    }

    newState.log.push(`${winner.name} defeated ${loser.name} in battle!`);
    newState.players[attackerId].lastAction = 'attack';
    return { ...newState, combatState: null, currentAction: null };
}

export function handleMonsterCombatRoll(state: GameState, monster: Monster, useDecideCard: boolean, decidedValue: number, useOvercomeCard?: boolean): GameState {
    const newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const attacker = players[currentPlayerIndex];

    let attackerScore = 0;
    let monsterScore = 0;
    let attackerRolls: number[] = [];
    let monsterRolls: number[] = [];
    let winnerId: number | null = null;
    
    if (useOvercomeCard) {
        const cardIndex = attacker.specialCards.indexOf('Overcome');
        if (cardIndex > -1) {
            attacker.specialCards.splice(cardIndex, 1);
            newState.log.push(`${attacker.name} used the 'Overcome' card to automatically win!`);
            winnerId = attacker.id;
        } else {
             useOvercomeCard = false; // Card not found, proceed normally
        }
    }

    if (!useOvercomeCard) {
        if (useDecideCard) {
          const cardIndex = attacker.specialCards.indexOf('Decide Dice Roll');
          if (cardIndex > -1) {
            attacker.specialCards.splice(cardIndex, 1);
            newState.log.push(`${attacker.name} used the 'Decide Dice Roll' card!`);
          } else {
            useDecideCard = false;
          }
        }

        const rollDice = (count: number) => Array.from({ length: Math.min(count, 4) }, () => Math.floor(Math.random() * 6) + 1);

        attackerRolls = rollDice(attacker.armyCount + attacker.attackPower);
        if(useDecideCard) attackerRolls[0] = decidedValue; 

        monsterRolls = rollDice(monster.level);
        attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
        monsterScore = monsterRolls.reduce((a, b) => a + b, 0);
        winnerId = attackerScore >= monsterScore ? attacker.id : null;
    }


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
    const { monsterCombatState, players, map } = newState;
    if (!monsterCombatState) return { ...newState, monsterCombatState: null, currentAction: null };

    const attacker = players.find(p => p.id === monsterCombatState.attackerId);
    const attackingArmy = getSelectedArmy(newState);
    if (!attacker || !attackingArmy) return { ...newState, monsterCombatState: null, currentAction: null };
    
    const currentTile = map[attackingArmy.position.y][attackingArmy.position.x];

    if (monsterCombatState.winnerId === attacker.id) {
      const monsterVP = [0, 2, 5, 7, 10][monsterCombatState.monster.level] || 0;
      attacker.victoryPoints += monsterVP;
      currentTile.monsters = (currentTile.monsters || []).filter(m => m.id !== monsterCombatState.monster.id);
      newState.log.push(`${attacker.name} defeated the monster for ${monsterVP} VP!`);
      
      if (currentTile.monsters?.length === 0) {
        currentTile.type = 'resource';
        // Add a random resource to the now-empty tile
        const resourceTypes: ResourceType[] = ['food', 'iron', 'gems'];
        const randomResource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        currentTile.resources.push({ type: randomResource, amount: 1});
        newState.log.push(`The defeated monster's den revealed a cache of ${randomResource}!`);
      }
    } else {
      const baseTile = map.flat().find(t => t.type === 'base' && t.owner === attacker.id);
      if (baseTile) {
          const oldPos = attackingArmy.position;
          map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(o => o.armyId !== attackingArmy.id);
          attackingArmy.position = {x: baseTile.x, y: baseTile.y};
          map[baseTile.y][baseTile.x].occupants.push({playerId: attacker.id, armyId: attackingArmy.id});
      }
      newState.log.push(`${attacker.name} was defeated by the monster!`);
    }
    
    attacker.lastAction = 'attack';
    return { ...newState, monsterCombatState: null, currentAction: null };
}

export const handleOpenUseCardDialog = (state: GameState, cardName: string) => {
    return { ...state, useCardDialogState: { cardName }, showCardsDialogForPlayer: null };
};

export const handleActivateExtraMoveCard = (state: GameState): GameState => {
    const newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes('use-card')) {
        newState.log.push(`Error: You can only use one card per turn.`);
        return { ...newState, showCardsDialogForPlayer: null };
    }

    player.hasExtraMove = true;
    player.lastAction = null; // Allow another action
    player.actionsThisTurn.push('use-card');
    newState.log.push(`${player.name} activated the 'Extra Move' card. They can perform another main action.`);

    return { ...newState, showCardsDialogForPlayer: null };
};

export const handleUseCard = (state: GameState, cardName: string) => {
    const newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes('use-card')) {
        newState.log.push(`Error: You can only use one card per turn.`);
        return { ...newState, useCardDialogState: null };
    }
    
    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) {
        newState.log.push(`Error: You do not have the ${cardName} card.`);
        return { ...newState, useCardDialogState: null };
    }
    
    if (cardName === 'Extra Move') {
        player.hasExtraMove = true;
        player.lastAction = null; // Allow another main action
        newState.log.push(`${player.name} activated the 'Extra Move' card.`);
        // Note: The card is only consumed after the extra move is made.
    } else {
        player.specialCards.splice(cardIndex, 1);
        newState.log.push(`${player.name} used the '${cardName}' card.`);
    }

    player.actionsThisTurn.push('use-card');
    
    return { ...newState, useCardDialogState: null, showCardsDialogForPlayer: null };
};

export const handleStealResource = (state: GameState, targetPlayerId: number, resource: ResourceType) => {
    const newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === targetPlayerId);

    if (currentPlayer.actionsThisTurn.includes('use-card')) {
        newState.log.push(`Error: You have already used a card this turn.`);
        return { ...newState, stealResourceDialogState: null };
    }

    if (!targetPlayer) return { ...newState, stealResourceDialogState: null };
    
    const cardIndex = currentPlayer.specialCards.indexOf('Steal Resource');
    if (cardIndex === -1) {
        newState.log.push(`Error: ${currentPlayer.name} tried to steal without the card.`);
        return { ...newState, stealResourceDialogState: null };
    }
    
    currentPlayer.specialCards.splice(cardIndex, 1);
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

// --- Player Exit Logic ---

interface PlayerExitParams {
    gameId: string;
    gameState: GameState;
    localPlayer: any;
    isHost: boolean;
    onExit: () => void;
}

export async function handlePlayerExit({ gameId, gameState, localPlayer, isHost, onExit }: PlayerExitParams): Promise<boolean> {
  if (gameState.status === 'playing') {
    return false;
  }

  if (isHost) {
      if (gameState.players.length === 1) {
          await deleteDoc(doc(db, 'games', gameId));
      } else {
          // A more complex implementation could assign a new host. For now, we just remove the host.
          await runTransaction(db, async (transaction) => {
            const gameDocRef = doc(db, 'games', gameId);
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) return;
            
            const currentState = gameDoc.data();
            const updatedPlayers = currentState.players.filter((p: any) => p.playerId !== localPlayer.playerId);
            
            transaction.update(gameDocRef, { players: updatedPlayers, log: arrayUnion(`${localPlayer.name} (host) has left the room.`) });
          });
      }
  } else {
    // Non-host leaving
    await runTransaction(db, async (transaction) => {
      const gameDocRef = doc(db, 'games', gameId);
      const gameDoc = await transaction.get(gameDocRef);
      if (!gameDoc.exists()) return;

      const currentState = gameDoc.data();
      const updatedPlayers = currentState.players.filter((p: any) => p.playerId !== localPlayer.playerId);
      
      transaction.update(gameDocRef, { players: updatedPlayers, log: arrayUnion(`${localPlayer.name} has left the room.`) });
    });
  }
  
  onExit();
  return true;
}

export async function handleConfirmHostLeave(gameState: GameState, gameId: string, onExit: () => void) {
    if (gameState.players.length === 1) {
        await deleteDoc(doc(db, 'games', gameId));
    } else {
        await runTransaction(db, async (transaction) => {
            const gameDocRef = doc(db, 'games', gameId);
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) return;

            const currentState = gameDoc.data();
            const updatedPlayers = currentState.players.filter((p: any) => p.id !== 0); // Remove host (player id 0)
            
            // A more robust system would re-assign player IDs and host status
            transaction.update(gameDocRef, { 
                players: updatedPlayers, 
                log: arrayUnion(`${currentState.players[0].name} (host) has left the room.`) 
            });
        });
    }
    onExit();
}
