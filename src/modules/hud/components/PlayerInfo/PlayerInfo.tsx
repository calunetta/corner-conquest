'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buffIconMap } from './BuffIcons';
import { PlayerInfoStats } from './PlayerInfoStats';
import { usePlayerInfo } from './PlayerInfo.hook';
import { playerBgGlow, playerBorderColors, playerRingColors, styles } from './PlayerInfo.styles';
import type { PlayerInfoProps, PlayerInfoViewModel } from './PlayerInfo.types';

/** Pure view: renders the player info card. */
export function PlayerInfoView(viewModel: PlayerInfoViewModel) {
  return (
    <TooltipProvider>
      <Card
        className={cn(
          styles.card,
          playerBorderColors[viewModel.color],
          viewModel.isCurrentPlayer ? styles.cardCurrent : styles.cardOther,
          playerBgGlow[viewModel.color],
        )}
      >
        <CardContent className={styles.content}>
          {/* Header Row: Avatar + Name + Turn Timer Badge */}
          <div className={styles.headerRow}>
            <div className={styles.avatarSection}>
              <div className={cn(styles.avatarContainer, playerRingColors[viewModel.color])}>
                <Image
                  src={viewModel.spriteSrc}
                  alt={`${viewModel.color} player`}
                  width={36}
                  height={36}
                  className={styles.avatarImage}
                  unoptimized
                />
              </div>
              <div className={styles.nameContainer}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={styles.nameTrigger}>
                      <span className={styles.nameText}>{viewModel.name}</span>
                      {viewModel.isBot && (
                        <Badge variant="secondary" className={styles.botBadge}>
                          BOT
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {viewModel.name} ({viewModel.color} commander)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Turn Countdown Badge */}
            <div className={styles.turnBadgeSection}>
              {viewModel.turnBadge && (
                <Badge
                  className={cn(
                    styles.turnBadge,
                    viewModel.turnBadge.isExpiring ? styles.turnBadgeExpiring : styles.turnBadgeNormal,
                  )}
                  data-testid="player-info-turn-badge"
                >
                  <span>TURN</span>
                  {viewModel.turnBadge.showCountdown && (
                    <span className={styles.turnBadgeTime}>{viewModel.turnBadge.formattedTime}</span>
                  )}
                </Badge>
              )}
            </div>
          </div>

          {/* Victory Points Progress Bar */}
          <div className={styles.vpSection}>
            <div className={styles.vpLabel}>
              <span className={styles.vpLabelText}>
                <Trophy className="h-3.5 w-3.5" />
                <span>Victory Points</span>
              </span>
              <span className={styles.vpLabelValue}>
                {viewModel.victoryPoints} / {viewModel.vpGoal}
              </span>
            </div>
            <div className={styles.vpBar}>
              <div className={styles.vpFill} style={{ width: `${viewModel.vpPercent}%` }} />
            </div>
          </div>

          <PlayerInfoStats
            armyCount={viewModel.armyCount}
            positionedCount={viewModel.positionedCount}
            attackPower={viewModel.attackPower}
            specialCardsCount={viewModel.specialCardsCount}
            specialCards={viewModel.specialCards}
            resources={viewModel.resources}
          />

          {/* Active Buffs & Passive Abilities (rendered when present) */}
          {viewModel.buffs.length > 0 && (
            <div className={styles.buffsSection} data-testid="player-info-buffs">
              {viewModel.buffs.map((buff) => (
                <Tooltip key={buff.id}>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={styles.buffBadge}>
                      {buffIconMap[buff.id]}
                      <span>{buff.label}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{buff.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

/** Connected component: reads the game board context. */
export const PlayerInfo = React.memo(function PlayerInfo(props: PlayerInfoProps) {
  return <PlayerInfoView {...usePlayerInfo(props)} />;
});

PlayerInfo.displayName = 'PlayerInfo';
