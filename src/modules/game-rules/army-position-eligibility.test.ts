import type { Island, Player } from '@/lib/types';
import { IslandType, MonsterName, ResourceType } from '@/lib/types';
import { findAvailableResourceSpot, isArmyEligibleToPosition } from './army-position-eligibility';

const ARMY_ID = 0;

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 0,
    playerId: 'p0',
    positions: [],
    ...overrides,
  } as Player;
}

function buildResourceTile(overrides: Partial<Island> = {}): Island {
  return {
    id: '1-1',
    x: 1,
    y: 1,
    type: IslandType.Resource,
    resources: [{ type: ResourceType.Food, amount: 1 }],
    occupants: [],
    ...overrides,
  } as Island;
}

describe('isArmyEligibleToPosition', () => {
  it('is true for an open Resource tile with no monster', () => {
    const tile = buildResourceTile();
    const player = buildPlayer();

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(true);
  });

  it('is true for a Base tile with an open spot', () => {
    const tile = buildResourceTile({ type: IslandType.Base, owner: 0 });
    const player = buildPlayer();

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(true);
  });

  it('is false when the army is already positioned (on this tile or elsewhere)', () => {
    const tile = buildResourceTile();
    const player = buildPlayer({ positions: [{ x: 5, y: 5, resource: ResourceType.Gold, armyId: ARMY_ID }] });

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(false);
  });

  it('is false when a monster is present on the tile', () => {
    const tile = buildResourceTile({
      monsters: [{ name: MonsterName.Bear, level: 1, sprite: { idle: '', attack: '', death: '' } }],
    });
    const player = buildPlayer();

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(false);
  });

  it('is false when every resource spot on the tile is already occupied', () => {
    const tile = buildResourceTile({
      positionedBy: [{ playerId: 1, resource: ResourceType.Food }],
    });
    const player = buildPlayer();

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(false);
  });

  it('is false for a non-positionable tile type (Empty)', () => {
    const tile = buildResourceTile({ type: IslandType.Empty, resources: [] });
    const player = buildPlayer();

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(false);
  });

  it('is false for a Resource tile with no resources at all (boundary)', () => {
    const tile = buildResourceTile({ resources: [] });
    const player = buildPlayer();

    expect(isArmyEligibleToPosition(tile, player, ARMY_ID)).toBe(false);
  });
});

describe('findAvailableResourceSpot', () => {
  it('returns the first resource spot with no positionedBy entry', () => {
    const tile = buildResourceTile({
      resources: [
        { type: ResourceType.Food, amount: 1 },
        { type: ResourceType.Wood, amount: 2 },
      ],
      positionedBy: [{ playerId: 1, resource: ResourceType.Food }],
    });

    expect(findAvailableResourceSpot(tile)?.type).toBe(ResourceType.Wood);
  });

  it('returns undefined when every spot is occupied', () => {
    const tile = buildResourceTile({
      resources: [{ type: ResourceType.Food, amount: 1 }],
      positionedBy: [{ playerId: 1, resource: ResourceType.Food }],
    });

    expect(findAvailableResourceSpot(tile)).toBeUndefined();
  });

  it('returns undefined when the tile has no resources at all (empty input)', () => {
    const tile = buildResourceTile({ resources: [] });

    expect(findAvailableResourceSpot(tile)).toBeUndefined();
  });

  it('treats a missing positionedBy as fully open (no positionedBy field)', () => {
    const tile = buildResourceTile({ positionedBy: undefined });

    expect(findAvailableResourceSpot(tile)?.type).toBe(ResourceType.Food);
  });
});
