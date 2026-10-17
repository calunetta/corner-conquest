import { ResourceType } from '@/lib/types';
import { RESOURCE_GAIN_SPRITES, toArmyIconId } from '@/modules/shared';
import type { PulseState } from '@/modules/shared';
import type { Player } from '@/lib/types';
import type {
  BuffViewModel,
  PlayerInfoViewModel,
  ResourceStatViewModel,
  TurnBadgeViewModel,
} from './PlayerInfo.types';

const FULL_PROGRESS = 100;

function toVpPercent(victoryPoints: number, vpGoal: number): number {
  // Guard against vpGoal <= 0 to prevent NaN (found-bug fix: legacy's (victoryPoints / vpGoal) * 100 with both === 0 yields NaN, breaking progress bar width).
  if (vpGoal <= 0) return FULL_PROGRESS;
  return Math.min(FULL_PROGRESS, Math.max(0, Math.round((victoryPoints / vpGoal) * FULL_PROGRESS)));
}

function toBuffs(player: Player): BuffViewModel[] {
  const buffs: BuffViewModel[] = [];

  if (player.passiveAbilities?.collector) {
    buffs.push({
      id: 'collector',
      label: 'Collector',
      description: 'Collector: +1 extra food on harvest',
    });
  }

  if (player.passiveAbilities?.explorer) {
    buffs.push({
      id: 'explorer',
      label: 'Explorer',
      description: 'Explorer: +1 extra movement range',
    });
  }

  if (player.reinforceActive) {
    buffs.push({
      id: 'reinforce',
      label: 'Reinforce',
      description: 'Reinforce active: next deploy is free',
    });
  }

  if (player.efficientActive) {
    buffs.push({
      id: 'efficient',
      label: 'Efficient',
      description: 'Efficient active: next deploy 50% off',
    });
  }

  if (player.masterBuilderActive) {
    buffs.push({
      id: 'builder',
      label: 'Builder',
      description: 'Master Builder active: upgrade cost waived',
    });
  }

  if (player.hasExtraMove) {
    buffs.push({
      id: 'extra-move',
      label: 'Extra Move',
      description: 'Extra Move active this turn',
    });
  }

  if (player.isSabotaged) {
    buffs.push({
      id: 'sabotaged',
      label: 'Sabotaged',
      description: 'Sabotaged: misses next turn',
    });
  }

  return buffs;
}

function toGainPulse(
  type: ResourceType,
  gainPulses: Partial<Record<ResourceType, PulseState>>,
): ResourceStatViewModel['gainPulse'] {
  const pulse = gainPulses[type];
  if (!pulse?.isActive) return null;
  return { token: pulse.token, spriteSrc: RESOURCE_GAIN_SPRITES[type] };
}

export function toResources(
  player: Player,
  gainPulses: Partial<Record<ResourceType, PulseState>> = {},
): ResourceStatViewModel[] {
  return [
    {
      type: ResourceType.Food,
      label: 'Food',
      value: player.resources?.food ?? 0,
      gainPulse: toGainPulse(ResourceType.Food, gainPulses),
    },
    {
      type: ResourceType.Wood,
      label: 'Wood',
      value: player.resources?.wood ?? 0,
      gainPulse: toGainPulse(ResourceType.Wood, gainPulses),
    },
    {
      type: ResourceType.Gold,
      label: 'Gold',
      value: player.resources?.gold ?? 0,
      gainPulse: toGainPulse(ResourceType.Gold, gainPulses),
    },
  ];
}

function toTurnBadge(
  isCurrentPlayer: boolean,
  isMyTurn: boolean,
  turnTimer: { formattedTime: string; isExpiring: boolean },
): TurnBadgeViewModel | null {
  if (!isCurrentPlayer) return null;

  return {
    showCountdown: isMyTurn,
    formattedTime: turnTimer.formattedTime,
    isExpiring: turnTimer.isExpiring,
  };
}

export function toPlayerInfoViewModel(
  player: Player,
  isCurrentPlayer: boolean,
  vpGoal: number,
  turnTimer: { formattedTime: string; isExpiring: boolean },
  isMyTurn: boolean,
  gainPulses: Partial<Record<ResourceType, PulseState>> = {},
): PlayerInfoViewModel {
  const armyCount = player.armies ? player.armies.length : (player.armyCount ?? 0);
  const positionedCount = player.positions ? player.positions.length : 0;
  const victoryPoints = player.victoryPoints ?? 0;

  return {
    name: player.name,
    color: player.color,
    isBot: player.isBot ?? false,
    isCurrentPlayer,
    iconId: toArmyIconId(player.color),
    armyCount,
    positionedCount,
    victoryPoints,
    vpGoal,
    vpPercent: toVpPercent(victoryPoints, vpGoal),
    specialCardsCount: player.specialCards ? player.specialCards.length : 0,
    specialCards: player.specialCards || [],
    attackPower: player.attackPower ?? 0,
    resources: toResources(player, gainPulses),
    buffs: toBuffs(player),
    turnBadge: toTurnBadge(isCurrentPlayer, isMyTurn, turnTimer),
  };
}
