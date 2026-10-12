import type { GameState, Island, Player } from '@/lib/types';
import { IslandType, ResourceType } from '@/lib/types';
import { clearCollectedPositions } from './resource-collection';

const COLS = 5;

function buildState(map: Island[]): GameState {
  return {
    settings: { gridSize: { rows: 2, cols: COLS } },
    map,
  } as unknown as GameState;
}

function buildTile(x: number, y: number, positionedBy: Island['positionedBy'] = []): Island {
  return {
    id: `${x}-${y}`,
    x,
    y,
    type: IslandType.Resource,
    resources: [{ type: ResourceType.Food, amount: 1 }],
    occupants: [],
    positionedBy,
  };
}

function buildPlayer(positions: Player['positions']): Player {
  return { id: 0, positions } as Player;
}

describe('clearCollectedPositions', () => {
  it('removes the collected position from player.positions and its tile.positionedBy entry', () => {
    const tile = buildTile(0, 0, [{ playerId: 0, resource: ResourceType.Food }]);
    const pos = { x: 0, y: 0, resource: ResourceType.Food, armyId: 0 };
    const player = buildPlayer([pos]);
    const state = buildState([tile]);

    clearCollectedPositions(state, player, [pos]);

    expect(player.positions).toHaveLength(0);
    expect(tile.positionedBy).toEqual([]);
  });

  it('leaves positions not in collectedPositions untouched', () => {
    const tileA = buildTile(0, 0, [{ playerId: 0, resource: ResourceType.Food }]);
    const tileB = buildTile(1, 0, [{ playerId: 0, resource: ResourceType.Gold }]);
    const collected = { x: 0, y: 0, resource: ResourceType.Food, armyId: 0 };
    const uncollected = { x: 1, y: 0, resource: ResourceType.Gold, armyId: 1 };
    const player = buildPlayer([collected, uncollected]);
    const state = buildState([tileA, tileB]);

    clearCollectedPositions(state, player, [collected]);

    expect(player.positions).toEqual([uncollected]);
    expect(tileA.positionedBy).toEqual([]);
    expect(tileB.positionedBy).toEqual([{ playerId: 0, resource: ResourceType.Gold }]);
  });

  it('only clears the positionedBy entry matching both playerId and resource (another player on the same tile is untouched)', () => {
    const tile = buildTile(0, 0, [
      { playerId: 0, resource: ResourceType.Food },
      { playerId: 1, resource: ResourceType.Gold },
    ]);
    const pos = { x: 0, y: 0, resource: ResourceType.Food, armyId: 0 };
    const player = buildPlayer([pos]);
    const state = buildState([tile]);

    clearCollectedPositions(state, player, [pos]);

    expect(tile.positionedBy).toEqual([{ playerId: 1, resource: ResourceType.Gold }]);
  });

  it('is a no-op when collectedPositions is empty (empty input)', () => {
    const tile = buildTile(0, 0, [{ playerId: 0, resource: ResourceType.Food }]);
    const pos = { x: 0, y: 0, resource: ResourceType.Food, armyId: 0 };
    const player = buildPlayer([pos]);
    const state = buildState([tile]);

    clearCollectedPositions(state, player, []);

    expect(player.positions).toEqual([pos]);
    expect(tile.positionedBy).toEqual([{ playerId: 0, resource: ResourceType.Food }]);
  });

  it('does not throw when the tile at a collected position has no positionedBy field (invalid/missing input)', () => {
    const tile: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      // positionedBy intentionally omitted
    };
    const pos = { x: 0, y: 0, resource: ResourceType.Food, armyId: 0 };
    const player = buildPlayer([pos]);
    const state = buildState([tile]);

    expect(() => clearCollectedPositions(state, player, [pos])).not.toThrow();
    expect(player.positions).toHaveLength(0);
  });
});
