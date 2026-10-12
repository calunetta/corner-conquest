import { toTileResourcesViewModel, RESOURCE_SPRITES, FARM_SPRITES } from './TileResources.map';
import { IslandType, ResourceType, PlayerColor, type Island, type Player } from '@/lib/types';
import {
  resourceIslandWithFood,
  resourceIslandWithDualResources,
  resourceIslandWithTwoDistinctResources,
  baseIslandWithResources,
} from './TileResources.fixtures';
import { baseIslandWithThreeResources } from '../IslandTile/IslandTile.fixtures';

const mockPlayers: Player[] = [
  {
    id: 0,
    name: 'Player Blue',
    color: PlayerColor.Blue,
    resources: { gold: 0, wood: 0, food: 0 },
    armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }],
    positions: [],
    specialCards: [],
    revealedTiles: ['1-1'],
    victoryPoints: 0,
    attackPower: 1,
    actionsThisTurn: [],
    nextArmyCost: 3,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    hasExtraMove: false,
    lastResourceRoll: null,
  } as unknown as Player,
  {
    id: 1,
    name: 'Player Red',
    color: PlayerColor.Red,
    resources: { gold: 0, wood: 0, food: 0 },
    armies: [{ id: 1, position: { x: 1, y: 1 }, hasActed: false }],
    positions: [],
    specialCards: [],
    revealedTiles: ['1-1'],
    victoryPoints: 0,
    attackPower: 1,
    actionsThisTurn: [],
    nextArmyCost: 3,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    hasExtraMove: false,
    lastResourceRoll: null,
  } as unknown as Player,
];

describe('toTileResourcesViewModel', () => {
  it('returns null for monster islands with living monsters', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      monsters: [
        {
          name: 'Bear',
          level: 1,
          sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/bear_death.gif' },
        },
      ],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).toBeNull();
  });

  it('returns the resources for a monster island whose monsters are all defeated', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      monsters: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe(ResourceType.Food);
  });

  it('returns null when island has no resources', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).toBeNull();
  });

  it('renders correct sprites for each resource type', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [
        { type: ResourceType.Food, amount: 1 },
        { type: ResourceType.Wood, amount: 1 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);

    const foodNode = result!.find((n) => n.type === ResourceType.Food);
    expect(foodNode!.spriteSrc).toBe(RESOURCE_SPRITES[ResourceType.Food].sprite);

    const woodNode = result!.find((n) => n.type === ResourceType.Wood);
    expect(woodNode!.spriteSrc).toBe(RESOURCE_SPRITES[ResourceType.Wood].sprite);

    const goldNode = result!.find((n) => n.type === ResourceType.Gold);
    expect(goldNode!.spriteSrc).toBe(RESOURCE_SPRITES[ResourceType.Gold].sprite);
  });

  it('expands resource amount into N distinct nodes', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 2 }],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result!.length).toBe(2);
    expect(result!.every((n) => n.type === ResourceType.Food)).toBe(true);
  });

  it('renders exactly 1 resource per type when isBase is true', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      resources: [
        { type: ResourceType.Food, amount: 3 },
        { type: ResourceType.Wood, amount: 2 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, true, mockPlayers);
    expect(result!.length).toBe(3); // 1 per resource type
    expect(result!.filter((n) => n.type === ResourceType.Food)).toHaveLength(1);
    expect(result!.filter((n) => n.type === ResourceType.Wood)).toHaveLength(1);
    expect(result!.filter((n) => n.type === ResourceType.Gold)).toHaveLength(1);
  });

  it('uses active sprite when positioned on a resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).not.toBeNull();

    const goldNode = result![0];
    expect(goldNode.spriteSrc).toBe(RESOURCE_SPRITES[ResourceType.Gold].activeSprite);
  });

  it('shows idle sprite when not positioned on a resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).not.toBeNull();

    const goldNode = result![0];
    expect(goldNode.spriteSrc).toBe(RESOURCE_SPRITES[ResourceType.Gold].sprite);
  });

  it('includes farming collector for positioned resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).not.toBeNull();

    const goldNode = result![0];
    expect(goldNode.farmingCollector).not.toBeNull();
    expect(goldNode.farmingCollector!.color).toBe(PlayerColor.Blue);
    expect(goldNode.farmingCollector!.sprite).toBe(FARM_SPRITES[PlayerColor.Blue]);
  });

  it('excludes farming collector when not positioned', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    const goldNode = result![0];
    expect(goldNode.farmingCollector).toBeNull();
  });

  it('applies active sprite to ALL nodes of a dual resource when positioned', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 2 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result!.length).toBe(2);
    expect(result!.every((n) => n.spriteSrc === RESOURCE_SPRITES[ResourceType.Gold].activeSprite)).toBe(true);
  });

  it('adds farming collector to ALL nodes when positioned on dual resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 2 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result!.length).toBe(2);
    expect(result!.every((n) => n.farmingCollector !== null)).toBe(true);
  });

  it('generates unique keys for each node', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [
        { type: ResourceType.Food, amount: 2 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    const keys = result!.map((n) => n.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('includes slot styling information', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    const node = result![0];
    expect(node.slotStyle).toBeDefined();
    expect(typeof node.slotStyle).toBe('object');
  });

  it('applies 1.45x size scaling for Food resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    const foodNode = result![0];
    // Single slot is 39%; Food scale 1.45 gives 39 * 1.45 = 56.55, rounded to one decimal = 56.6
    expect(foodNode.nodeSize).toBe('56.6%');
  });

  it('does not scale Wood and Gold resources', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [
        { type: ResourceType.Wood, amount: 1 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    const woodNode = result![0];
    const goldNode = result![1];
    // With 2 resources total, they use DUAL_RESOURCE_SLOTS with size 32%
    expect(woodNode.nodeSize).toBe('32%');
    expect(goldNode.nodeSize).toBe('32%');
  });

  it('does not mutate input island', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      positionedBy: [],
    };

    const originalIsland = JSON.parse(JSON.stringify(island));

    toTileResourcesViewModel(island, false, mockPlayers);

    expect(island).toEqual(originalIsland);
  });

  it('handles missing positionedBy array gracefully', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
    };

    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result).not.toBeNull();
    expect(result![0].farmingCollector).toBeNull();
  });
});

