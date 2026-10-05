'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameLog } from './GameLog.hook';
import { styles } from './GameLog.styles';
import type { GameLogViewModel } from './GameLog.types';

/** Pure view: renders the game log entries. */
export function GameLogView({ entries }: GameLogViewModel) {
  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>Event Log</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <ScrollArea className={styles.scrollArea} data-testid="game-log-scroll">
          <div className={styles.entriesContainer}>
            {entries.map((entry, index) => (
              <p key={entries.length - 1 - index} className={styles.entry}>
                {typeof entry === 'string' ? entry : entry.message}
              </p>
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
