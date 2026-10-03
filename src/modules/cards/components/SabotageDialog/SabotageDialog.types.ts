import type { Player } from '@/lib/types';

export interface SabotageDialogProps {
  players: Player[];
  onSabotage: (targetPlayerId: number) => void;
  onClose: () => void;
}

export interface SabotageTargetViewModel {
  id: number;
  name: string;
  sprite: string;
}

export interface SabotageDialogViewModel {
  targets: SabotageTargetViewModel[];
}