describe('toTileResourcesViewModel band and Base slot positions', () => {
  it('places a single resource node centered in the middle band', () => {
    const result = toTileResourcesViewModel(resourceIslandWithFood, false, mockPlayers);
    expect(result![0].slotStyle).toEqual({ top: '65.5%', left: '50%' });
  });

  it('places a two-node island at distinct centers, not both in the top band', () => {
    const result = toTileResourcesViewModel(resourceIslandWithTwoDistinctResources, false, mockPlayers);
    expect(result).toHaveLength(2);
    expect(result![0].type).toBe(ResourceType.Gold);
    expect(result![0].slotStyle).toEqual({ top: '36%', left: '40%' });
    expect(result![1].type).toBe(ResourceType.Wood);
    expect(result![1].slotStyle).toEqual({ top: '86%', left: '60%' });
  });

  it('places a three-node island at three distinct centers', () => {
    const result = toTileResourcesViewModel(resourceIslandWithDualResources, false, mockPlayers);
    expect(result).toHaveLength(3);
    expect(result!.map((n) => n.slotStyle)).toEqual([
      { top: '33.5%', left: '37.5%' },
      { top: '59.5%', left: '74.5%' },
      { top: '83.5%', left: '25.5%' },
    ]);
  });

  it('never puts width or height in slotStyle, on dual-resource or Base islands', () => {
    const dual = toTileResourcesViewModel(resourceIslandWithDualResources, false, mockPlayers);
    const base = toTileResourcesViewModel(baseIslandWithResources, true, mockPlayers);
    [...dual!, ...base!].forEach((node) => {
      expect(node.slotStyle).not.toHaveProperty('width');
      expect(node.slotStyle).not.toHaveProperty('height');
    });
  });

  it('gives each Base node its resource slot center, with no explicit width or height', () => {
    const result = toTileResourcesViewModel(baseIslandWithResources, true, mockPlayers);
    expect(result!.map((n) => n.slotStyle)).toEqual([
      { top: '15%', left: '50%' },
      { top: '85%', left: '35%' },
    ]);
  });

  it('gives a three-resource Base fixture one node per base slot, in slot order', () => {
    const result = toTileResourcesViewModel(baseIslandWithThreeResources, true, mockPlayers);
    expect(result!.map((n) => n.type)).toEqual([ResourceType.Food, ResourceType.Wood, ResourceType.Gold]);
    expect(result!.map((n) => n.slotStyle)).toEqual([
      { top: '15%', left: '50%' },
      { top: '85%', left: '35%' },
      { top: '85%', left: '65%' },
    ]);
  });

  it('gives Base Wood and Gold nodes 22% and the Food node 31.9%', () => {
    const result = toTileResourcesViewModel(baseIslandWithThreeResources, true, mockPlayers);
    const sizeByType = Object.fromEntries(result!.map((n) => [n.type, n.nodeSize]));
    expect(sizeByType).toEqual({
      [ResourceType.Food]: '31.9%',
      [ResourceType.Wood]: '22%',
      [ResourceType.Gold]: '22%',
    });
  });
});

