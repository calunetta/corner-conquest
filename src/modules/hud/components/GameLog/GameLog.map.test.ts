import type { LogEntry, Player, StructuredLogEntry } from '@/lib/types';
import {
  filterVisibleEntries,
  toLogEntryViewModels,
  toMessageSegments,
  withTurnDividers,
} from './GameLog.map';
import type { LogEntryViewModel } from './GameLog.types';

const bluePlayer = { playerId: 'p-blue', name: 'Ada', color: 'blue' } as Player;
const redPlayer = { playerId: 'p-red', name: 'Bo', color: 'red' } as Player;
const players: Player[] = [bluePlayer, redPlayer];

function structured(overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
  return {
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'Ada gained 5 Gold from harvesting',
    ...overrides,
  };
}

function viewModel(overrides: Partial<LogEntryViewModel> = {}): LogEntryViewModel {
  return {
    message: 'default message',
    category: null,
    isMilestone: false,
    isPassive: false,
    turn: null,
    ...overrides,
  };
}

describe('toLogEntryViewModels', () => {
  it('returns empty array for empty input', () => {
    expect(toLogEntryViewModels([], players)).toEqual([]);
  });

  it('maps a legacy string entry to turn: null, category: null, no player fields', () => {
    const [result] = toLogEntryViewModels(['Player Red upgraded to 3 attack power'], players);
    expect(result).toEqual({
      message: 'Player Red upgraded to 3 attack power',
      category: null,
      isMilestone: false,
      isPassive: false,
      turn: null,
    });
  });

  it('maps a structured entry with turn: 0 to turn: null (pre-game)', () => {
    const [result] = toLogEntryViewModels([structured({ turn: 0 })], players);
    expect(result.turn).toBeNull();
  });

  it('maps a structured entry with turn: 3 to turn: 3', () => {
    const [result] = toLogEntryViewModels([structured({ turn: 3 })], players);
    expect(result.turn).toBe(3);
  });

  it('resolves playerName/playerColorClass when playerId matches a player in the list', () => {
    const [result] = toLogEntryViewModels([structured({ playerId: 'p-blue' })], players);
    expect(result.playerName).toBe('Ada');
    expect(result.playerColorClass).toBe('text-blue-400');
  });

  it('resolves targetPlayerName/targetPlayerColorClass when targetPlayerId matches', () => {
    const [result] = toLogEntryViewModels(
      [structured({ playerId: 'p-blue', targetPlayerId: 'p-red' })],
      players,
    );
    expect(result.targetPlayerName).toBe('Bo');
    expect(result.targetPlayerColorClass).toBe('text-red-400');
  });

  it('leaves playerName/playerColorClass undefined when playerId has no match, without throwing', () => {
    const entries: LogEntry[] = [structured({ playerId: 'p-unknown' })];
    expect(() => toLogEntryViewModels(entries, players)).not.toThrow();
    const [result] = toLogEntryViewModels(entries, players);
    expect(result.playerName).toBeUndefined();
    expect(result.playerColorClass).toBeUndefined();
  });

  it('reverses the input (newest first)', () => {
    const result = toLogEntryViewModels(['first', 'second', 'third'], players);
    expect(result.map((entry) => entry.message)).toEqual(['third', 'second', 'first']);
  });

  it('does not mutate the input array', () => {
    const input: LogEntry[] = ['a', 'b', 'c'];
    const original = [...input];
    toLogEntryViewModels(input, players);
    expect(input).toEqual(original);
  });

  it('carries isMilestone/isPassive through from the structured entry', () => {
    const [milestone] = toLogEntryViewModels([structured({ isMilestone: true })], players);
    expect(milestone.isMilestone).toBe(true);
    const [passive] = toLogEntryViewModels([structured({ isPassive: true })], players);
    expect(passive.isPassive).toBe(true);
  });
});

