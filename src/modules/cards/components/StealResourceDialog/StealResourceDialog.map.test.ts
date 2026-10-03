import { PlayerColor, ResourceType } from '@/lib/types';
import type { Player } from '@/lib/types';
import { toPlayerOptions, toResourceOptions } from './StealResourceDialog.map';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
    resources: { food: 0, wood: 0, gold: 0 },
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: 6,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    revealedTiles: [],
    ...overrides,
  }) as Player;

describe('toPlayerOptions', () => {
  it('maps players to options with their sprite, name and total resources', () => {
    const players = [
      buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', color: PlayerColor.Red, resources: { food: 3, wood: 2, gold: 5 } }),
      buildPlayer({ id: 1, playerId: 'p1', name: 'Bo', color: PlayerColor.Purple, resources: { food: 0, wood: 4, gold: 0 } }),
    ];

    expect(toPlayerOptions(players, null)).toEqual([
      { id: 0, name: 'Ada', sprite: '/sprites/red.gif', totalResources: 10, isSelected: false },
      { id: 1, name: 'Bo', sprite: '/sprites/purple.gif', totalResources: 4, isSelected: false },
    ]);
  });

  it('marks exactly the selected player id as isSelected', () => {
    const players = [
      buildPlayer({ id: 0, playerId: 'p0', name: 'Ada' }),
      buildPlayer({ id: 1, playerId: 'p1', name: 'Bo' }),
    ];

    const options = toPlayerOptions(players, 1);

    expect(options.find((o) => o.id === 0)?.isSelected).toBe(false);
    expect(options.find((o) => o.id === 1)?.isSelected).toBe(true);
  });

  it('returns an empty array for an empty players list', () => {
    expect(toPlayerOptions([], null)).toEqual([]);
  });

  it('a player with all-zero resources has totalResources 0', () => {
    const players = [buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 0, wood: 0, gold: 0 } })];

    expect(toPlayerOptions(players, null)[0].totalResources).toBe(0);
  });

  it('does not mutate the input players array', () => {
    const players = [
      buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', color: PlayerColor.Red, resources: { food: 3, wood: 2, gold: 5 } }),
    ];
    const playersCopy = [...players];

    toPlayerOptions(players, 0);

    expect(players).toEqual(playersCopy);
  });
});

describe('toResourceOptions', () => {
  it('maps every resource key with sprite, display name, availability and selection', () => {
    const player = buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 0, wood: 2, gold: 5 } });

    const options = toResourceOptions(player, ResourceType.Gold);

    expect(options).toEqual([
      { resource: ResourceType.Food, sprite: '/sprites/sheep.gif', displayName: 'Food', available: 0, isAvailable: false, isSelected: false },
      { resource: ResourceType.Wood, sprite: '/sprites/tree.gif', displayName: 'Wood', available: 2, isAvailable: true, isSelected: false },
      { resource: ResourceType.Gold, sprite: '/sprites/gold.gif', displayName: 'Gold', available: 5, isAvailable: true, isSelected: true },
    ]);
  });

  it('isAvailable is false exactly at the 0 boundary', () => {
    const player = buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 1, wood: 0, gold: 0 } });

    const options = toResourceOptions(player, null);

    expect(options.find((o) => o.resource === ResourceType.Food)?.isAvailable).toBe(true);
    expect(options.find((o) => o.resource === ResourceType.Wood)?.isAvailable).toBe(false);
  });

  it('no resource is selected when selectedResource is null', () => {
    const player = buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 1, wood: 1, gold: 1 } });

    const options = toResourceOptions(player, null);

    expect(options.every((o) => !o.isSelected)).toBe(true);
  });

  it('a selected resource that is unavailable (0 amount) is both isAvailable: false and isSelected: true', () => {
    const player = buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 0, wood: 1, gold: 1 } });

    const options = toResourceOptions(player, ResourceType.Food);
    const food = options.find((o) => o.resource === ResourceType.Food);

    expect(food).toEqual(
      expect.objectContaining({ resource: ResourceType.Food, available: 0, isAvailable: false, isSelected: true }),
    );
  });

  it('does not mutate the input player', () => {
    const player = buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 1, wood: 2, gold: 3 } });
    const playerCopy = { ...player, resources: { ...player.resources } };

    toResourceOptions(player, ResourceType.Gold);

    expect(player).toEqual(playerCopy);
  });
});
