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
    // For single resource, slot size is 46, so with 1.45x scaling: Math.round(46 * 1.45) = 67
    expect(foodNode.nodeSize).toBe(67);
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
    // With 2 resources total, they use DUAL_RESOURCE_SLOTS with size 38
    expect(woodNode.nodeSize).toBe(38);
    expect(goldNode.nodeSize).toBe(38);
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
  it('places a single resource node in the middle band (top 46%)', () => {
    const result = toTileResourcesViewModel(resourceIslandWithFood, false, mockPlayers);
    expect(result![0].slotStyle).toEqual({ top: '46%', left: '50%', transform: 'translateX(-50%)' });
  });

  it('places a two-node island at top 20% and top 70%, not both in the top band', () => {
    const result = toTileResourcesViewModel(resourceIslandWithTwoDistinctResources, false, mockPlayers);
    expect(result).toHaveLength(2);
    expect(result![0].type).toBe(ResourceType.Gold);
    expect(result![0].slotStyle).toEqual({ top: '20%', left: '14%' });
    expect(result![1].type).toBe(ResourceType.Wood);
    expect(result![1].slotStyle).toEqual({ top: '70%', right: '14%' });
  });

  it('places a three-node island at top 20%, 46%, 70% with alternating left/right/left', () => {
    const result = toTileResourcesViewModel(resourceIslandWithDualResources, false, mockPlayers);
    expect(result).toHaveLength(3);
    expect(result!.map((n) => n.slotStyle)).toEqual([
      { top: '20%', left: '12%' },
      { top: '46%', right: '12%' },
      { top: '70%', left: '12%' },
    ]);
  });

  it('never sets width or height on non-Base slots', () => {
    const result = toTileResourcesViewModel(resourceIslandWithDualResources, false, mockPlayers);
    result!.forEach((node) => {
      expect(node.slotStyle.width).toBeUndefined();
      expect(node.slotStyle.height).toBeUndefined();
    });
  });

  it('gives each Base node its edge-midpoint slot with a 22% width and height', () => {
    const result = toTileResourcesViewModel(baseIslandWithResources, true, mockPlayers);
    expect(result!.map((n) => n.slotStyle)).toEqual([
      { top: '4%', left: '50%', transform: 'translateX(-50%)', width: '22%', height: '22%' },
      { bottom: '4%', left: '35%', transform: 'translateX(-50%)', width: '22%', height: '22%' },
    ]);
  });

  it('gives a three-resource Base fixture one node per base slot, in slot order', () => {
    const result = toTileResourcesViewModel(baseIslandWithThreeResources, true, mockPlayers);
    expect(result!.map((n) => n.type)).toEqual([ResourceType.Food, ResourceType.Wood, ResourceType.Gold]);
    expect(result!.map((n) => n.slotStyle)).toEqual([
      { top: '4%', left: '50%', transform: 'translateX(-50%)', width: '22%', height: '22%' },
      { bottom: '4%', left: '35%', transform: 'translateX(-50%)', width: '22%', height: '22%' },
      { bottom: '4%', left: '65%', transform: 'translateX(-50%)', width: '22%', height: '22%' },
    ]);
  });

  it('keeps the uninflated 26px size for Wood and Gold Base nodes, and 38px for Food', () => {
    const result = toTileResourcesViewModel(baseIslandWithThreeResources, true, mockPlayers);
    const sizeByType = Object.fromEntries(result!.map((n) => [n.type, n.nodeSize]));
    expect(sizeByType).toEqual({
      [ResourceType.Food]: 38,
      [ResourceType.Wood]: 26,
      [ResourceType.Gold]: 26,
    });
  });
});

describe('toTileResourcesViewModel farming collector badge', () => {
  it('sizes a Food badge from the uninflated 46px slot: size 25, right side, offset -2', () => {
    const island: Island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };
    const node = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(node.nodeSize).toBe(67);
    expect(node.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: 25,
      side: 'right',
      offset: -2,
    });
  });

  it('floors a dual-slot badge at 22px and offsets it -11px on the right side for the top slot', () => {
    const island: Island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };
    const goldNode = toTileResourcesViewModel(island, false, mockPlayers)![0];
    expect(goldNode.type).toBe(ResourceType.Gold);
    expect(goldNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: 22,
      side: 'right',
      offset: -11,
    });
  });

  it('flips the badge to the left side for a right-anchored bottom slot', () => {
    const island: Island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const woodNode = toTileResourcesViewModel(island, false, mockPlayers)![1];
    expect(woodNode.type).toBe(ResourceType.Wood);
    expect(woodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: 22,
      side: 'left',
      offset: -11,
    });
  });

  it('floors a triple-slot badge at 22px for the bottom slot (left anchored, right side)', () => {
    const island: Island = {
      ...resourceIslandWithDualResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const woodNode = toTileResourcesViewModel(island, false, mockPlayers)![2];
    expect(woodNode.nodeSize).toBe(32);
    expect(woodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: 22,
      side: 'right',
      offset: -11,
    });
  });

  it('places the Base Food badge beside the 38px node: size 22, right side, offset -5', () => {
    const island: Island = {
      ...baseIslandWithResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };
    const foodNode = toTileResourcesViewModel(island, true, mockPlayers)![0];
    expect(foodNode.type).toBe(ResourceType.Food);
    expect(foodNode.nodeSize).toBe(38);
    expect(foodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: 22,
      side: 'right',
      offset: -5,
    });
  });

  it('places the Base Wood badge beside the 26px node: size 22, right side, offset -11', () => {
    const island: Island = {
      ...baseIslandWithThreeResources,
      positionedBy: [{ playerId: 0, resource: ResourceType.Wood }],
    };
    const woodNode = toTileResourcesViewModel(island, true, mockPlayers)![1];
    expect(woodNode.type).toBe(ResourceType.Wood);
    expect(woodNode.nodeSize).toBe(26);
    expect(woodNode.farmingCollector).toEqual({
      color: PlayerColor.Blue,
      sprite: FARM_SPRITES[PlayerColor.Blue],
      size: 22,
      side: 'right',
      offset: -11,
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
