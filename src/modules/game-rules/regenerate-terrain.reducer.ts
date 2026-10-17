import type { GameState, Island } from '@/lib/types';
import { IslandType, MAP_COLS } from '@/lib/types';
import { generateIslandTerrain } from './map-generation';

/** Splits the flat, row-major map back into rows. Inverse of `map2D.flat()` in game setup. */
function toRows(map: Island[]): Island[][] {
  const rows: Island[][] = [];
  for (let i = 0; i < map.length; i += MAP_COLS) rows.push(map.slice(i, i + MAP_COLS));
  return rows;
}

/** Tiles a reroll may change: not a base, and no army stands on them. */
function isRerollable(tile: Island): boolean {
  return tile.type !== IslandType.Base && tile.occupants.length === 0;
}

/**
 * Debug-only: rerolls the terrain (island types, resources and monsters) of every tile that is
 * neither a base nor occupied. Bases and occupied tiles keep their state. Does nothing outside
 * debug matches.
 */
export function handleRegenerateTerrain(state: GameState): GameState {
  if (!state.debugMode) return state;

  const rows = toRows(state.map);
  const kept = new Map<string, Island>();
  for (const row of rows) {
    for (const tile of row) {
      if (isRerollable(tile)) {
        // Clear stale contents first, so a tile that becomes a monster island does not keep resources.
        tile.resources = [];
        delete tile.monsters;
      } else {
        // Shallow copy: the generator only reassigns these fields, so the copy keeps the old values.
        kept.set(tile.id, { ...tile });
      }
    }
  }

  generateIslandTerrain(rows, state.settings);

  // The generator writes every non-base tile, so put the occupied ones back as they were.
  const map = rows.flat().map((tile) => kept.get(tile.id) ?? tile);
  return { ...state, map };
}
