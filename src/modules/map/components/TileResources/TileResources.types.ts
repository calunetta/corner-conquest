import type { Island, ResourceType, PlayerColor } from '@/lib/types';

export interface TileResourcesProps {
  island: Island;
  isBase?: boolean;
}

export interface ResourceNodeViewModel {
  type: ResourceType;
  key: string;
  spriteSrc: string;
  nodeSize: number;
  slotStyle: { top?: string; bottom?: string; left?: string; right?: string; transform?: string };
  farmingCollector: { color: PlayerColor; sprite: string } | null;
}
