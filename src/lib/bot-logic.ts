import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';
import { MAP_SIZE } from './game-logic';

/**
 * A very simple Finite State Machine for the bot's turn.
 * The bot will attempt actions in a specific order of priority.
 * If an action is successful, it might try another or end its turn.
 * If no actions are possible, it will end its turn.
 */
export function takeBotTurn(gameState: GameState): GameState {
  let newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  const botPlayer = newState.players[newState.currentPlayerIndex];
  
  console.log(`--- ${botPlayer.name}'s Turn ---`);

  // --- Decision Making ---

  // Priority 1: Deploy a new army if it makes sense.
  const canDeploy = botPlayer.resources.food >= botPlayer.nextArmyCost && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes('deploy');
  if (canDeploy) {
      try {
        newState = GameActions.handleDeployAction(newState);
        console.log(`${botPlayer.name} decided to deploy.`);
        // After deploying, the turn continues, it might be able to do something else.
      } catch (e) { /* ignore if fails, shouldn't happen with the check */ }
  }

  // Priority 2: Perform a non-move action if possible (Collect or Position).
  // Check this before moving, as moving prevents these actions.
  if (botPlayer.lastAction !== 'move') {
      for (const army of botPlayer.armies) {
          const armyTile = newState.map[army.position.y][army.position.x];
          const canCollect = botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);
          const canPosition = (armyTile.type === 'resource' || armyTile.type === 'base') && armyTile.resources.length > 0 && !botPlayer.positions.some(p => p.x === army.position.x && p.y === army.position.y);

          if (canCollect) {
              try {
                  newState.selectedArmyId = army.id;
                  newState = GameActions.handleCollectAction(newState);
                  console.log(`${botPlayer.name} decided to collect with army ${army.id}.`);
                  // End turn after collecting.
                  return GameActions.handleEndTurn(newState);
              } catch (e) { /* ignore */ }
          } else if (canPosition) {
              try {
                  newState.selectedArmyId = army.id;
                  const availableResources = armyTile.resources.filter(resource => {
                      return !(armyTile.positionedBy || []).some(p => p.resource === resource.type);
                  });
                  if (availableResources.length > 0) {
                      newState = GameActions.handleSelectResourceForPosition(newState, availableResources[0].type);
                      console.log(`${botPlayer.name} decided to position army ${army.id} on ${availableResources[0].type}.`);
                      // End turn after positioning.
                      return GameActions.handleEndTurn(newState);
                  }
              } catch (e) { /* ignore */ }
          }
      }
  }

  // Priority 3: Move an army if no other primary action was taken.
  const { armyToMove, moveTarget } = findBestMove(newState);
  if (armyToMove && moveTarget) {
      newState.selectedArmyId = armyToMove.id;
      newState = GameActions.handleTileClick(newState, armyToMove.position.x, armyToMove.position.y); // Select the army
      newState = GameActions.handleTileClick(newState, moveTarget.x, moveTarget.y); // Move to target
      console.log(`${botPlayer.name} decided to move army ${armyToMove.id} to ${moveTarget.x},${moveTarget.y}`);
      // After moving, the turn is over for the bot.
      return GameActions.handleEndTurn(newState);
  }

  // Fallback: If no other action can be taken, end the turn.
  console.log(`${botPlayer.name} cannot perform any actions and is ending its turn.`);
  return GameActions.handleEndTurn(newState);
}

function findBestMove(gameState: GameState): { armyToMove: Army | null; moveTarget: { x: number; y: number } | null } {
  const player = gameState.players[gameState.currentPlayerIndex];

  // Iterate through all armies to find one that can move
  for (const army of player.armies) {
    const { x, y } = army.position;
    
    // Generate all possible moves within 2 steps (Manhattan distance)
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
      // Stupid bot logic: just pick a random valid move for this army
      const randomIndex = Math.floor(Math.random() * validMoves.length);
      return { armyToMove: army, moveTarget: validMoves[randomIndex] };
    }
  }

  // If no army has any valid moves
  return { armyToMove: null, moveTarget: null };
}
