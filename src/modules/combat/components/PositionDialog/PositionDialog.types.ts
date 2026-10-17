import type { IslandResource, PlayerColor, ResourceType } from '@/lib/types';

export interface PositionDialogProps {
  resources: IslandResource[];
  color: PlayerColor;
  onSelect: (resource: ResourceType) => void;
  onClose: () => void;
}

export interface PositionOptionViewModel {
  type: ResourceType;
  amount: number;
  sprite: string;
  displayName: string;
}

export interface PositionDialogViewModel {
  options: PositionOptionViewModel[];
}
