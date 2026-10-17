import { IslandType, ResourceType } from '@/lib/types';
import type { Island } from '@/lib/types';
import decorationLayoutsConfig from '../../decoration-layouts.config.json';
import type { DecorationLayoutsConfig } from '../../decoration-layouts.types';
import { toDecorationLayout, toScenarioKey } from './TileDecorations.map';
import { decorationLayoutsConfigFixture } from './TileDecorations.fixtures';

const realConfig = decorationLayoutsConfig as DecorationLayoutsConfig;

function island(overrides: Partial<Island> & Pick<Island, 'id' | 'x' | 'y' | 'type'>): Island {
  return { resources: [], occupants: [], ...overrides };
}

describe('toScenarioKey', () => {
  it('returns "base" whenever isBase is true, regardless of island type', () => {
    const resourceIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Resource });
    expect(toScenarioKey(resourceIsland, true)).toBe('base');
  });

  it('returns "special" for a Special island', () => {
    const specialIsland = island({ id: '3-3', x: 3, y: 3, type: IslandType.Special });
    expect(toScenarioKey(specialIsland, false)).toBe('special');
  });

  it.each([
    ['even seed (0-0, seed 0)', { id: '0-0', x: 0, y: 0 }, 'empty-2'],
    ['odd seed (1-0, seed 7)', { id: '1-0', x: 1, y: 0 }, 'empty-3'],
  ])('resolves an Empty island with %s to %s', (_label, coords, expected) => {
    const emptyIsland = island({ ...coords, type: IslandType.Empty });
    expect(toScenarioKey(emptyIsland, false)).toBe(expected);
  });

  it.each([
    [[{ type: ResourceType.Food, amount: 1 }], 'resource-1'],
    [[{ type: ResourceType.Food, amount: 2 }], 'resource-2'],
    [[{ type: ResourceType.Food, amount: 1 }, { type: ResourceType.Wood, amount: 2 }], 'resource-3'],
    [[{ type: ResourceType.Food, amount: 2 }, { type: ResourceType.Wood, amount: 2 }], 'resource-4'],
    [[{ type: ResourceType.Food, amount: 3 }, { type: ResourceType.Wood, amount: 3 }], 'resource-4'],
  ])('resolves a Resource island with total amount %j to %s', (resources, expected) => {
    const resourceIsland = island({ id: '1-1', x: 1, y: 1, type: IslandType.Resource, resources });
    expect(toScenarioKey(resourceIsland, false)).toBe(expected);
  });

  it('clamps an empty resources array (total 0) to resource-1, not resource-0', () => {
    const resourceIsland = island({ id: '1-1', x: 1, y: 1, type: IslandType.Resource, resources: [] });
    expect(toScenarioKey(resourceIsland, false)).toBe('resource-1');
  });

  it('resolves a Monster island with at least one living monster to monster-alive', () => {
    const monsterIsland = island({
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      monsters: [{ name: 'Bear', level: 1, sprite: { idle: '', attack: '', death: '' } }],
    });
    expect(toScenarioKey(monsterIsland, false)).toBe('monster-alive');
  });

  it.each([
    ['empty monsters array', []],
    ['monsters field undefined', undefined],
  ])('resolves a Monster island with %s to monster-cleared', (_label, monsters) => {
    const monsterIsland = island({ id: '2-2', x: 2, y: 2, type: IslandType.Monster, monsters });
    expect(toScenarioKey(monsterIsland, false)).toBe('monster-cleared');
  });
});