describe('toTileResourcesViewModel percent sizing by slot tier', () => {
  // Expected values are literal, copied from the approved spec: the Food scale (1.45) and the
  // one-decimal rounding are pinned here, not derived from the slot table under test.
  const islandWith = (type: ResourceType, amount: number, isBase: boolean): Island => ({
    id: '1-1',
    x: 1,
    y: 1,
    type: isBase ? IslandType.Base : IslandType.Resource,
    resources: [{ type, amount }],
    occupants: [],
    positionedBy: [],
  });

  it.each([
    [ResourceType.Food, 1, false, '56.6%'],
    [ResourceType.Food, 2, false, '46.4%'],
    [ResourceType.Food, 3, false, '39.2%'],
    [ResourceType.Food, 1, true, '31.9%'],
    [ResourceType.Wood, 1, false, '39%'],
    [ResourceType.Wood, 2, false, '32%'],
    [ResourceType.Wood, 3, false, '27%'],
    [ResourceType.Wood, 1, true, '22%'],
    [ResourceType.Gold, 1, false, '39%'],
    [ResourceType.Gold, 2, false, '32%'],
    [ResourceType.Gold, 3, false, '27%'],
    [ResourceType.Gold, 1, true, '22%'],
  ])('sizes a %s node in the tier of amount %i (base: %s) as %s', (type, amount, isBase, expected) => {
    const result = toTileResourcesViewModel(islandWith(type, amount, isBase), isBase, mockPlayers);
    expect(result![0].nodeSize).toBe(expected);
  });

  it.each([
    [ResourceType.Food, 1, false, '44.8%'],
    [ResourceType.Food, 2, false, '44.8%'],
    [ResourceType.Food, 3, false, '44.8%'],
    [ResourceType.Food, 1, true, '44.8%'],
    [ResourceType.Wood, 1, false, '65%'],
    [ResourceType.Wood, 2, false, '65%'],
    [ResourceType.Wood, 3, false, '65%'],
    [ResourceType.Wood, 1, true, '65%'],
    [ResourceType.Gold, 1, false, '65%'],
    [ResourceType.Gold, 2, false, '65%'],
    [ResourceType.Gold, 3, false, '65%'],
    [ResourceType.Gold, 1, true, '65%'],
  ])('sizes a farmed %s badge in the tier of amount %i (base: %s) as %s', (type, amount, isBase, expected) => {
    const island: Island = { ...islandWith(type, amount, isBase), positionedBy: [{ playerId: 0, resource: type }] };
    const result = toTileResourcesViewModel(island, isBase, mockPlayers);
    expect(result![0].farmingCollector?.size).toBe(expected);
  });

  it('never returns a px string or a bare number for nodeSize or badge size', () => {
    const island: Island = { ...islandWith(ResourceType.Food, 1, false), positionedBy: [{ playerId: 0, resource: ResourceType.Food }] };
    const node = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(node.nodeSize).toMatch(/^\d+(\.\d)?%$/);
    expect(node.farmingCollector!.size).toMatch(/^\d+(\.\d)?%$/);
  });
});

