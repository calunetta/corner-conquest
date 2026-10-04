import type { AttackSelectionDialogState } from '@/lib/types';

export interface AttackSelectionDialogProps {
  state: AttackSelectionDialogState;
  onSelectTarget: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
}

// Intentionally local, not imported from ArmySelectionDialog — see plan.md Decisions:
// the two "Ready" cases differ in meaning and component folders are not importable
// from each other except through the module index.
export type ArmyStatus = 'acted' | 'positioned' | 'ready';

export interface AttackArmyOptionViewModel {
  id: number;
  status: ArmyStatus;
  sprite: string;
}

export interface AttackSelectionViewModel {
  defendingPlayerName: string;
  armies: AttackArmyOptionViewModel[];
}
