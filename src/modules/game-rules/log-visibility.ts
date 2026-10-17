import type { GameState, Player, StructuredLogEntry } from '@/lib/types';
import { IslandType } from '@/lib/types';

/**
 * Whether `viewer` may read the full message of `entry`. Entries without `visibility` are public.
 *
 * Tile visibility mirrors the map's fog rule (`toIsTileVisible` in IslandTile.map.ts): debug mode
 * shows everything, Bases are always visible, fog of war shows only the viewer's own revealed tiles,
 * and with fog off any tile some player revealed is shared. Keep the two in step.
 */
export function canViewerReadLogEntry(state: GameState, viewer: Player | null, entry: StructuredLogEntry): boolean {
  const { visibility } = entry;
  if (!visibility) return true;
  if (viewer && entry.playerId === viewer.playerId) return true;
  if (visibility.scope === 'owner') return false;

  return visibility.tileIds.some((tileId) => isTileVisibleToViewer(state, viewer, tileId));
}

function isTileVisibleToViewer(state: GameState, viewer: Player | null, tileId: string): boolean {
  if (state.debugMode) return true;

  const tile = state.map.find((island) => island.id === tileId);
  if (tile?.type === IslandType.Base) return true;

  if (state.settings.fogOfWar) {
    return viewer?.revealedTiles.includes(tileId) ?? false;
  }
  return state.players.some((player) => player.revealedTiles.includes(tileId));
}