describe('toTileResourcesViewModel farming collector badge', () => {
  it('sizes a Food badge at 44.8% of its node, with no offset', () => {
    const island: Island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };
    const node = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(node.nodeSize).toBe('56.6%');
    expect(node.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: '44.8%',
    });
    expect(node.farmingCollector).not.toHaveProperty('offset');
  });

  it('sizes a dual-slot Gold badge at 65% with no px floor, for the top slot', () => {
    const island: Island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };
    const goldNode = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(goldNode.type).toBe(ResourceType.Gold);
    expect(goldNode.nodeSize).toBe('32%');
    expect(goldNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: '65%',
    });
  });

  it('sizes a dual-slot Wood badge at 65% for the right-anchored bottom slot', () => {
    const island: Island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const woodNode = toTileResourcesViewModel(island, false, mockPlayers)![1];
    expect(woodNode.type).toBe(ResourceType.Wood);
    expect(woodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: '65%',
    });
  });

  it('sizes a triple-slot Wood badge at 65% for the left-anchored bottom slot', () => {
    const island: Island = {
      ...resourceIslandWithDualResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const woodNode = toTileResourcesViewModel(island, false, mockPlayers)![2];
    expect(woodNode.nodeSize).toBe('27%');
    expect(woodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: '65%',
    });
  });

  it('sizes the Base Food badge at 44.8% beside its 31.9% node', () => {
    const island: Island = {
      ...baseIslandWithResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };
    const foodNode = toTileResourcesViewModel(island, true, mockPlayers)![0];
    expect(foodNode.type).toBe(ResourceType.Food);
    expect(foodNode.nodeSize).toBe('31.9%');
    expect(foodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: '44.8%',
    });
  });

  it('sizes the Base Wood badge at 65% beside its 22% node', () => {
    const island: Island = {
      ...baseIslandWithThreeResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const woodNode = toTileResourcesViewModel(island, true, mockPlayers)![1];
    expect(woodNode.type).toBe(ResourceType.Wood);
    expect(woodNode.nodeSize).toBe('22%');
    expect(woodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: '65%',
    });
  });

  it('omits a side field from every farmed badge, since the badge is always on the left edge', () => {
    const island: Island = {
      ...resourceIslandWithDualResources,
      positionedBy: [
        { playerId: 0, resource: ResourceType.Gold },
        { playerId: 0, resource: ResourceType.Wood },
      ],
    };
    const badges = toTileResourcesViewModel(island, false, mockPlayers)!.map((n) => n.farmingCollector);
    expect(badges).toHaveLength(3);
    badges.forEach((badge) => {
      expect(badge).not.toBeNull();
      expect(badge).not.toHaveProperty('side');
    });
  });

  it('uses the owning player color for the badge sprite', () => {
    const island: Island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 1, resource: ResourceType.Food }],
    };
    const node = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(node.farmingCollector?.color).toBe(PlayerColor.Red);
    expect(node.farmingCollector?.sprite).toBe(FARM_SPRITES[PlayerColor.Red]);
  });

  it('shows no badge and the idle sprite when positionedBy names a player not in the list', () => {
    const island: Island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 99, resource: ResourceType.Food }],
    };
    const node = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(node.farmingCollector).toBeNull();
    expect(node.spriteSrc).toBe(RESOURCE_SPRITES[ResourceType.Food].sprite);
  });

  it('shows no badge on an unpositioned node even when a sibling node is positioned', () => {
    const island: Island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const result = toTileResourcesViewModel(island, false, mockPlayers);
    expect(result![0].farmingCollector).toBeNull();
    expect(result![1].farmingCollector).not.toBeNull();
  });
});
