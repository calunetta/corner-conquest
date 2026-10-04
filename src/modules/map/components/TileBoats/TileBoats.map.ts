import type { GameState, Island, Player, PlayerColor } from '@/lib/types';
import { IslandType } from '@/lib/types';
import type { BoatEntryViewModel } from './TileBoats.types';
import { BOAT_CORNER_POSITIONS } from './TileBoats.types';

export const COLLECTOR_IDLE_SPRITES: Record<PlayerColor, string> = {
  blue: '/sprites/collector_blue_idle.gif',
  red: '/sprites/collector_red_idle.gif',
  purple: '/sprites/collector_purple_idle.gif',
  yellow: '/sprites/collector_yellow_idle.gif',
};

function determineVisibility(
  island: Island,
  players: GameState['players'],
  localPlayer: Player | null,
  debugMode: boolean,
  fogOfWar: boolean,
): boolean {
  if (debugMode) {
    return true;
  }
  if (island.type === IslandType.Base) {
    return true;
  }
  if (fogOfWar) {
    return localPlayer ? localPlayer.revealedTiles.includes(island.id) : false;
  }
  return players.some((p) => p.revealedTiles.includes(island.id));
}

export function toTileBoatsViewModel(
  island: Island,
  players: GameState['players'],
  localPlayer: Player | null,
  debugMode: boolean,
  fogOfWar: boolean,
): BoatEntryViewModel[] | null {
  // Determine visibility
  const isTileVisible = determineVisibility(island, players, localPlayer, debugMode, fogOfWar);

  if (!isTileVisible) {
    return null;
  }

  // Find occupants on this island
  const occupants = island.occupants
    .map((o) => {
      const player = players.find((p) => p.id === o.playerId);
      const army = player?.armies.find((a) => a.id === o.armyId);
      return { player, army, armyId: o.armyId, playerId: o.playerId };
    })
    .filter(
      (item): item is {
        player: NonNullable<typeof item.player>;
        army: NonNullable<typeof item.army>;
        armyId: number;
        playerId: number;
      } => !!item.player && !!item.army,
    );

  // If this is a player's base tile, dock the owner's boat
  const isBase = island.type === IslandType.Base;
  const baseOwner = isBase && island.owner !== undefined ? players.find((p) => p.id === island.owner) : null;

  interface BoatEntry {
    key: string;
    player: (typeof players)[0];
    armyId?: number;
    showIdleCollector: boolean;
  }

  const boatEntries: BoatEntry[] = [];

  if (occupants.length > 0) {
    occupants.forEach(({ player, armyId }) => {
      // Check if this army is actively positioned on a resource
      const isPositionedOnResource = (island.positionedBy || []).some((pos) => pos.playerId === player.id);

      boatEntries.push({
        key: `boat-${player.id}-${armyId}`,
        player,
        armyId,
        showIdleCollector: !isPositionedOnResource,
      });
    });
  } else if (baseOwner) {
    // Base tile starts with owner's boat attached
    const isBasePositioned = (island.positionedBy || []).some((pos) => pos.playerId === baseOwner.id);
    boatEntries.push({
      key: `boat-base-${baseOwner.id}`,
      player: baseOwner,
      showIdleCollector: !isBasePositioned,
    });
  }

  if (boatEntries.length === 0) {
    return null;
  }

  function getCornerPosition(entryIndex: number): (typeof BOAT_CORNER_POSITIONS)[number] {
    return BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length];
  }

  return boatEntries.map((entry, index) => {
    const corner = getCornerPosition(index);
    const idleCollectorSprite = COLLECTOR_IDLE_SPRITES[entry.player.color];

    const cornerStyle: Record<string, string> = {};
    const style = corner.style as Record<string, string | undefined>;
    Object.entries(style).forEach(([key, value]) => {
      if (value !== undefined) {
        cornerStyle[key] = value;
      }
    });

    return {
      key: entry.key,
      color: entry.player.color,
      cornerStyle,
      showIdleCollector: entry.showIdleCollector,
      idleCollectorSprite,
    };
  });
}
