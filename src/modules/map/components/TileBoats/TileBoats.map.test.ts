import { toTileBoatsViewModel, COLLECTOR_IDLE_SPRITES } from './TileBoats.map';
import { IslandType, ResourceType, type Island, PlayerColor } from '@/lib/types';
import { bluePlayer, redPlayer } from './TileBoats.fixtures';

describe('toTileBoatsViewModel', () => {
  const mockPlayers = [bluePlayer, redPlayer];

  it('docks owner boat on base tile with idle collector', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].color).toBe(PlayerColor.Blue);
    expect(result![0].showIdleCollector).toBe(true);
  });

  it('renders 2 boats for 2 occupants on contested tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    const colors = result!.map((b) => b.color);
    expect(colors).toContain(PlayerColor.Blue);
    expect(colors).toContain(PlayerColor.Red);
  });

  it('hides idle collector when army is positioned on a resource', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    expect(result![0].showIdleCollector).toBe(false);
  });

  it('returns null for empty tile with no occupants and no base owner', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result).toBeNull();
  });

  it('returns boats regardless of fog of war when debugMode is true', () => {
    const islandNotRevealed: Island = {
      id: '3-3',
      x: 3,
      y: 3,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const result = toTileBoatsViewModel(islandNotRevealed, mockPlayers, mockPlayers[0], true, true);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
  });

  it('always returns boats for Base islands regardless of fog of war', () => {
    const baseIsland: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    // Even with fogOfWar and not in revealedTiles
    const localPlayerNoReveal = { ...bluePlayer, revealedTiles: [] };

    const result = toTileBoatsViewModel(baseIsland, mockPlayers, localPlayerNoReveal, false, true);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
  });

  it('returns null for non-base tile with fog of war and not personally revealed', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const localPlayerNoReveal = { ...bluePlayer, revealedTiles: [] };

    const result = toTileBoatsViewModel(island, mockPlayers, localPlayerNoReveal, false, true);

    expect(result).toBeNull();
  });

  it('returns boats for non-base tile with fog of war when personally revealed', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const localPlayerWithReveal = { ...bluePlayer, revealedTiles: ['1-1'] };

    const result = toTileBoatsViewModel(island, mockPlayers, localPlayerWithReveal, false, true);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
  });

  it('returns boats when fog of war is false and any player has revealed', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    // localPlayer has not revealed, but another player has
    const localPlayerNoReveal = { ...bluePlayer, revealedTiles: [] };
    const otherPlayerWithReveal = { ...redPlayer, revealedTiles: ['1-1'] };

    const result = toTileBoatsViewModel(island, [localPlayerNoReveal, otherPlayerWithReveal], localPlayerNoReveal, false, false);

    expect(result).not.toBeNull();
  });

  it('returns null for non-base tile with fog of war when no player has revealed', () => {
    const island: Island = {
      id: '3-3',
      x: 3,
      y: 3,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const playersNoReveal = [
      { ...bluePlayer, revealedTiles: [] },
      { ...redPlayer, revealedTiles: [] },
    ];

    const result = toTileBoatsViewModel(island, playersNoReveal, playersNoReveal[0], false, true);

    expect(result).toBeNull();
  });

  it('assigns corners correctly for base tile by owner id', () => {
    const baseIsland: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const result = toTileBoatsViewModel(baseIsland, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    // Entry at index 0 should be assigned to corner 0 via entryIndex % BOAT_CORNER_POSITIONS.length
    expect(result![0].cornerStyle).toBeDefined();
  });

  it('assigns corners by entryIndex for non-base tiles', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    // Should have 2 different corner assignments
    expect(result![0].cornerStyle).not.toEqual(result![1].cornerStyle);
  });

  it('provides idle collector sprite matching player color', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result![0].idleCollectorSprite).toBe(COLLECTOR_IDLE_SPRITES[PlayerColor.Blue]);
  });

  it('handles missing positionedBy gracefully', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    expect(result![0].showIdleCollector).toBe(true);
  });

  it('does not mutate input island', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [],
    };

    const originalIsland = JSON.parse(JSON.stringify(island));

    toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    expect(island).toEqual(originalIsland);
  });

  it('returns null when localPlayer is null and fog of war is enabled', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, null, false, true);

    expect(result).toBeNull();
  });

  it('generates unique boat keys', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const result = toTileBoatsViewModel(island, mockPlayers, mockPlayers[0], false, false);

    const keys = result!.map((b) => b.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('assigns distinct corners to 2+ occupants on a base tile', () => {
    const baseIsland: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const result = toTileBoatsViewModel(baseIsland, mockPlayers, mockPlayers[0], false, false);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    // Each boat should have a defined cornerStyle
    expect(result![0].cornerStyle).toBeDefined();
    expect(result![1].cornerStyle).toBeDefined();
    // The two boats should have different corner assignments
    expect(result![0].cornerStyle).not.toEqual(result![1].cornerStyle);
  });
});
