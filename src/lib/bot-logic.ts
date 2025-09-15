import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';
import { MAP_SIZE } from './game-logic';

type BotState = 'DECIDING' | 'ACTION' | 'ENDING';

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
        // Priority 1: Deploy a new army if possible and not done yet
        if (botPlayer.resources.food >= botPlayer.nextArmyCost && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes('deploy')) {
            try {
              newState = GameActions.handleDeployAction(newState);
              console.log(`${botPlayer.name} decided to deploy.`);
              // After deploying, it can still take another action, so we continue to ACTION state
              state = 'ACTION';
              break;
            } catch (e) { /* ignore if fails */ }
        }

        // Priority 2: Move an army
        const { armyToMove, moveTarget } = findBestMove(newState);
        
        if (armyToMove && moveTarget) {
            newState.selectedArmyId = armyToMove.id;
            newState = GameActions.handleTileClick(newState, armyToMove.position.x, armyToMove.position.y); // Select the army
            newState = GameActions.handleTileClick(newState, moveTarget.x, moveTarget.y); // Move to target
            console.log(`${botPlayer.name} decided to move army ${armyToMove.id} to ${moveTarget.x},${moveTarget.y}`);
        }
        // Whether it moved or not, proceed to see if another action is possible
        state = 'ACTION';
        break;
      }
        
      case 'ACTION': {
        // This state runs after DECIDING, checking for non-move actions
        const army = GameActions.getSelectedArmy(newState);
        if (!army) {
            // If no army is selected (e.g. after deploying), try selecting one
            if(botPlayer.armies.length > 0) {
                newState.selectedArmyId = botPlayer.armies[0].id;
            } else {
                 state = 'ENDING';
                 break;
            }
        }

        const selectedArmy = GameActions.getSelectedArmy(newState)!;
        const currentTile = newState.map[selectedArmy.position.y][selectedArmy.position.x];
        const canCollect = botPlayer.positions.some(p => p.x === selectedArmy.position.x && p.y === selectedArmy.position.y);
        const canPosition = (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !botPlayer.positions.some(p => p.x === selectedArmy.position.x && p.y === selectedArmy.position.y);

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
  if (newState.players[newState.currentPlayerIndex].isBot) {
    newState = GameActions.handleEndTurn(newState);
  }
  return newState;
}

function findBestMove(gameState: GameState): { armyToMove: Army | null; moveTarget: { x: number; y: number } | null } {
  const player = gameState.players[gameState.currentPlayerIndex];

  // Iterate through all armies to find one that can move
  for (const army of player.armies) {
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

    // Filter for valid moves (not into another player's base)
    const validMoves = potentialMoves.filter(move => {
        const tile = gameState.map[move.y][move.x];
        // Can't move to a base that isn't its own
        return tile.type !== 'base' || tile.owner === player.id;
    });

    if (validMoves.length > 0) {
      // Stupid bot logic: just pick a random valid move for this army
      const randomIndex = Math.floor(Math.random() * validMoves.length);
      return { armyToMove: army, moveTarget: validMoves[randomIndex] };
    }
  }

  // If no army has any valid moves
  return { armyToMove: null, moveTarget: null };
}