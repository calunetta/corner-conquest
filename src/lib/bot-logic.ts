import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';
import { MAP_SIZE } from './game-logic';

/**
 * A simple Finite State Machine for the bot's turn.
 * The bot will attempt actions in a specific order of priority.
 * If an action is successful, it will end its turn.
 * If no actions are possible, it will end its turn.
 */
export function takeBotTurn(gameState: GameState): GameState {
  let newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  const botPlayer = newState.players[newState.currentPlayerIndex];
  
  console.log(`--- ${botPlayer.name}'s Turn ---`);

  // --- Decision Making FSM ---

  // Priority 1: Deploy a new army if it makes sense.
  const canDeploy = botPlayer.resources.food >= botPlayer.nextArmyCost && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes('deploy');
  if (canDeploy) {
      try {
        newState = GameActions.handleDeployAction(newState);
        console.log(`${botPlayer.name} decided to deploy.`);
        return GameActions.handleEndTurn(newState);
      } catch (e) { /* ignore if fails, shouldn't happen with the check */ }
  }
  
  // Priority 2: Iterate through armies to find any possible action (Collect, Position, Move)
  // This is more robust than the previous logic.
  for (const army of botPlayer.armies) {
    newState.selectedArmyId = army.id;
    const armyTile = newState.map[army.position.y][army.position.x];

    // Check for non-move actions first, as they are disallowed after moving.
    if (botPlayer.lastAction !== 'move') {
        // Can we collect?
        const canCollect = botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);
        if (canCollect) {
            try {
                newState = GameActions.handleCollectAction(newState);
                console.log(`${botPlayer.name} decided to collect with army ${army.id}.`);
                return GameActions.handleEndTurn(newState);
            } catch (e) { /* ignore */ }
        }

        // Can we position?
        const canPosition = (armyTile.type === 'resource' || armyTile.type === 'base') && armyTile.resources.length > 0 && !botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);
        if (canPosition) {
             try {
                const availableResources = armyTile.resources.filter(resource => {
                    return !(armyTile.positionedBy || []).some(p => p.resource === resource.type);
                });
                if (availableResources.length > 0) {
                    newState = GameActions.handleSelectResourceForPosition(newState, availableResources[0].type);
                    console.log(`${botPlayer.name} decided to position army ${army.id} on ${availableResources[0].type}.`);
                    return GameActions.handleEndTurn(newState);
                }
            } catch (e) { /* ignore */ }
        }
    }
    
    // Check for a move action for this army
    const { moveTarget } = findBestMoveForArmy(newState, army);
    if (moveTarget) {
        newState = GameActions.handleTileClick(newState, army.position.x, army.position.y); // Select the army
        newState = GameActions.handleTileClick(newState, moveTarget.x, moveTarget.y); // Move to target
        console.log(`${botPlayer.name} decided to move army ${army.id} to ${moveTarget.x},${moveTarget.y}`);
        return GameActions.handleEndTurn(newState);
    }
  }


  // Fallback: If after checking ALL armies and ALL actions, nothing can be done, end the turn.
  console.log(`${botPlayer.name} cannot perform any actions and is ending its turn.`);
  return GameActions.handleEndTurn(newState);
}

function findBestMoveForArmy(gameState: GameState, army: Army): { moveTarget: { x: number; y: number } | null } {
  const player = gameState.players[gameState.currentPlayerIndex];
  const { x, y } = army.position;
  
  const potentialMoves: { x: number; y: number }[] = [];
  const moveRadius = player.hasExtraMove ? 4 : 2;

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
      return tile.type !== 'base' || tile.owner === player.id;
  });

  if (validMoves.length > 0) {
    // Stupid bot logic: just pick a random valid move
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return { moveTarget: validMoves[randomIndex] };
  }

  return { moveTarget: null };
}
