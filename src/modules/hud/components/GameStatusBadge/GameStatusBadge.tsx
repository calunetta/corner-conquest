'use client';

import { RegistryIcon } from '@/modules/shared';
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
          <RegistryIcon id="hourglass" className={styles.hourglassIcon} />
          <span>Waiting for players ({playerCount}/{maxPlayers})</span>
        </div>
      ) : (
        <div className={styles.playingWrapper}>
          <span className={styles.turnText}>{turnLabel}</span>

          {isMyTurn && (
            <Badge variant="outline" data-testid="turn-countdown-timer" className={styles.countdownBadge({ isExpiring })}>
              <RegistryIcon id="timer" className={styles.countdownIcon({ isExpiring })} />
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
