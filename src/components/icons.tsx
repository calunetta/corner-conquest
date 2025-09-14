import { Gem, Hammer, Wheat, Skull, Angry, Icon as LucideIcon } from 'lucide-react';
import type { ResourceType } from '@/lib/types';

type ResourceIconProps = {
  type: ResourceType;
  className?: string;
};

const resourceIconMap: Record<ResourceType, LucideIcon> = {
  gems: Gem,
  iron: Hammer,
  food: Wheat,
};

export function ResourceIcon({ type, className }: ResourceIconProps) {
  const Icon = resourceIconMap[type];
  if (!Icon) return null;
  return <Icon className={className} />;
}

type MonsterIconProps = {
  type: 'cub' | 'huge';
  className?: string;
};

const monsterIconMap: Record<'cub' | 'huge', LucideIcon> = {
  cub: Skull,
  huge: Angry,
};

export function MonsterIcon({ type, className }: MonsterIconProps) {
  const Icon = monsterIconMap[type];
  if (!Icon) return null;
  return <Icon className={className} />;
}
