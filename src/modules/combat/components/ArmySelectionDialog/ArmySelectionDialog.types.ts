import type { ArmySelectionDialogState, Player } from '@/lib/types';

export interface ArmySelectionDialogProps {
  state: ArmySelectionDialogState;
  player: Player;
  onSelectArmy: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
  selectedArmyId?: number | null;
}

export type ArmyStatus = 'acted' | 'positioned' | 'ready';

export interface ArmyOptionViewModel {
  id: number;
  status: ArmyStatus;
  isSelectable: boolean;
  isSelected: boolean;
  sprite: string;
}

export interface ArmySelectionViewModel {
  x: number;
  y: number;
  armies: ArmyOptionViewModel[];
}
