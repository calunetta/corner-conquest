import Image from 'next/image';
import { ResourceType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getResourceDisplayName } from './resource-display';

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
