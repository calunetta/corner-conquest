import { ResourceType } from '@/lib/types';
import { RegistryIcon } from './registry-icon';
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

  return <RegistryIcon id={iconId} alt={getResourceDisplayName(type)} className={className} />;
}
