import type { SpecialIslandRollDialogState } from '@/lib/types';

export interface SpecialIslandRollDialogProps {
  state: SpecialIslandRollDialogState;
  onRoll: () => void;
  onClose: () => void;
}

export interface SpecialIslandRollViewModel {
  isRolled: boolean;
  roll: number | null;
  cardDrawn: string | null;
  cardDescription: string | null;
}
