import type { IslandResource, ResourceType } from '@/lib/types';

export interface PositionDialogProps {
  resources: IslandResource[];
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
