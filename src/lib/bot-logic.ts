
import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';
import { MAP_SIZE } from './game-logic';

/**
 * A simple, more robust Finite State Machine for the bot's turn.
 * The bot will iterate through its armies and attempt the highest-priority action available.
 * If any action is successful, the turn ends.
 * If no actions are possible after checking everything, the turn ends.
 */
export function takeBotTurn(gameState: GameState): GameState {
  let newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  const botPlayer = newState.players[newState.currentPlayerIndex];
  
  console.log(`--- Bot Turn Start: ${botPlayer.name} ---`);

  // --- Bot Decision Making ---

  // Create a list of all armies to check
  const armiesToCheck = [...botPlayer.armies];

  for (const army of armiesToCheck) {
    // Set the currently selected army for action handlers
    newState.selectedArmyId = army.id;
    const currentTile = newState.map[army.position.y][army.position.x];

    // Priority 1: Collect resources if possible (and not moved yet)
    if (botPlayer.lastAction !== 'move') {
      const canCollect = botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);
      if (canCollect) {
        try {
          console.log(`${botPlayer.name} deciding: Collect with army ${army.id}`);
          newState = GameActions.handleCollectAction(newState);
          return GameActions.handleEndTurn(newState);
        } catch (e) { /* ignore and continue */ }
      }
    }

    // Priority 2: Position on a resource if possible (and not moved yet)
    if (botPlayer.lastAction !== 'move') {
        const canPosition = (currentTile.type === 'resource' || currentTile.type === 'base') && 
                            currentTile.resources.length > 0 && 
                            !botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);
        if (canPosition) {
            const availableResources = currentTile.resources.filter(resource => 
                !(currentTile.positionedBy || []).some(p => p.resource === resource.type)
            );
            if (availableResources.length > 0) {
                try {
                    console.log(`${botPlayer.name} deciding: Position army ${army.id} on ${availableResources[0].type}`);
                    newState = GameActions.handleSelectResourceForPosition(newState, availableResources[0].type);
                    return GameActions.handleEndTurn(newState);
                } catch (e) { /* ignore and continue */ }
            }
        }
    }
  }

  // Priority 3: Move one of the armies if no higher priority action was taken
  for (const army of armiesToCheck) {
    newState.selectedArmyId = army.id;
    const { moveTarget } = findBestMoveForArmy(newState, army);
    if (moveTarget) {
      try {
        console.log(`${botPlayer.name} deciding: Move army ${army.id} to ${moveTarget.x},${moveTarget.y}`);
        newState = GameActions.handleTileClick(newState, army.position.x, army.position.y); // Select the army
        newState = GameActions.handleTileClick(newState, moveTarget.x, moveTarget.y); // Move to target
        return GameActions.handleEndTurn(newState);
      } catch (e) { /* ignore and continue */ }
    }
  }
  
  // Priority 4: Deploy a new army if possible and no other action was taken.
  const canDeploy = botPlayer.resources.food >= botPlayer.nextArmyCost && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes('deploy');
  if (canDeploy) {
      try {
        console.log(`${botPlayer.name} deciding: Deploy new army.`);
        newState = GameActions.handleDeployAction(newState);
        return GameActions.handleEndTurn(newState);
      } catch (e) { /* ignore and continue */ }
  }

  // Fallback: If after checking ALL armies and ALL actions, nothing can be done, end the turn.
  console.log(`${botPlayer.name} cannot perform any actions and is ending its turn.`);
  return GameActions.handleEndTurn(newState);
}

function findBestMoveForArmy(gameState: GameState, army: Army): { moveTarget: { x: number; y: number } | null } {
  const player = gameState.players[gameState.currentPlayerIndex];
  const { x, y } = army.position;
  
  const potentialMoves: { x: number; y: number }[] = [];
  // Use a simple 2-tile radius for bot moves for now.
  const moveRadius = 2; 

  for (let i = -moveRadius; i <= moveRadius; i++) {
      for (let j = -moveRadius; j <= moveRadius; j++) {
          if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
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
      return !(tile.type === 'base' && tile.owner !== player.id);
  });

  if (validMoves.length > 0) {
    // Stupid bot logic: just pick a random valid move
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return { moveTarget: validMoves[randomIndex] };
  }

  return { moveTarget: null };
}
