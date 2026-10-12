import type { GameState, Island, Player, StructuredLogEntry } from '@/lib/types';
import { IslandType, ResourceType } from '@/lib/types';
import {
  countIdleFarmArmies,
  findNewCollectionEntries,
  toCollectionToastContent,
  toIdleFarmToastContent,
} from './resource-collection-feedback.map';

const COLS = 5;

function buildCollectionEntry(overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
  return {
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'collected stuff',
    playerId: 'p0',
    resourcesCollected: { [ResourceType.Food]: 2 },
    ...overrides,
  };
}

describe('findNewCollectionEntries', () => {
  it('returns entries at/after sinceIndex matching playerId that carry resourcesCollected', () => {
    const log: GameState['log'] = [
      'a plain string entry',
      buildCollectionEntry({ playerId: 'p0' }),
      buildCollectionEntry({ playerId: 'other' }),
      { kind: 'structured', turn: 1, category: 'turn', message: 'no resources here', playerId: 'p0' },
      buildCollectionEntry({ playerId: 'p0', message: 'second p0 collection' }),
    ];

    const result = findNewCollectionEntries(log, 0, 'p0');

    expect(result).toEqual([buildCollectionEntry({ playerId: 'p0' }), buildCollectionEntry({ playerId: 'p0', message: 'second p0 collection' })]);
  });

  it('ignores entries before sinceIndex', () => {
    const log: GameState['log'] = [buildCollectionEntry({ playerId: 'p0', message: 'old' })];

    const result = findNewCollectionEntries(log, 1, 'p0');

    expect(result).toEqual([]);
  });

  it('ignores plain string log entries', () => {
    const log: GameState['log'] = ['just text'];

    expect(findNewCollectionEntries(log, 0, 'p0')).toEqual([]);
  });

  it('ignores entries for other players', () => {
    const log: GameState['log'] = [buildCollectionEntry({ playerId: 'someone-else' })];

    expect(findNewCollectionEntries(log, 0, 'p0')).toEqual([]);
  });

  it('returns an empty array for an empty log (empty input)', () => {
    expect(findNewCollectionEntries([], 0, 'p0')).toEqual([]);
  });
});

describe('toCollectionToastContent', () => {
  it('formats a single resource', () => {
    const entry = buildCollectionEntry({ resourcesCollected: { [ResourceType.Food]: 2 } });

    expect(toCollectionToastContent(entry)).toEqual({
      title: 'Resources collected',
      description: 'Collected 2 Food.',
    });
  });

  it('formats multiple resources, comma-joined, in insertion order', () => {
    const entry = buildCollectionEntry({
      resourcesCollected: { [ResourceType.Food]: 2, [ResourceType.Gold]: 1 },
    });

    expect(toCollectionToastContent(entry)).toEqual({
      title: 'Resources collected',
      description: 'Collected 2 Food, 1 Gold.',
    });
  });

  it('returns null when the entry carries no resourcesCollected (defensive, invalid input)', () => {
    const entry = buildCollectionEntry({ resourcesCollected: undefined });

    expect(toCollectionToastContent(entry)).toBeNull();
  });

  it('returns null when resourcesCollected is an empty object (boundary)', () => {
    const entry = buildCollectionEntry({ resourcesCollected: {} });

    expect(toCollectionToastContent(entry)).toBeNull();
  });
});

function buildTile(x: number, y: number, overrides: Partial<Island> = {}): Island {
  return {
    id: `${x}-${y}`,
    x,
    y,
    type: IslandType.Empty,
    resources: [],
    occupants: [],
    ...overrides,
  };
}

function buildState(map: Island[]): GameState {
  return { map, settings: { gridSize: { rows: 2, cols: COLS } } } as unknown as GameState;
}

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return { id: 0, positions: [], armies: [], ...overrides } as Player;
}

describe('countIdleFarmArmies', () => {
  it('counts 0 for an army mid-position (already positioned)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, { type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }] });
    const player = buildPlayer({
      armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }],
      positions: [{ x: 1, y: 1, resource: ResourceType.Food, armyId: 0 }],
    });

    expect(countIdleFarmArmies(buildState(map), player)).toBe(0);
  });

  it('counts 1 for an eligible, unpositioned army on an open Resource tile', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, { type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }] });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });

    expect(countIdleFarmArmies(buildState(map), player)).toBe(1);
  });

  it('counts 0 for an army on a monster-occupied tile', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, {
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      monsters: [{ name: 'Bear', level: 1, sprite: { idle: '', attack: '', death: '' } } as never],
    });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });

    expect(countIdleFarmArmies(buildState(map), player)).toBe(0);
  });

  it('counts 0 for an army on a tile where every spot is already occupied', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, {
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      positionedBy: [{ playerId: 9, resource: ResourceType.Food }],
    });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });

    expect(countIdleFarmArmies(buildState(map), player)).toBe(0);
  });

  it('counts each eligible army across multiple armies', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, { type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }] });
    map[1 * COLS + 2] = buildTile(2, 1, { type: IslandType.Resource, resources: [{ type: ResourceType.Gold, amount: 1 }] });
    const player = buildPlayer({
      armies: [
        { id: 0, position: { x: 1, y: 1 }, hasActed: false },
        { id: 1, position: { x: 2, y: 1 }, hasActed: false },
      ],
    });

    expect(countIdleFarmArmies(buildState(map), player)).toBe(2);
  });

  it('returns 0 for a player with no armies (empty input)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    const player = buildPlayer({ armies: [] });

    expect(countIdleFarmArmies(buildState(map), player)).toBe(0);
  });
});

describe('toIdleFarmToastContent', () => {
  it('returns null at count 0 (boundary)', () => {
    expect(toIdleFarmToastContent(0)).toBeNull();
  });

  it('uses singular copy for exactly 1 idle army', () => {
    expect(toIdleFarmToastContent(1)).toEqual({
      title: 'Army idle',
      description: '1 army is idle on a resource spot. Re-position it to keep collecting.',
    });
  });

  it('uses plural copy with the exact count for more than 1', () => {
    expect(toIdleFarmToastContent(3)).toEqual({
      title: 'Armies idle',
      description: '3 armies are idle on resource spots. Re-position them to keep collecting.',
    });
  });
});
