'use client';

import { Timer, Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGameStatusBadge } from './GameStatusBadge.hook';
import { styles } from './GameStatusBadge.styles';
import type { GameStatusBadgeViewModel } from './GameStatusBadge.types';

export function GameStatusBadgeView({
  isWaiting,
  playerCount,
  maxPlayers,
  turnLabel,
  isMyTurn,
  formattedTime,
  isExpiring,
}: GameStatusBadgeViewModel): JSX.Element {
  return (
    <div className={styles.root}>
      {isWaiting ? (
        <div className={styles.waitingWrapper}>
          <Hourglass className={styles.hourglassIcon} />
          <span>Waiting for players ({playerCount}/{maxPlayers})</span>
        </div>
      ) : (
        <div className={styles.playingWrapper}>
          <span className={styles.turnText}>{turnLabel}</span>

          {isMyTurn && (
            <Badge variant="outline" data-testid="turn-countdown-timer" className={styles.countdownBadge({ isExpiring })}>
              <Timer className={styles.countdownIcon({ isExpiring })} />
              {formattedTime}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function GameStatusBadge(): JSX.Element {
  return <GameStatusBadgeView {...useGameStatusBadge()} />;
}
