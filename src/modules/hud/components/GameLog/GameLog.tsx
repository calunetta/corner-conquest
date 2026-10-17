'use client';

import { RegistryIcon } from '@/modules/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import type { LogCategory } from '@/lib/types';
import { useGameLog } from './GameLog.hook';
import { styles } from './GameLog.styles';
import type {
  DisplayedLogEntry,
  GameLogVariant,
  GameLogViewModel,
  LogMessageSegment,
} from './GameLog.types';

const CATEGORY_ICON_IDS: Record<LogCategory, string> = {
  combat: 'swords',
  economy: 'coins',
  cards: 'layers',
  turn: 'clock',
  system: 'info',
};

/** Category icon for a routine entry, or the trophy accent for a milestone. Legacy entries (`category: null`) get no icon. */
function EntryIcon({ entry }: { entry: DisplayedLogEntry }) {
  if (entry.isMilestone) {
    return <RegistryIcon id="trophy" className={styles.milestoneIcon} aria-hidden />;
  }
  if (!entry.category) {
    return null;
  }
  return <RegistryIcon id={CATEGORY_ICON_IDS[entry.category]} className={styles.entryIcon} aria-hidden />;
}

/** Renders a message as colored player-name substrings plus plain-text runs. */
function EntryMessage({ segments }: { segments: LogMessageSegment[] }) {
  return (
    <span className={styles.entryText}>
      {segments.map((segment, index) => (
        <span key={index} className={segment.colorClass ?? undefined}>
          {segment.text}
        </span>
      ))}
    </span>
  );
}

/** Pure view: renders the game log entries, turn dividers and the declutter toggle. `variant` only changes presentation. */
export function GameLogView({
  entries,
  showRoutineActivity,
  onToggleShowRoutineActivity,
  variant = 'panel',
}: GameLogViewModel & { variant?: GameLogVariant }) {
  return (
    <Card className={styles.card({ variant })}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>Event Log</CardTitle>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Show routine activity</span>
          <Switch
            checked={showRoutineActivity}
            onCheckedChange={onToggleShowRoutineActivity}
            aria-label="Show routine activity"
          />
        </div>
      </CardHeader>
      <CardContent className={styles.content({ variant })}>
        <ScrollArea className={styles.scrollArea({ variant })} data-testid="game-log-scroll">
          <div className={styles.entriesContainer}>
            {entries.map((entry, index) => (
              <div key={entries.length - 1 - index}>
                {entry.turnDividerLabel && (
                  <div className={styles.divider} role="separator">
                    {entry.turnDividerLabel}
                    <span className={styles.dividerLine} aria-hidden="true" />
                  </div>
                )}
                <p className={styles.entry}>
                  <EntryIcon entry={entry} />
                  <EntryMessage segments={entry.segments} />
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/** Connected component: reads the game board context. */
export function GameLog() {
  return <GameLogView {...useGameLog()} />;
}
