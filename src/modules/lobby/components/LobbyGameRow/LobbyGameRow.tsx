'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Users, Info, Loader2 } from 'lucide-react';
import type { GameSettings } from '@/lib/types';
import { toSettingsSummaryRows } from './LobbyGameRow.map';
import { styles } from './LobbyGameRow.styles';
import type { LobbyGameRowProps } from './LobbyGameRow.types';

function SettingsDisplay({ settings }: { settings: GameSettings }) {
  const rows = toSettingsSummaryRows(settings);

  return (
    <div className="space-y-3">
      {rows.slice(0, 4).map((row) => (
        <div key={row.label} className={styles.settingsRow}>
          <span className={styles.settingsLabel2}>{row.label}</span>
          <span className={styles.settingsValue}>{row.value}</span>
        </div>
      ))}
      <Separator />
      {rows.slice(4).map((row) => (
        <div key={row.label} className={styles.settingsRow}>
          <span className={styles.settingsLabel2}>{row.label}</span>
          <span className={styles.settingsValue}>{row.value}</span>
        </div>
      ))}
      <Separator />
      <div className={styles.settingsCardsSection}>
        <h4 className={styles.settingsCardTitle}>Available Cards</h4>
        <div className={styles.settingsCardBadges}>
          {settings.availableCards.map((card) => (
            <Badge key={card} variant="secondary">
              {card}
            </Badge>
          ))}
        </div>
      </div>
      <div className={styles.settingsCardsSection}>
        <h4 className={styles.settingsCardTitle}>Available Abilities</h4>
        <div className={styles.settingsCardBadges}>
          {settings.availableAbilities.map((ability) => (
            <Badge key={ability} variant="secondary" className="capitalize">
              {ability}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LobbyGameRow({
  game,
  isJoining,
  isAnyJoining,
  onJoin,
}: LobbyGameRowProps) {
  const isFull = game.players.length >= game.maxPlayers;

  return (
    <div className={styles.root}>
      <div className={styles.playersGroup}>
        <div className={styles.avatarStack}>
          {game.players.map((p) => (
            <Tooltip key={p.playerId}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2" style={{ borderColor: p.color }}>
                  <AvatarFallback style={{ backgroundColor: p.color }} className="text-white font-bold">
                    {p.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{p.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <h3 className={styles.gameName}>{game.name}</h3>
      </div>

      <div className={styles.infoGroup}>
        <div className={styles.hostInfo}>
          <Crown className="h-4 w-4 text-yellow-500" />
          <span>{game.players[0]?.name || '...'}</span>
        </div>
        <div className={styles.playersInfo}>
          <Users className="h-4 w-4" />
          <span>
            {game.players.length} / {game.maxPlayers}
          </span>
        </div>
        <Badge variant="outline">{game.settings.victoryPointGoal} VP</Badge>
      </div>

      <div className={styles.actionsGroup}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={styles.settingsPopoverContent}>
            <ScrollArea className={styles.settingsScrollArea}>
              <div className="space-y-2">
                <h3 className={styles.settingsTitle}>{game.name}</h3>
                <p className={styles.settingsLabel}>Match Settings</p>
                <Separator />
                <SettingsDisplay settings={game.settings} />
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <Button
          onClick={() => onJoin(game.id)}
          disabled={isAnyJoining || isFull}
          className="min-w-[80px]"
          variant={isFull ? 'secondary' : 'default'}
        >
          {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isFull ? 'Full' : 'Join'}
        </Button>
      </div>
    </div>
  );
}
