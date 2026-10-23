'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RegistryIcon, ResourceIcon } from '@/modules/shared';
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
  resources,
  isExiting,
  onExitClick,
  onStartGame,
  canRegenerateTerrain,
  onRegenerateTerrain,
  isBackgroundOn,
  onToggleBackground,
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
          {isExiting ? (
            <RegistryIcon id="loader-2" className={styles.exitButtonLoader} />
          ) : (
            <RegistryIcon id="arrow-left" className={styles.exitButtonArrow} />
          )}
        </Button>
        <h1 className={styles.title}>{gameName}</h1>
        {isPlaying && (
          <div className={styles.vpGoalBadge}>
            <RegistryIcon id="trophy" className={styles.vpGoalIcon} />
            <span>VP Goal: {victoryPointGoal}</span>
          </div>
        )}
        {isPlaying && (
          <div className={styles.resourceStrip} data-testid="gameboard-resource-strip">
            {resources.map(({ type, value }) => (
              <span key={type} className={styles.resourcePair}>
                <ResourceIcon type={type} className={styles.resourceIcon} />
                <span className={styles.resourceValue}>{value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.rightGroup}>
        <div className={styles.turnIndicatorWrapper}>
          <RegistryIcon id="image-icon" className={styles.backgroundIcon} aria-hidden />
          <span className={styles.turnLabel}>Background</span>
          <Switch
            checked={isBackgroundOn}
            onCheckedChange={onToggleBackground}
            aria-label="Toggle sky background"
          />
        </div>

        {isPlaying && (
          <div className={styles.turnIndicatorWrapper}>
            <RegistryIcon id="timer" className={styles.turnTimerIcon({ isExpiring: turnTimer.isExpiring })} />
            <span className={styles.turnLabel}>Turn:</span>
            <span className={styles.playerName}>{turnPlayerName}</span>
            {isMyTurn && <span className={styles.countdown({ isExpiring: turnTimer.isExpiring })}>({turnTimer.formattedTime})</span>}
          </div>
        )}

        {canRegenerateTerrain && (
          <Button variant="outline" onClick={onRegenerateTerrain} data-testid="gameboard-regenerate-terrain-btn">
            <RegistryIcon id="sparkles" className={styles.startGameIcon} /> Regenerate map
          </Button>
        )}

        {canStartGame && (
          <Button onClick={onStartGame} className={styles.startGameButton}>
            <RegistryIcon id="play" className={styles.startGameIcon} /> Start Game
          </Button>
        )}
      </div>
    </div>
  );
}

export function GameBoardHeader(): JSX.Element {
  return <GameBoardHeaderView {...useGameBoardHeader()} />;
}
