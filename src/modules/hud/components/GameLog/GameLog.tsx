'use client';

import { Clock, Coins, Info, Layers, Swords, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import type { LogCategory } from '@/lib/types';
import { useGameLog } from './GameLog.hook';
import { styles } from './GameLog.styles';
import type { DisplayedLogEntry, GameLogViewModel, LogMessageSegment } from './GameLog.types';

const CATEGORY_ICONS: Record<LogCategory, typeof Swords> = {
  combat: Swords,
  economy: Coins,
  cards: Layers,
  turn: Clock,
  system: Info,
};

/** Category icon for a routine entry, or the trophy accent for a milestone. Legacy entries (`category: null`) get no icon. */
function EntryIcon({ entry }: { entry: DisplayedLogEntry }) {
  if (entry.isMilestone) {
    return <Trophy className={styles.milestoneIcon} aria-hidden="true" />;
  }
  if (!entry.category) {
    return null;
  }
  const Icon = CATEGORY_ICONS[entry.category];
  return <Icon className={styles.entryIcon} aria-hidden="true" />;
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

/** Pure view: renders the game log entries, turn dividers and the declutter toggle. */
export function GameLogView({ entries, showRoutineActivity, onToggleShowRoutineActivity }: GameLogViewModel) {
  return (
    <Card className={styles.card}>
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
      <CardContent className={styles.content}>
        <ScrollArea className={styles.scrollArea} data-testid="game-log-scroll">
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
