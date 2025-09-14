import { Gem, Hammer, CircleDollarSign, Wheat, Icon as LucideIcon } from 'lucide-react';
import type { ResourceType } from '@/lib/types';

type ResourceIconProps = {
  type: ResourceType;
  className?: string;
};

const iconMap: Record<ResourceType, LucideIcon> = {
  gold: CircleDollarSign,
  gems: Gem,
  iron: Hammer,
  food: Wheat,
};

export function ResourceIcon({ type, className }: ResourceIconProps) {
  const Icon = iconMap[type];
  return <Icon className={className} />;
}
