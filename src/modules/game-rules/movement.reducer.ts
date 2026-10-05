import type { Army, GameState } from '@/lib/types';
import { CardName, GameAction, IslandType } from '@/lib/types';
import { revealIsland } from './island-discovery.reducer';
import { pushLogEntry } from './log-entry';

const MOVE_RADIUS = 2;

/** Tiles an army can reach this turn: within the move radius, not Empty, not an opponent's base. */
export function getPossibleMoves(state: GameState, army: Army): { x: number; y: number }[] {
  const { map, players, currentPlayerIndex, settings } = state;
  const currentPlayer = players[currentPlayerIndex];

  if (army.hasActed && !currentPlayer.hasExtraMove) {
    return [];
  }

  const { x, y } = army.position;
  const cols = settings.gridSize.cols;
  const rows = settings.gridSize.rows;

  const moves: { x: number; y: number }[] = [];
  for (let i = -MOVE_RADIUS; i <= MOVE_RADIUS; i++) {
    for (let j = -MOVE_RADIUS; j <= MOVE_RADIUS; j++) {
      if (Math.abs(i) + Math.abs(j) <= MOVE_RADIUS && (i !== 0 || j !== 0)) {
        const newX = x + i;
        const newY = y + j;
        if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
          const targetTile = map[newY * cols + newX];
          if (targetTile.type === IslandType.Empty) {
            continue;
          }
          moves.push({ x: newX, y: newY });
        }
      }
    }
  }
  return moves.filter((move) => {
    const tile = map[move.y * cols + move.x];
    const baseTileInfo = state.baseTiles.find((b) => b.x === tile.x && b.y === tile.y);
    return !baseTileInfo || baseTileInfo.owner === currentPlayer.id;
  });
}

/** Moves an army to a tile, either a normal move (within `getPossibleMoves`) or a Teleport. */
export function handleMoveAction(
  state: GameState,
  x: number,
  y: number,
  army: Army,
  isTeleport: boolean = false,
): GameState {
  const { players, currentPlayerIndex, map, discardPile, settings } = state;
  const player = players[currentPlayerIndex];

  const armyInState = player.armies.find((a) => a.id === army.id);
  if (!armyInState) throw new Error('Army not found for move action.');

  if (isTeleport) {
    const targetBase = state.baseTiles.find((b) => b.x === x && b.y === y);
    if (targetBase && targetBase.owner !== player.id) {
      throw new Error("Cannot teleport onto an opponent's base island.");
    }

    const cardIndex = player.specialCards.indexOf(CardName.Teleport);
    if (cardIndex > -1) {
      discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
      player.actionsThisTurn.push(GameAction.UseCard);
      pushLogEntry(state, { category: 'economy', message: `${player.name} teleported an army!`, playerId: player.playerId });
    } else {
      throw new Error('Teleport card not found, but was attempted to be used.');
    }
  } else {
    if (armyInState.hasActed && !player.hasExtraMove) {
      throw new Error(`Invalid move: Army ${armyInState.id} has already acted.`);
    }
    const possibleMoves = getPossibleMoves(state, armyInState);
    if (!possibleMoves.some((m) => m.x === x && m.y === y)) {
      throw new Error(`Invalid move for army ${armyInState.id} to (${x}, ${y}).`);
    }
  }

  const oldTile = map[armyInState.position.y * settings.gridSize.cols + armyInState.position.x];
  oldTile.occupants = oldTile.occupants.filter((o) => o.playerId !== player.id || o.armyId !== armyInState.id);

  const positionIndex = player.positions.findIndex((p) => p.armyId === armyInState.id);
  if (positionIndex > -1) {
    const removedPosition = player.positions.splice(positionIndex, 1)[0];
    if (oldTile.positionedBy) {
      oldTile.positionedBy = oldTile.positionedBy.filter(
        (p) => !(p.playerId === player.id && p.resource === removedPosition.resource),
      );
    }
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name} moved an army off ${removedPosition.resource}.`,
      playerId: player.playerId,
    });
  }

  armyInState.position = { x, y };
  const targetTile = state.map[y * settings.gridSize.cols + x];
  targetTile.occupants.push({ playerId: player.id, armyId: armyInState.id });

  if (isTeleport) {
    armyInState.hasActed = true;
  } else if (player.hasExtraMove) {
    player.hasExtraMove = false;
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name} used their Extra Move on an army.`,
      playerId: player.playerId,
    });
  } else {
    armyInState.hasActed = true;
  }

  const isFirstDiscovery = !player.revealedTiles.includes(targetTile.id);
  if (isFirstDiscovery) {
    state = revealIsland(state, x, y, isTeleport);
  }

  return state;
}
