import React from 'react';
import Image from 'next/image';
import { Skull, Angry, Bot, Crown, type LucideIcon } from 'lucide-react';
import { ResourceType } from '@/lib/types';
import { cn } from '@/lib/utils';

export const RESOURCE_DISPLAY_NAMES: Record<ResourceType, string> = {
  [ResourceType.Food]: 'Food',
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Gold]: 'Gold',
};

export function getResourceDisplayName(type: ResourceType): string {
  return RESOURCE_DISPLAY_NAMES[type] || type;
}

export const RESOURCE_SPRITES: Record<ResourceType, string> = {
  [ResourceType.Food]: '/sprites/sheep.gif',
  [ResourceType.Wood]: '/sprites/tree.gif',
  [ResourceType.Gold]: '/sprites/gold.gif',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.Food]: '/sprites/icon_meat.png',
  [ResourceType.Wood]: '/sprites/icon_wood.png',
  [ResourceType.Gold]: '/sprites/icon_gold.png',
};

export function ResourceIcon({ type, className }: { type: ResourceType; className?: string }) {
  const iconSrc = RESOURCE_ICONS[type];
  if (!iconSrc) return null;

  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <Image
        src={iconSrc}
        alt={getResourceDisplayName(type)}
        width={32}
        height={32}
        className="h-full w-full object-contain select-none"
        unoptimized
      />
    </span>
  );
}

export function FightIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <Image
        src="/sprites/icon_fight.png"
        alt="Fight"
        width={32}
        height={32}
        className="h-full w-full object-contain select-none"
        unoptimized
      />
    </span>
  );
}

export function InfoIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <Image
        src="/sprites/icon_info.png"
        alt="Info"
        width={32}
        height={32}
        className="h-full w-full object-contain select-none"
        unoptimized
      />
    </span>
  );
}

export function SettingsIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <Image
        src="/sprites/icon_settings.png"
        alt="Settings"
        width={32}
        height={32}
        className="h-full w-full object-contain select-none"
        unoptimized
      />
    </span>
  );
}

type MonsterIconProps = {
  level: number;
  className?: string;
};

const monsterIconMap: Record<number, { Icon: LucideIcon; colorClass: string }> = {
  1: { Icon: Skull, colorClass: 'text-gray-400' },
  2: { Icon: Angry, colorClass: 'text-yellow-500' },
  3: { Icon: Bot, colorClass: 'text-orange-500' },
  4: { Icon: Crown, colorClass: 'text-red-600' },
};

export function MonsterIcon({ level, className }: MonsterIconProps) {
  const iconInfo = monsterIconMap[level];
  if (!iconInfo) return <Skull className={className} />;
  const { Icon, colorClass } = iconInfo;
  return <Icon className={cn(className, colorClass)} />;
}
