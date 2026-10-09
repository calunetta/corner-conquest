import type { GameState, Island, Player, PlayerColor } from '@/lib/types';
import { IslandType } from '@/lib/types';
import type { BoatEntryViewModel } from './TileBoats.types';
import { BOAT_CORNER_POSITIONS, CORNER_TRANSFORMS } from './TileBoats.types';

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
  }

  // Boats follow armies: an empty Base tile shows no boat once its owner's army has left.
  if (boatEntries.length === 0) {
    return null;
  }

  function getCornerPosition(entryIndex: number): (typeof BOAT_CORNER_POSITIONS)[number] {
    return BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length];
  }

  return boatEntries.map((entry, index) => {
    const corner = getCornerPosition(index);
    const idleCollectorSprite = COLLECTOR_IDLE_SPRITES[entry.player.color];

    const cornerStyle: Record<string, string> = {
      ...(corner.style as Record<string, string>),
      transform: CORNER_TRANSFORMS[corner.id],
    };

    return {
      key: entry.key,
      color: entry.player.color,
      cornerStyle,
      showIdleCollector: entry.showIdleCollector,
      idleCollectorSprite,
    };
  });
}
