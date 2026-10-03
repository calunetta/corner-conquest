'use client';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ResourceIcon, FightIcon } from '@/components/icons';
import { Anchor, Album, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { styles } from './PlayerInfo.styles';
import type { PlayerInfoViewModel } from './PlayerInfo.types';

interface PlayerInfoStatsProps {
  armyCount: number;
  positionedCount: number;
  attackPower: number;
  specialCardsCount: number;
  specialCards: string[];
  resources: PlayerInfoViewModel['resources'];
}

/** Renders the stats chips (armies, attack, cards) and resource grid. */
export function PlayerInfoStats({
  armyCount,
  positionedCount,
  attackPower,
  specialCardsCount,
  specialCards,
  resources,
}: PlayerInfoStatsProps) {
  return (
    <>
      {/* Stats Chips Row: Armies, Attack Power, Special Cards */}
      <div className={styles.statsGrid}>
        {/* Armies count + Positioned indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={styles.statChip} data-testid="player-info-armies">
              <FightIcon className={cn(styles.statIcon, 'text-red-400')} />
              <span className={styles.statValue}>{armyCount}/5</span>
              {positionedCount > 0 && (
                <span className={styles.positionedIndicator}>
                  <Anchor className="h-2.5 w-2.5 ml-0.5" />
                  {positionedCount}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Armies: {armyCount} on board (max 5)</p>
            {positionedCount > 0 && (
              <p className="text-xs text-amber-300">{positionedCount} stationed & harvesting</p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Attack Power */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={styles.statChip} data-testid="player-info-attack">
              <Zap className={cn(styles.statIcon, 'text-yellow-400')} />
              <span className={styles.statValue}>+{attackPower} AP</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Attack Power: +{attackPower} bonus combat dice (max 4)</p>
          </TooltipContent>
        </Tooltip>

        {/* Special Cards in hand */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={styles.statChip} data-testid="player-info-cards">
              <Album className={cn(styles.statIcon, 'text-purple-400')} />
              <span className={styles.statValue}>{specialCardsCount}/3</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Special Cards: {specialCardsCount} in hand</p>
            {specialCards && specialCards.length > 0 && (
              <p className="text-xs text-purple-300 mt-0.5">{specialCards.join(', ')}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Resources Breakdown Row (Food, Wood, Gold) */}
      <div className={styles.resourcesGrid}>
        {resources.map(({ type, label, value }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <div className={styles.resourceChip} data-testid={`player-info-resource-${type}`}>
                <ResourceIcon type={type} className="h-3.5 w-3.5 shrink-0" />
                <span className={styles.resourceValue}>{value}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {label}: {value}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </>
  );
}
