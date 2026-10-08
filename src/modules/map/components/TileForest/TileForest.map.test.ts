import { toForestLayout } from './TileForest.map';
import { IslandType, type Island } from '@/lib/types';
import { TREE_SPRITES } from './TileForest.types';

describe('toForestLayout', () => {
  it('returns null for Resource islands', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const result = toForestLayout(island, false);
    expect(result).toBeNull();
  });

  it('returns null for Monster islands with living monsters', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [],
      occupants: [],
      monsters: [
        {
          name: 'Bear',
          level: 1,
          sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/bear_death.gif' },
        },
      ],
    };

    const result = toForestLayout(island, false);
    expect(result).toBeNull();
  });

  it('returns a layout for cleared Monster islands (empty monsters array)', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [],
      occupants: [],
      monsters: [],
    };

    const result = toForestLayout(island, false);
    expect(result).not.toBeNull();
    // Seed for (2,2) is even, so the grove always has exactly 2 trees.
    expect(result!.layout.length).toBe(2);
    expect(result!.layout.map((slot) => slot.size)).toEqual(['28%', '28%']);
  });

  it('returns 2-tree base layout when isBase is true', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      resources: [],
      occupants: [],
    };

    const result = toForestLayout(island, true);
    expect(result).not.toBeNull();
    expect(result!.layout.length).toBe(2);
    expect(result!.layout[0]).toHaveProperty('top', '4px');
    expect(result!.layout[1]).toHaveProperty('top', '10%');
    expect(result!.layout.map((slot) => slot.size)).toEqual(['16%', '16%']);
  });

  it('returns 1-tree special layout for Special islands', () => {
    const island: Island = {
      id: '3-3',
      x: 3,
      y: 3,
      type: IslandType.Special,
      resources: [],
      occupants: [],
    };

    const result = toForestLayout(island, false);
    expect(result).not.toBeNull();
    expect(result!.layout.length).toBe(1);
    expect(result!.layout[0]).toHaveProperty('top', '4px');
    expect(result!.layout[0].size).toBe('16%');
  });

  it('returns a 2-tree grove for island 0-0 and a 3-tree grove for island 1-0', () => {
    const islandTwoTrees: Island = { id: '0-0', x: 0, y: 0, type: IslandType.Empty, resources: [], occupants: [] };
    const islandThreeTrees: Island = { id: '1-0', x: 1, y: 0, type: IslandType.Empty, resources: [], occupants: [] };

    const twoTrees = toForestLayout(islandTwoTrees, false);
    const threeTrees = toForestLayout(islandThreeTrees, false);

    expect(twoTrees!.layout).toHaveLength(2);
    expect(twoTrees!.layout.map((slot) => slot.size)).toEqual(['28%', '28%']);
    expect(threeTrees!.layout).toHaveLength(3);
    expect(threeTrees!.layout.map((slot) => slot.size)).toEqual(['28%', '28%', '28%']);
  });

  it('picks the tree sprite from the seed table for known islands', () => {
    // Literal expectations, hand-computed from seed = x*7 + y*13 and index = seed % 4:
    // 0-0 seed 0 -> 0; 1-1 seed 20 -> 0; 1-0 seed 7 -> 3; 0-1 seed 13 -> 1.
    const expectations: Array<[Island, (typeof TREE_SPRITES)[number]]> = [
      [{ id: '0-0', x: 0, y: 0, type: IslandType.Empty, resources: [], occupants: [] }, TREE_SPRITES[0]],
      [{ id: '1-1', x: 1, y: 1, type: IslandType.Empty, resources: [], occupants: [] }, TREE_SPRITES[0]],
      [{ id: '1-0', x: 1, y: 0, type: IslandType.Empty, resources: [], occupants: [] }, TREE_SPRITES[3]],
      [{ id: '0-1', x: 0, y: 1, type: IslandType.Empty, resources: [], occupants: [] }, TREE_SPRITES[1]],
    ];

    expectations.forEach(([island, expectedSprite]) => {
      expect(toForestLayout(island, false)!.treeSprite).toBe(expectedSprite);
    });
  });

  it('uses different tree sprite when isBase changes seed', () => {
    const island: Island = {
      id: '10-10',
      x: 10,
      y: 10,
      type: IslandType.Base,
      resources: [],
      occupants: [],
    };

    const resultBase = toForestLayout(island, true);
    const resultNotBase = toForestLayout(island, false);

    // Since isBase affects the seed (adds 3 to seed when true), the sprites may differ
    const seedBase = Math.abs(10 * 7 + 10 * 13 + 3);
    const seedNotBase = Math.abs(10 * 7 + 10 * 13 + 0);

    const expectedSpriteBase = TREE_SPRITES[seedBase % TREE_SPRITES.length];
    const expectedSpriteNotBase = TREE_SPRITES[seedNotBase % TREE_SPRITES.length];

    expect(resultBase!.treeSprite).toBe(expectedSpriteBase);
    expect(resultNotBase!.treeSprite).toBe(expectedSpriteNotBase);
  });

  it('returns deterministic layout for the same island coordinates', () => {
    const island: Island = {
      id: '7-3',
      x: 7,
      y: 3,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result1 = toForestLayout(island, false);
    const result2 = toForestLayout(island, false);

    expect(result1).toEqual(result2);
  });

  it('does not mutate input island', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const originalIsland = JSON.parse(JSON.stringify(island));

    toForestLayout(island, false);

    expect(island).toEqual(originalIsland);
  });

  describe('tree size units per layout', () => {
    // Cleared islands are Monster islands whose monsters are all gone: they take the grove layout.
    it.each([
      ['Monster island with monsters: []', { type: IslandType.Monster, monsters: [] }],
      ['Monster island with monsters undefined', { type: IslandType.Monster }],
    ])('%s uses the grove layout with 28%% trees', (_label, typeFields) => {
      // (2,2) seed is even, so the grove has exactly 2 trees.
      const island: Island = { id: '2-2', x: 2, y: 2, resources: [], occupants: [], ...typeFields } as Island;

      const result = toForestLayout(island, false);

      expect(result!.layout.map((slot) => slot.size)).toEqual(['28%', '28%']);
    });

    it('uses the 16% base layout whenever isBase is true, regardless of island type', () => {
      const island: Island = { id: '4-4', x: 4, y: 4, type: IslandType.Empty, resources: [], occupants: [] };

      const result = toForestLayout(island, true);

      expect(result!.layout.map((slot) => slot.size)).toEqual(['16%', '16%']);
    });
  });
});
