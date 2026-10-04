import { toTileResourcesViewModel, RESOURCE_SPRITES, FARM_SPRITES } from './TileResources.map';
import { IslandType, ResourceType, PlayerColor, type Island, type Player } from '@/lib/types';

describe('toTileResourcesViewModel', () => {
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
    expect(foodNode.nodeSize).toBe(Math.round(46 * 1.45));
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
