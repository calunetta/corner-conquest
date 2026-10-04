import { IslandType } from '@/lib/types';
import type { Island } from '@/lib/types';
import type { IslandTileContext, IslandTileStaticViewModel } from './IslandTile.types';

/**
 * Pure derivations from board state for a single island tile. Excludes
 * `deathAnimationOnTile` (needs Date.now()) and `borderImageSequence` (needs Math.random()) —
 * those stay in `useIslandTile` (legacy IslandTile.tsx:42-80,144-148).
 */
export function toIslandTileViewModel(island: Island, context: IslandTileContext): IslandTileStaticViewModel {
  const { gameState, localPlayer, uiState, selectedArmy } = context;
  const { players, debugMode, settings } = gameState;
  const { possibleMoves, pendingAction, selectedArmyId } = uiState;
  const fogOfWar = settings.fogOfWar;

  const isTeleporting = pendingAction?.type === 'teleport';
  const isScouting = pendingAction?.type === 'scout';
  const isOpponentBase = island.type === IslandType.Base && island.owner !== localPlayer.id;
  const isPossibleMove = isTeleporting
    ? selectedArmyId !== null && !isOpponentBase
    : possibleMoves.some((p) => p.x === island.x && p.y === island.y);

  const isSelected =
    !!selectedArmy && selectedArmy.position.x === island.x && selectedArmy.position.y === island.y;

  const isPersonallyRevealed = localPlayer.revealedTiles.includes(island.id);

  const isScoutTarget = isScouting && (debugMode ? false : fogOfWar && !isPersonallyRevealed);
  const isTeleportTarget =
    isTeleporting &&
    !isOpponentBase &&
    (!selectedArmy || !(selectedArmy.position.x === island.x && selectedArmy.position.y === island.y));

  const isBase = island.type === IslandType.Base;
  const baseOwner = isBase && island.owner !== undefined ? (players.find((p) => p.id === island.owner) ?? null) : null;

  const isTileVisible = toIsTileVisible(island, { debugMode, fogOfWar, isPersonallyRevealed, players });

  const tilePlayerColor = toTilePlayerColor(island, players, localPlayer, isTileVisible);

  const isClickable =
    isPossibleMove ||
    isScoutTarget ||
    isTeleportTarget ||
    island.occupants.some((o) => o.playerId === localPlayer.id);

  return {
    isSelected,
    isPossibleMove,
    isTeleportTarget,
    isScoutTarget,
    isTileVisible,
    isBase,
    baseOwner,
    tilePlayerColor,
    isClickable,
  };
}

function toIsTileVisible(
  island: Island,
  options: { debugMode: boolean; fogOfWar: boolean; isPersonallyRevealed: boolean; players: IslandTileContext['gameState']['players'] },
): boolean {
  const { debugMode, fogOfWar, isPersonallyRevealed, players } = options;
  if (debugMode) return true;
  if (island.type === IslandType.Base) return true;
  if (fogOfWar) return isPersonallyRevealed;
  return players.some((p) => p.revealedTiles.includes(island.id));
}

function toTilePlayerColor(
  island: Island,
  players: IslandTileContext['gameState']['players'],
  localPlayer: IslandTileContext['localPlayer'],
  isTileVisible: boolean,
): IslandTileStaticViewModel['tilePlayerColor'] {
  if (!isTileVisible) return null;

  const occupantIds = new Set(island.occupants.map((o) => o.playerId));
  if (occupantIds.size !== 1) return null;

  const singlePlayerId = occupantIds.values().next().value;
  const singlePlayer = players.find((p) => p.id === singlePlayerId);
  if (singlePlayer && singlePlayer.id === localPlayer.id) {
    return singlePlayer.color;
  }
  return null;
}
