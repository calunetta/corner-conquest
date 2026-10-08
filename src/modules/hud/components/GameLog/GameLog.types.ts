import type { LogCategory } from '@/lib/types';

export interface LogEntryViewModel {
  message: string;
  category: LogCategory | null; // null for legacy string entries
  isMilestone: boolean; // always false for legacy strings
  isPassive: boolean; // always false for legacy strings
  turn: number | null; // null = legacy entry OR turn 0 (pre-game) -- never gets a divider
  playerName?: string; // resolved from playerId via gameState.players; absent if not found
  playerColorClass?: string; // playerTextColors[player.color], paired with playerName
  targetPlayerName?: string;
  targetPlayerColorClass?: string;
}

export interface LogMessageSegment {
  text: string;
  colorClass: string | null;
}

export type DisplayedLogEntry = LogEntryViewModel & {
  turnDividerLabel: string | null; // e.g. "Turn 5"; rendered immediately before this entry
  segments: LogMessageSegment[]; // `message` split into colored/plain runs
};

export interface GameLogViewModel {
  entries: DisplayedLogEntry[]; // newest first, already filtered and divided
  showRoutineActivity: boolean;
  onToggleShowRoutineActivity: () => void;
}
