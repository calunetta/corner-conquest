'use client';

import { ArrowLeft, Play, Trophy, Loader2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameBoardHeader } from './GameBoardHeader.hook';
import { styles } from './GameBoardHeader.styles';
import type { GameBoardHeaderViewProps } from './GameBoardHeader.types';

export function GameBoardHeaderView({
  gameName,
  isPlaying,
  victoryPointGoal,
  canStartGame,
  turnPlayerName,
  isMyTurn,
  turnTimer,
  isExiting,
  onExitClick,
  onStartGame,
}: GameBoardHeaderViewProps): JSX.Element {
  return (
    <div className={styles.root}>
      <div className={styles.leftGroup}>
        <Button
          variant="outline"
          size="icon"
          onClick={onExitClick}
          disabled={isExiting}
          data-testid="gameboard-exit-btn"
        >
          {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
        </Button>
        <h1 className={styles.title}>{gameName}</h1>
        {isPlaying && (
          <div className={styles.vpGoalBadge}>
            <Trophy className={styles.vpGoalIcon} />
            <span>VP Goal: {victoryPointGoal}</span>
          </div>
        )}
      </div>

      <div className={styles.rightGroup}>
        {isPlaying && (
          <div className={styles.turnIndicatorWrapper}>
            <Timer className={styles.turnTimerIcon({ isExpiring: turnTimer.isExpiring })} />
            <span className={styles.turnLabel}>Turn:</span>
            <span className={styles.playerName}>{turnPlayerName}</span>
            {isMyTurn && <span className={styles.countdown({ isExpiring: turnTimer.isExpiring })}>({turnTimer.formattedTime})</span>}
          </div>
        )}

        {canStartGame && (
          <Button onClick={onStartGame} className={styles.startGameButton}>
            <Play className="mr-2 h-4 w-4" /> Start Game
          </Button>
        )}
      </div>
    </div>
  );
}

export function GameBoardHeader(): JSX.Element {
  return <GameBoardHeaderView {...useGameBoardHeader()} />;
}
