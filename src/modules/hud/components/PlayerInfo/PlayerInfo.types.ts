import type { CardName, Player, PlayerColor, ResourceType } from '@/lib/types';

export interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer: boolean;
  vpGoal?: number;
}

export type BuffId = 'collector' | 'explorer' | 'reinforce' | 'efficient' | 'builder' | 'extra-move' | 'sabotaged';

export interface BuffViewModel {
  id: BuffId;
  label: string;
  description: string;
}

export interface ResourceStatViewModel {
  type: ResourceType;
  label: string;
  value: number;
  /** Non-null only while this chip's gain animation plays; `token` restarts the GIF on each gain. */
  gainPulse: { token: number; spriteSrc: string } | null;
}

export interface TurnBadgeViewModel {
  showCountdown: boolean;
  formattedTime: string;
  isExpiring: boolean;
}

export interface PlayerInfoViewModel {
  name: string;
  color: PlayerColor;
  isBot: boolean;
  isCurrentPlayer: boolean;
  spriteSrc: string;
  armyCount: number;
  positionedCount: number;
  victoryPoints: number;
  vpGoal: number;
  vpPercent: number;
  specialCardsCount: number;
  specialCards: CardName[];
  attackPower: number;
  resources: ResourceStatViewModel[];
  buffs: BuffViewModel[];
  turnBadge: TurnBadgeViewModel | null;
}
