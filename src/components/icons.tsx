
import { Gem, Hammer, Wheat, Skull, Angry, Bot, Crown, type LucideIcon } from 'lucide-react';
import { type Monster, ResourceType } from '@/lib/types';

type ResourceIconProps = {
  type: ResourceType;
  className?: string;
};

const resourceIconMap: Record<ResourceType, LucideIcon> = {
  [ResourceType.Gems]: Gem,
  [ResourceType.Iron]: Hammer,
  [ResourceType.Wheat]: Wheat,
};

export function ResourceIcon({ type, className }: ResourceIconProps) {
  const Icon = resourceIconMap[type];
  if (!Icon) return null;
  return <Icon className={className} />;
}

type MonsterIconProps = {
  level: number;
  className?: string;
};

const monsterIconMap: Record<number, { Icon: LucideIcon, colorClass: string }> = {
  1: { Icon: Skull, colorClass: 'text-gray-400' },
  2: { Icon: Angry, colorClass: 'text-yellow-500' },
  3: { Icon: Bot, colorClass: 'text-orange-500' },
  4: { Icon: Crown, colorClass: 'text-red-600' },
};

export function MonsterIcon({ level, className }: MonsterIconProps) {
  const iconInfo = monsterIconMap[level];
  if (!iconInfo) return <Skull className={className} />; // Default icon
  const { Icon, colorClass } = iconInfo;
  return <Icon className={`${className} ${colorClass}`} />;
}
