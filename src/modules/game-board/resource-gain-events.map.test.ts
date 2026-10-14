import type { GameState, StructuredLogEntry } from '@/lib/types';
import { ResourceType } from '@/lib/types';
import { findNewResourceGainEvents } from './resource-gain-events.map';

function buildGainEntry(overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
  return {
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'gained stuff',
    playerId: 'p0',
    resourceGain: [{ type: ResourceType.Food, amount: 2, tileIds: ['1-1'] }],
    ...overrides,
  };
}

describe('findNewResourceGainEvents', () => {
  it('returns an empty array for an empty log (empty input)', () => {
    expect(findNewResourceGainEvents([], 0)).toEqual([]);
  });

  it('returns an empty array when sinceIndex equals the log length (boundary: nothing new)', () => {
    const log: GameState['log'] = [buildGainEntry()];

    expect(findNewResourceGainEvents(log, 1)).toEqual([]);
  });

  it('ignores entries before sinceIndex', () => {
    const log: GameState['log'] = [buildGainEntry({ message: 'old' }), buildGainEntry({ playerId: 'p1' })];

    expect(findNewResourceGainEvents(log, 1)).toEqual([{ playerId: 'p1', type: ResourceType.Food, tileIds: ['1-1'] }]);
  });

  it('ignores plain string log entries', () => {
    const log: GameState['log'] = ['just text'];

    expect(findNewResourceGainEvents(log, 0)).toEqual([]);
  });

  it('ignores structured entries that carry no resourceGain (for example, a toast-only collection)', () => {
    const log: GameState['log'] = [
      { kind: 'structured', turn: 1, category: 'economy', message: 'x', playerId: 'p0', resourcesCollected: { [ResourceType.Gold]: 2 } },
    ];

    expect(findNewResourceGainEvents(log, 0)).toEqual([]);
  });

  it('flattens a multi-type resourceGain array into one event per type, all carrying the entry playerId', () => {
    const log: GameState['log'] = [
      buildGainEntry({
        playerId: 'p2',
        resourceGain: [
          { type: ResourceType.Wood, amount: 1, tileIds: ['0-0'] },
          { type: ResourceType.Gold, amount: 1, tileIds: ['0-0'] },
        ],
      }),
    ];

    expect(findNewResourceGainEvents(log, 0)).toEqual([
      { playerId: 'p2', type: ResourceType.Wood, tileIds: ['0-0'] },
      { playerId: 'p2', type: ResourceType.Gold, tileIds: ['0-0'] },
    ]);
  });

  it('defaults a missing tileIds to an empty array (Wealthy/Steal gains have no tile)', () => {
    const log: GameState['log'] = [buildGainEntry({ resourceGain: [{ type: ResourceType.Gold, amount: 5 }] })];

    expect(findNewResourceGainEvents(log, 0)).toEqual([{ playerId: 'p0', type: ResourceType.Gold, tileIds: [] }]);
  });

  it('skips an entry that has resourceGain but no playerId (defensive)', () => {
    const log: GameState['log'] = [buildGainEntry({ playerId: undefined })];

    expect(findNewResourceGainEvents(log, 0)).toEqual([]);
  });

  it('returns events in log order across several entries', () => {
    const log: GameState['log'] = [
      buildGainEntry({ playerId: 'p0', resourceGain: [{ type: ResourceType.Food, amount: 1, tileIds: ['0-0'] }] }),
      buildGainEntry({ playerId: 'p1', resourceGain: [{ type: ResourceType.Wood, amount: 2 }] }),
    ];

    expect(findNewResourceGainEvents(log, 0)).toEqual([
      { playerId: 'p0', type: ResourceType.Food, tileIds: ['0-0'] },
      { playerId: 'p1', type: ResourceType.Wood, tileIds: [] },
    ]);
  });

  it('does not mutate the input log (pure)', () => {
    const log: GameState['log'] = [buildGainEntry()];
    const before = JSON.parse(JSON.stringify(log));

    findNewResourceGainEvents(log, 0);

    expect(log).toEqual(before);
  });
});
