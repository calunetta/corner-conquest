import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';
import { MAP_SIZE } from './game-logic';

type BotState = 'DECIDING' | 'MOVING' | 'ACTION' | 'ENDING';

/**
 * A very simple Finite State Machine for the bot's turn.
 */
export function takeBotTurn(gameState: GameState): GameState {
  let state: BotState = 'DECIDING';
  let newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  const botPlayer = newState.players[newState.currentPlayerIndex];
  
  console.log(`--- ${botPlayer.name}'s Turn ---`);

  // Simple loop to simulate state transitions in one function call
  for (let i = 0; i < 10; i++) { // Loop limit to prevent infinite loops
    console.log(`Bot State: ${state}`);

    switch (state) {
      case 'DECIDING': {
        const armyToMove = getArmyToMove(newState);
        newState.selectedArmyId = armyToMove.id;

        // Priority 1: Deploy a new army if possible
        if (botPlayer.resources.food >= botPlayer.nextArmyCost && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes('deploy')) {
            try {
              newState = GameActions.handleDeployAction(newState);
              console.log(`${botPlayer.name} decided to deploy.`);
            } catch (e) { /* ignore */ }
        }

        // Priority 2: Move an army
        const moveTarget = findBestMove(newState);
        if (moveTarget) {
            newState = GameActions.handleTileClick(newState, armyToMove.position.x, armyToMove.position.y); // Select the army
            newState = GameActions.handleTileClick(newState, moveTarget.x, moveTarget.y); // Move to target
            console.log(`${botPlayer.name} decided to move army ${armyToMove.id} to ${moveTarget.x},${moveTarget.y}`);
            state = 'ACTION';
        } else {
            state = 'ACTION'; // No move, but maybe can still do something
        }
        break;
      }
        
      case 'ACTION': {
        const army = GameActions.getSelectedArmy(newState);
        if (!army) {
            state = 'ENDING';
            break;
        }

        const currentTile = newState.map[army.position.y][army.position.x];
        const canCollect = botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);
        const canPosition = (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);

        if (canCollect && botPlayer.lastAction !== 'move') {
            try {
                newState = GameActions.handleCollectAction(newState);
                console.log(`${botPlayer.name} decided to collect.`);
            } catch(e) { /* ignore */ }
        } else if (canPosition && botPlayer.lastAction !== 'move') {
             try {
                const availableResources = currentTile.resources.filter(resource => {
                    return !(currentTile.positionedBy || []).some(p => p.resource === resource.type);
                });
                if (availableResources.length > 0) {
                    newState = GameActions.handleSelectResourceForPosition(newState, availableResources[0].type);
                    console.log(`${botPlayer.name} decided to position on ${availableResources[0].type}.`);
                }
            } catch(e) { /* ignore */ }
        }
        
        // After trying an action, end the turn
        state = 'ENDING';
        break;
      }

      case 'ENDING':
        console.log(`${botPlayer.name} is ending its turn.`);
        newState = GameActions.handleEndTurn(newState);
        return newState; // Exit point
    }
  }

  // If loop finishes without returning, end turn as a fallback
  console.log("Bot fallback: ending turn.");
  newState = GameActions.handleEndTurn(newState);
  return newState;
}

function getArmyToMove(gameState: GameState): Army {
    const player = gameState.players[gameState.currentPlayerIndex];
    // Simple logic: just pick the first army. Can be improved.
    return player.armies[0];
}

function findBestMove(gameState: GameState): { x: number; y: number } | null {
  const army = GameActions.getSelectedArmy(gameState);
  const player = gameState.players[gameState.currentPlayerIndex];
  if (!army) return null;

  const { x, y } = army.position;

  // Generate all possible moves within 2 steps (Manhattan distance)
  const potentialMoves: { x: number; y: number }[] = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (Math.abs(i) + Math.abs(j) <= 2 && (i !== 0 || j !== 0)) {
        const newX = x + i;
        const newY = y + j;
        if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
          potentialMoves.push({ x: newX, y: newY });
        }
      }
    }
  }

  const validMoves = potentialMoves.filter(move => {
      const tile = gameState.map[move.y][move.x];
      return tile.type !== 'base' || tile.owner === player.id;
  });

  if (validMoves.length === 0) return null;

  // Stupid bot logic: just pick a random valid move
  const randomIndex = Math.floor(Math.random() * validMoves.length);
  return validMoves[randomIndex];
}
