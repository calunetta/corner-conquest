import type { GameState, Island, Player } from '@/lib/types';
import { IslandType, ResourceType } from '@/lib/types';

const COLS = 3;
const ROWS = 2;

/** One resource island at (1, 0) with all three resource types, plus empty filler tiles. */
export function buildDemoMap(): Island[] {
  const tiles: Island[] = Array.from({ length: COLS * ROWS }, (_, i) => ({
    id: `${i % COLS}-${Math.floor(i / COLS)}`,
    x: i % COLS,
    y: Math.floor(i / COLS),
    type: IslandType.Empty,
    resources: [],
    occupants: [],
  }));
  tiles[1] = {
    id: '1-0',
    x: 1,
    y: 0,
    type: IslandType.Resource,
    resources: [
      { type: ResourceType.Food, amount: 1 },
      { type: ResourceType.Wood, amount: 1 },
      { type: ResourceType.Gold, amount: 2 },
    ],
    occupants: [],
  };
  return tiles;
}

export function buildDemoGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    turn: 1,
    map: buildDemoMap(),
    settings: { gridSize: { rows: ROWS, cols: COLS } },
    log: [],
    ...overrides,
  } as unknown as GameState;
}

/** One army sitting on the resource tile (1, 0), not yet positioned. */
export function buildDemoPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 0,
    playerId: 'demo-player',
    positions: [],
    armies: [{ id: 0, position: { x: 1, y: 0 }, hasActed: false }],
    ...overrides,
  } as unknown as Player;
}
