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
