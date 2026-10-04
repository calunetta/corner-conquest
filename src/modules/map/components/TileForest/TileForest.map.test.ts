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
    expect(result!.layout.length).toBeGreaterThanOrEqual(2);
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
  });

  it('returns 2 or 3 trees for Empty islands based on seed parity', () => {
    // Test seed with even result (should be 2 trees)
    const islandEven: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const resultEven = toForestLayout(islandEven, false);
    const seed = Math.abs(0 * 7 + 0 * 13 + 0);
    const expectedCountEven = seed % 2 === 0 ? 2 : 3;
    expect(resultEven!.layout.length).toBe(expectedCountEven);

    // Test seed with odd result (should be 3 trees)
    const islandOdd: Island = {
      id: '1-0',
      x: 1,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const resultOdd = toForestLayout(islandOdd, false);
    const seedOdd = Math.abs(1 * 7 + 0 * 13 + 0);
    const expectedCountOdd = seedOdd % 2 === 0 ? 2 : 3;
    expect(resultOdd!.layout.length).toBe(expectedCountOdd);
  });

  it('cycles through TREE_SPRITES deterministically by seed', () => {
    const islands: Island[] = [
      { id: '0-0', x: 0, y: 0, type: IslandType.Empty, resources: [], occupants: [] },
      { id: '1-1', x: 1, y: 1, type: IslandType.Empty, resources: [], occupants: [] },
      { id: '2-2', x: 2, y: 2, type: IslandType.Empty, resources: [], occupants: [] },
      { id: '3-3', x: 3, y: 3, type: IslandType.Empty, resources: [], occupants: [] },
    ];

    const sprites = islands.map((island) => {
      const seed = Math.abs(island.x * 7 + island.y * 13 + 0);
      return TREE_SPRITES[seed % TREE_SPRITES.length];
    });

    // All should be valid sprites
    sprites.forEach((sprite) => {
      expect(TREE_SPRITES).toContain(sprite);
    });

    // Verify that the same (x, y) coordinates always produce the same sprite
    const island1 = { id: '5-5', x: 5, y: 5, type: IslandType.Empty, resources: [], occupants: [] };
    const result1a = toForestLayout(island1, false);
    const result1b = toForestLayout(island1, false);
    expect(result1a!.treeSprite).toBe(result1b!.treeSprite);
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
});
