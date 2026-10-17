import Image from 'next/image';
import { ResourceType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/modules/icons';
import { getResourceDisplayName } from './resource-display';

// Registry ids, not sprite paths: the path lives only in icon-registry.config.json.
const RESOURCE_ICON_IDS: Record<ResourceType, string> = {
  [ResourceType.Food]: 'icon-meat',
  [ResourceType.Wood]: 'icon-wood',
  [ResourceType.Gold]: 'icon-gold',
};

export function ResourceIcon({ type, className }: { type: ResourceType; className?: string }) {
  const iconId = RESOURCE_ICON_IDS[type];
  if (!iconId) return null;

  const { src, transform } = resolveIcon(iconId);
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <span className="relative flex h-full w-full items-center justify-center" style={{ transform }}>
        <Image
          src={src}
          alt={getResourceDisplayName(type)}
          width={32}
          height={32}
          className="h-full w-full object-contain select-none"
          unoptimized
        />
      </span>
    </span>
  );
}