describe('filterVisibleEntries', () => {
  it('returns empty array for empty input', () => {
    expect(filterVisibleEntries([], false)).toEqual([]);
  });

  it('hides isPassive: true entries when showRoutineActivity is false', () => {
    const entries = [viewModel({ message: 'passive', isPassive: true })];
    expect(filterVisibleEntries(entries, false)).toEqual([]);
  });

  it('shows isPassive: true entries when showRoutineActivity is true', () => {
    const entries = [viewModel({ message: 'passive', isPassive: true })];
    expect(filterVisibleEntries(entries, true)).toEqual(entries);
  });

  it('always shows isMilestone: true entries regardless of the toggle', () => {
    const entries = [viewModel({ message: 'milestone', isMilestone: true, isPassive: true })];
    expect(filterVisibleEntries(entries, false)).toEqual(entries);
    expect(filterVisibleEntries(entries, true)).toEqual(entries);
  });

  it('always shows non-flagged entries regardless of the toggle', () => {
    const entries = [viewModel({ message: 'normal' })];
    expect(filterVisibleEntries(entries, false)).toEqual(entries);
    expect(filterVisibleEntries(entries, true)).toEqual(entries);
  });
});

describe('withTurnDividers', () => {
  it('returns empty array for empty input', () => {
    expect(withTurnDividers([])).toEqual([]);
  });

  it('inserts one divider on the first of two same-turn entries, none on the second', () => {
    const entries = [viewModel({ message: 'a', turn: 5 }), viewModel({ message: 'b', turn: 5 })];
    const result = withTurnDividers(entries);
    expect(result[0].turnDividerLabel).toBe('Turn 5');
    expect(result[1].turnDividerLabel).toBeNull();
  });

  it('does not duplicate the divider when a turn: null entry sits between two same-turn entries', () => {
    const entries = [
      viewModel({ message: 'a', turn: 5 }),
      viewModel({ message: 'legacy', turn: null }),
      viewModel({ message: 'b', turn: 5 }),
    ];
    const result = withTurnDividers(entries);
    expect(result[0].turnDividerLabel).toBe('Turn 5');
    expect(result[1].turnDividerLabel).toBeNull();
    expect(result[2].turnDividerLabel).toBeNull();
  });

  it('renders a new divider when the turn changes across two different turns', () => {
    const entries = [viewModel({ message: 'a', turn: 1 }), viewModel({ message: 'b', turn: 2 })];
    const result = withTurnDividers(entries);
    expect(result[0].turnDividerLabel).toBe('Turn 1');
    expect(result[1].turnDividerLabel).toBe('Turn 2');
  });

  it('produces zero dividers for an all-turn:null list', () => {
    const entries = [viewModel({ message: 'a', turn: null }), viewModel({ message: 'b', turn: null })];
    const result = withTurnDividers(entries);
    expect(result.map((entry) => entry.turnDividerLabel)).toEqual([null, null]);
  });
});

describe('toMessageSegments', () => {
  it('returns the whole message as one uncolored segment when no player names are set', () => {
    const entry = viewModel({ message: 'Island event: gained 5 Gold' });
    expect(toMessageSegments(entry)).toEqual([{ text: 'Island event: gained 5 Gold', colorClass: null }]);
  });

  it('splits message with only playerName set into segments, with the name segment carrying playerColorClass', () => {
    const entry = viewModel({
      message: 'Ada gained 5 Gold from harvesting',
      playerName: 'Ada',
      playerColorClass: 'text-blue-400',
    });
    expect(toMessageSegments(entry)).toEqual([
      { text: 'Ada', colorClass: 'text-blue-400' },
      { text: ' gained 5 Gold from harvesting', colorClass: null },
    ]);
  });

  it('colors both playerName and targetPlayerName distinctly within the same message', () => {
    const entry = viewModel({
      message: 'Ada defeated Bo in battle!',
      playerName: 'Ada',
      playerColorClass: 'text-blue-400',
      targetPlayerName: 'Bo',
      targetPlayerColorClass: 'text-red-400',
    });
    expect(toMessageSegments(entry)).toEqual([
      { text: 'Ada', colorClass: 'text-blue-400' },
      { text: ' defeated ', colorClass: null },
      { text: 'Bo', colorClass: 'text-red-400' },
      { text: ' in battle!', colorClass: null },
    ]);
  });

  it('treats a name not present in the message as absent, without throwing', () => {
    const entry = viewModel({
      message: 'Island event: gained 5 Gold',
      playerName: 'Ada',
      playerColorClass: 'text-blue-400',
    });
    expect(() => toMessageSegments(entry)).not.toThrow();
    expect(toMessageSegments(entry)).toEqual([{ text: 'Island event: gained 5 Gold', colorClass: null }]);
  });
});
