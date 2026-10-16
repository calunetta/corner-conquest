import type { LogEntry, Player } from '@/lib/types';
import { filterVisibleEntries, toLogEntryViewModels, toMessageSegments, withTurnDividers } from './GameLog.map';
import type { GameLogViewModel } from './GameLog.types';

const noop = () => {};

const bluePlayer = { playerId: 'p-blue', name: 'Ada', color: 'blue' } as Player;
const redPlayer = { playerId: 'p-red', name: 'Bo', color: 'red' } as Player;
const players: Player[] = [bluePlayer, redPlayer];

/** Composes the same pipeline `useGameLog` runs, so fixtures stay in sync with real behavior. */
function toFixture(logs: LogEntry[], showRoutineActivity: boolean): GameLogViewModel {
  const raw = toLogEntryViewModels(logs, players);
  const visible = filterVisibleEntries(raw, showRoutineActivity);
  const divided = withTurnDividers(visible);

  return {
    entries: divided.map((entry) => ({ ...entry, segments: toMessageSegments(entry) })),
    showRoutineActivity,
    onToggleShowRoutineActivity: noop,
  };
}

export const emptyLog: GameLogViewModel = toFixture([], false);

export const legacyOnlyLog: GameLogViewModel = toFixture(
  [
    'Player Red upgraded to 3 attack power',
    'Player Blue deployed a new army',
    'Player Red gained 5 Food from harvesting',
  ],
  false,
);

const mixedTwoTurnsLogs: LogEntry[] = [
  'Pre-game: Ada joined the match',
  { kind: 'structured', turn: 1, category: 'cards', message: 'Ada bought a card', playerId: 'p-blue' },
  {
    kind: 'structured',
    turn: 1,
    category: 'combat',
    message: 'Ada defeated Bo in battle!',
    playerId: 'p-blue',
    targetPlayerId: 'p-red',
  },
  { kind: 'structured', turn: 2, category: 'economy', message: 'Bo gained 5 Gold from harvesting', playerId: 'p-red' },
];

export const mixedTwoTurnsLog: GameLogViewModel = toFixture(mixedTwoTurnsLogs, false);

// Long enough to overflow the mobile sheet's h-[75vh] wrapper, so the sheet variant's scrolling is visible.
const longSessionLogs: LogEntry[] = [
  'Pre-game: Ada joined the match',
  'Pre-game: Bo joined the match',
  { kind: 'structured', turn: 1, category: 'cards', message: 'Ada bought a card', playerId: 'p-blue' },
  { kind: 'structured', turn: 1, category: 'economy', message: 'Bo gained 5 Gold from harvesting', playerId: 'p-red' },
  { kind: 'structured', turn: 1, category: 'cards', message: 'Bo bought a card', playerId: 'p-red' },
  { kind: 'structured', turn: 2, category: 'economy', message: 'Ada gained 4 Food from harvesting', playerId: 'p-blue' },
  { kind: 'structured', turn: 2, category: 'combat', message: 'Ada deployed an army to the north island', playerId: 'p-blue' },
  { kind: 'structured', turn: 2, category: 'cards', message: 'Bo played Forced March', playerId: 'p-red' },
  { kind: 'structured', turn: 3, category: 'combat', message: 'Bo attacked Ada at the coast', playerId: 'p-red', targetPlayerId: 'p-blue' },
  { kind: 'structured', turn: 3, category: 'combat', message: 'Ada held the coast', playerId: 'p-blue', targetPlayerId: 'p-red' },
  { kind: 'structured', turn: 3, category: 'economy', message: 'Ada gained 6 Gold from harvesting', playerId: 'p-blue' },
  { kind: 'structured', turn: 4, category: 'economy', message: 'Bo gained 3 Food from harvesting', playerId: 'p-red' },
  { kind: 'structured', turn: 4, category: 'cards', message: 'Ada bought a card', playerId: 'p-blue' },
  { kind: 'structured', turn: 4, category: 'combat', message: 'Bo raided Ada’s forest camp', playerId: 'p-red', targetPlayerId: 'p-blue' },
  { kind: 'structured', turn: 5, category: 'system', message: 'Bo upgraded to 3 attack power', playerId: 'p-red' },
  { kind: 'structured', turn: 5, category: 'combat', message: 'Ada defeated Bo in battle!', playerId: 'p-blue', targetPlayerId: 'p-red' },
  { kind: 'structured', turn: 5, category: 'economy', message: 'Ada gained 5 Gold from harvesting', playerId: 'p-blue' },
  { kind: 'structured', turn: 6, category: 'cards', message: 'Bo bought a card', playerId: 'p-red' },
  { kind: 'structured', turn: 6, category: 'economy', message: 'Bo gained 4 Food from harvesting', playerId: 'p-red' },
  { kind: 'structured', turn: 6, category: 'combat', message: 'Bo deployed an army to the south island', playerId: 'p-red' },
];

export const longSessionLog: GameLogViewModel = toFixture(longSessionLogs, false);

const withMilestoneLogs: LogEntry[] = [
  { kind: 'structured', turn: 1, category: 'economy', message: 'Ada collected resources', playerId: 'p-blue', isPassive: true },
  {
    kind: 'structured',
    turn: 1,
    category: 'combat',
    message: 'Ada won the game!',
    playerId: 'p-blue',
    isMilestone: true,
  },
];

export const withMilestoneLog: GameLogViewModel = toFixture(withMilestoneLogs, false);

const declutterLogs: LogEntry[] = [
  { kind: 'structured', turn: 1, category: 'economy', message: 'Ada collected resources', playerId: 'p-blue', isPassive: true },
  { kind: 'structured', turn: 1, category: 'cards', message: 'Bo bought a card', playerId: 'p-red' },
];

export const declutterOffLog: GameLogViewModel = toFixture(declutterLogs, false);
export const declutterOnLog: GameLogViewModel = toFixture(declutterLogs, true);

const preGameLogs: LogEntry[] = [
  { kind: 'structured', turn: 0, category: 'system', message: 'Ada joined the match', playerId: 'p-blue' },
  { kind: 'structured', turn: 0, category: 'system', message: 'Bo joined the match', playerId: 'p-red' },
];

export const preGameLog: GameLogViewModel = toFixture(preGameLogs, false);
