import type { LogEntry, Player } from '@/lib/types';
import { playerTextColors } from '@/modules/shared';
import type { LogEntryViewModel, LogMessageSegment } from './GameLog.types';

const PRE_GAME_TURN = 0;

function toResolvedPlayer(playerId: string | undefined, players: Player[]) {
  if (!playerId) return undefined;
  return players.find((player) => player.playerId === playerId);
}

/** Reverses `logs` (newest first) and resolves each entry's display fields. */
export function toLogEntryViewModels(logs: LogEntry[], players: Player[]): LogEntryViewModel[] {
  return [...logs].reverse().map((entry) => {
    if (typeof entry === 'string') {
      return { message: entry, category: null, isMilestone: false, isPassive: false, turn: null };
    }

    const player = toResolvedPlayer(entry.playerId, players);
    const targetPlayer = toResolvedPlayer(entry.targetPlayerId, players);

    return {
      message: entry.message,
      category: entry.category,
      isMilestone: entry.isMilestone ?? false,
      isPassive: entry.isPassive ?? false,
      turn: entry.turn > PRE_GAME_TURN ? entry.turn : null,
      playerName: player?.name,
      playerColorClass: player && playerTextColors[player.color],
      targetPlayerName: targetPlayer?.name,
      targetPlayerColorClass: targetPlayer && playerTextColors[targetPlayer.color],
    };
  });
}

/** Hides passive entries unless the viewer opted into routine activity; milestones are always shown. */
export function filterVisibleEntries(
  entries: LogEntryViewModel[],
  showRoutineActivity: boolean,
): LogEntryViewModel[] {
  return entries.filter((entry) => entry.isMilestone || showRoutineActivity || !entry.isPassive);
}

/** Inserts a "Turn N" divider label before the first visible entry of each new turn. */
export function withTurnDividers(
  entries: LogEntryViewModel[],
): (LogEntryViewModel & { turnDividerLabel: string | null })[] {
  let lastDividedTurn: number | null = null;

  return entries.map((entry) => {
    const isNewTurn = entry.turn !== null && entry.turn !== lastDividedTurn;
    if (isNewTurn) lastDividedTurn = entry.turn;

    return { ...entry, turnDividerLabel: isNewTurn ? `Turn ${entry.turn}` : null };
  });
}

function toNameMatch(entry: LogEntryViewModel, name: string | undefined, colorClass: string | undefined) {
  if (!name || !colorClass) return null;
  const index = entry.message.indexOf(name);
  if (index === -1) return null;
  return { name, colorClass, index };
}

/** Splits `message` into plain/colored runs around the player and target player names, whichever appears first. */
export function toMessageSegments(entry: LogEntryViewModel): LogMessageSegment[] {
  const matches = [
    toNameMatch(entry, entry.playerName, entry.playerColorClass),
    toNameMatch(entry, entry.targetPlayerName, entry.targetPlayerColorClass),
  ]
    .filter((match): match is { name: string; colorClass: string; index: number } => match !== null)
    .sort((a, b) => a.index - b.index);

  if (matches.length === 0) return [{ text: entry.message, colorClass: null }];

  const segments: LogMessageSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.index < cursor) continue; // overlapping match (e.g. one name contains the other); skip
    if (match.index > cursor) segments.push({ text: entry.message.slice(cursor, match.index), colorClass: null });
    segments.push({ text: match.name, colorClass: match.colorClass });
    cursor = match.index + match.name.length;
  }

  if (cursor < entry.message.length) segments.push({ text: entry.message.slice(cursor), colorClass: null });

  return segments;
}