describe('toDecorationLayout', () => {
  it('returns the default Base grove exactly, from the real config file', () => {
    const baseIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Base });

    const layout = toDecorationLayout(baseIsland, true, realConfig);

    expect(layout).toEqual(realConfig.base[1]);
    expect(layout.instances).toHaveLength(16);
    expect(layout.instances[0]).toEqual({ id: 'base-default-b-0', image: '/sprites/decorations/rock-2.png', top: 3, left: 28.2, size: 9, z: 10 });
    expect(layout.instances[15]).toEqual({ id: 'base-default-b-15', image: '/sprites/decorations/01.png', top: 79.2, left: 27.8, size: 10, z: 17 });
  });

  it('returns the default Special grove exactly, from the real config file', () => {
    const specialIsland = island({ id: '5-5', x: 5, y: 5, type: IslandType.Special });

    const layout = toDecorationLayout(specialIsland, false, realConfig);

    expect(layout).toEqual(realConfig.special[0]);
    expect(layout.instances).toHaveLength(13);
    expect(layout.instances[12]).toEqual({ id: 'special-default-a-12', image: '/sprites/decorations/bones-3.png', top: 60.7, left: 14.3, size: 9, z: 16 });
  });

  it('returns the default 2-instance grove for an Empty island at an even seed', () => {
    const emptyIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Empty });

    const layout = toDecorationLayout(emptyIsland, false, realConfig);

    expect(layout).toEqual(realConfig['empty-2'][0]);
    expect(layout.instances).toEqual([
      { id: 'empty-2-default-a-0', image: '/sprites/decorations/rock-2.png', top: 39.4, left: 62.6, size: 9, z: 13 },
      { id: 'empty-2-default-a-1', image: '/sprites/decorations/09.png', top: 42.5, left: 49.6, size: 11, z: 14 },
      { id: 'empty-2-default-a-2', image: '/sprites/decorations/bush-3.gif', top: 50.6, left: 26, size: 14, z: 15 },
      { id: 'empty-2-default-a-3', image: '/sprites/decorations/07.png', top: 57.5, left: 67.8, size: 11, z: 15 },
      { id: 'empty-2-default-a-4', image: '/sprites/decorations/bush-1.gif', top: 60.4, left: 56.8, size: 14, z: 16 },
      { id: 'empty-2-default-a-5', image: '/sprites/decorations/rock-1.png', top: 63.1, left: 37.9, size: 9, z: 16 },
    ]);
  });

  it('returns the default 3-instance grove for an Empty island at an odd seed', () => {
    const emptyIsland = island({ id: '1-0', x: 1, y: 0, type: IslandType.Empty });

    const layout = toDecorationLayout(emptyIsland, false, realConfig);

    expect(layout).toEqual(realConfig['empty-3'][1]);
    expect(layout.instances).toEqual([
      { id: 'empty-3-default-b-0', image: '/sprites/decorations/tree-1.gif', top: 42, left: 76.8, size: 30, z: 14 },
      { id: 'empty-3-default-b-1', image: '/sprites/decorations/rock-2.png', top: 46.8, left: 51.1, size: 9, z: 14 },
      { id: 'empty-3-default-b-2', image: '/sprites/decorations/09.png', top: 59.1, left: 63.5, size: 11, z: 15 },
      { id: 'empty-3-default-b-3', image: '/sprites/decorations/08.png', top: 73.2, left: 50.2, size: 11, z: 17 },
      { id: 'empty-3-default-b-4', image: '/sprites/decorations/09.png', top: 78.6, left: 70.7, size: 11, z: 17 },
      { id: 'empty-3-default-b-5', image: '/sprites/decorations/10.png', top: 80.1, left: 42.9, size: 11, z: 18 },
      { id: 'empty-3-default-b-6', image: '/sprites/decorations/rock-2.png', top: 85, left: 55.3, size: 9, z: 18 },
    ]);
  });

  it('returns an empty instances array for a fresh Resource island (unconditional suppression today)', () => {
    const resourceIsland = island({
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
    });

    const layout = toDecorationLayout(resourceIsland, false, realConfig);

    expect(layout.instances).toEqual([]);
  });

  it('returns the lair layout for a living-Monster island: skull sticks, bones, weapons and no trees', () => {
    const monsterIsland = island({
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      monsters: [{ name: 'Bear', level: 1, sprite: { idle: '', attack: '', death: '' } }],
    });

    const layout = toDecorationLayout(monsterIsland, false, realConfig);

    expect(layout.id).toMatch(/^monster-alive-default-/);
    expect(layout.instances.length).toBeGreaterThan(0);
    expect(layout.instances.some((instance) => instance.image.includes('bones-'))).toBe(true);
    expect(layout.instances.some((instance) => instance.image.includes('tree'))).toBe(false);
  });

  it('picks a cleared-monster layout with two or three weapons and no trees', () => {
    const clearedIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Monster, monsters: [] });

    const layout = toDecorationLayout(clearedIsland, false, realConfig);

    const weapons = layout.instances.filter((instance) => instance.image.includes('/tool-'));
    expect(layout.id).toBe('monster-cleared-default-a');
    expect(weapons.length).toBeGreaterThanOrEqual(2);
    expect(weapons.length).toBeLessThanOrEqual(3);
    expect(layout.instances.some((instance) => instance.image.includes('tree'))).toBe(false);
  });

  it('uses the second cleared-monster layout at the odd seed parity', () => {
    const clearedIsland = island({ id: '1-0', x: 1, y: 0, type: IslandType.Monster, monsters: [] });

    expect(toDecorationLayout(clearedIsland, false, realConfig).id).toBe('monster-cleared-default-b');
  });

  it('is deterministic: the same island resolves to the same layout reference every call', () => {
    const emptyIsland = island({ id: '7-3', x: 7, y: 3, type: IslandType.Empty });

    const first = toDecorationLayout(emptyIsland, false, realConfig);
    const second = toDecorationLayout(emptyIsland, false, realConfig);

    expect(first).toEqual(second);
  });

  it('does not mutate the input island', () => {
    const emptyIsland = island({ id: '1-1', x: 1, y: 1, type: IslandType.Empty });
    const before = JSON.parse(JSON.stringify(emptyIsland));

    toDecorationLayout(emptyIsland, false, realConfig);

    expect(emptyIsland).toEqual(before);
  });

  it('accepts an injected config (used by tests/previews) instead of the real migrated file', () => {
    const baseIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Base });

    const layout = toDecorationLayout(baseIsland, true, decorationLayoutsConfigFixture);

    expect(layout).toEqual(decorationLayoutsConfigFixture.base[0]);
    expect(layout.instances).toHaveLength(1);
  });
});
