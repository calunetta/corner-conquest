import { useState } from 'react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { canViewerReadLogEntry } from '@/modules/game-rules';
import { filterVisibleEntries, toLogEntryViewModels, toMessageSegments, withTurnDividers } from './GameLog.map';
import type { GameLogViewModel } from './GameLog.types';

export function useGameLog(): GameLogViewModel {
  const { gameState, localPlayer } = useGameBoard();
  const [showRoutineActivity, setShowRoutineActivity] = useState(false);

  const raw = toLogEntryViewModels(gameState.log || [], gameState.players, (entry) =>
    canViewerReadLogEntry(gameState, localPlayer ?? null, entry),
  );
  const visible = filterVisibleEntries(raw, showRoutineActivity);
  const divided = withTurnDividers(visible);

  return {
    entries: divided.map((entry) => ({ ...entry, segments: toMessageSegments(entry) })),
    showRoutineActivity,
    onToggleShowRoutineActivity: () => setShowRoutineActivity((previous) => !previous),
  };
}
