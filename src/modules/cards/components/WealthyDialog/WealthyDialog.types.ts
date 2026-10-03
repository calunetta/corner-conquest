import type { ResourceType } from '@/lib/types';

export interface WealthyDialogProps {
  onSelectResource: (resource: ResourceType) => void;
  onClose: () => void;
}

export interface WealthyOptionViewModel {
  resource: ResourceType;
  sprite: string;
  displayName: string;
}

export interface WealthyDialogViewModel {
  options: WealthyOptionViewModel[];
}
