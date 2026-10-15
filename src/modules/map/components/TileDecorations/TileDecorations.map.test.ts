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

/** Compares two instance arrays by position/sprite only, ignoring their ids: used when two
 *  scenarios reuse the same physical positions under different layout ids. */
function withoutIds(instances: { id: string }[]): unknown[] {
  return instances.map((instance) => {
    const copy: Record<string, unknown> = { ...instance };
    delete copy.id;
    return copy;
  });
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
  it('returns the migrated 15-instance Base layout exactly, from the real config file', () => {
    const baseIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Base });

    const layout = toDecorationLayout(baseIsland, true, realConfig);

    expect(layout).toEqual(realConfig.base[0]);
    expect(layout.instances).toHaveLength(15);
    expect(layout.instances[0]).toEqual({
      id: 'base-default-0',
      image: '/sprites/decorations/pine_tree.gif',
      top: 36.5,
      left: 44.5,
      size: 15,
      z: 10,
    });
    expect(layout.instances[14]).toEqual({
      id: 'base-default-14',
      image: '/sprites/decorations/autmn_tree.gif',
      top: 37.5,
      left: 52.5,
      size: 15,
      z: 10,
    });
  });

  it('returns the migrated 9-instance Special layout exactly, from the real config file', () => {
    const specialIsland = island({ id: '5-5', x: 5, y: 5, type: IslandType.Special });

    const layout = toDecorationLayout(specialIsland, false, realConfig);

    expect(layout).toEqual(realConfig.special[0]);
    expect(layout.instances).toHaveLength(9);
    expect(layout.instances[8]).toEqual({
      id: 'special-default-8',
      image: '/sprites/decorations/pine_tree.gif',
      top: 27.4,
      left: 21.9,
      size: 16,
      z: 20,
    });
  });

  it('returns the migrated 2-instance grove for an Empty island at an even seed', () => {
    const emptyIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Empty });

    const layout = toDecorationLayout(emptyIsland, false, realConfig);

    expect(layout).toEqual(realConfig['empty-2'][0]);
    expect(layout.instances).toEqual([
      { id: 'empty-2-default-0', image: '/sprites/decorations/pine_tree.gif', top: 32, left: 38, size: 28, z: 12 },
      { id: 'empty-2-default-1', image: '/sprites/decorations/spring_tree.gif', top: 38, left: 62, size: 28, z: 14 },
    ]);
  });

  it('returns the migrated 3-instance grove for an Empty island at an odd seed', () => {
    const emptyIsland = island({ id: '1-0', x: 1, y: 0, type: IslandType.Empty });

    const layout = toDecorationLayout(emptyIsland, false, realConfig);

    expect(layout).toEqual(realConfig['empty-3'][0]);
    expect(layout.instances).toEqual([
      { id: 'empty-3-default-0', image: '/sprites/decorations/pine_tree.gif', top: 32, left: 38, size: 28, z: 12 },
      { id: 'empty-3-default-1', image: '/sprites/decorations/spring_tree.gif', top: 38, left: 62, size: 28, z: 14 },
      { id: 'empty-3-default-2', image: '/sprites/decorations/autmn_tree.gif', top: 60, left: 58, size: 28, z: 13 },
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

  it('returns an empty instances array for a living-Monster island (suppressed only while alive)', () => {
    const monsterIsland = island({
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      monsters: [{ name: 'Bear', level: 1, sprite: { idle: '', attack: '', death: '' } }],
    });

    const layout = toDecorationLayout(monsterIsland, false, realConfig);

    expect(layout.instances).toEqual([]);
  });

  it('picks the 2-tree monster-cleared layout at the same seed parity Empty uses for its 2-tree grove', () => {
    const clearedIsland = island({ id: '0-0', x: 0, y: 0, type: IslandType.Monster, monsters: [] });

    const layout = toDecorationLayout(clearedIsland, false, realConfig);

    expect(layout.id).toBe('monster-cleared-default-2trees');
    expect(withoutIds(layout.instances)).toEqual(withoutIds(realConfig['empty-2'][0].instances));
  });

  it('picks the 3-tree monster-cleared layout at the same seed parity Empty uses for its 3-tree grove', () => {
    const clearedIsland = island({ id: '1-0', x: 1, y: 0, type: IslandType.Monster, monsters: [] });

    const layout = toDecorationLayout(clearedIsland, false, realConfig);

    expect(layout.id).toBe('monster-cleared-default-3trees');
    expect(withoutIds(layout.instances)).toEqual(withoutIds(realConfig['empty-3'][0].instances));
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
