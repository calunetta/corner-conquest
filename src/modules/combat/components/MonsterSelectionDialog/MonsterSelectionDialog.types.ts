import type { MonsterSelectionDialogState } from '@/lib/types';

export interface MonsterSelectionDialogProps {
  state: MonsterSelectionDialogState;
  onSelectTarget: (monsterName: string) => void;
  onClose: () => void;
  isMyTurn: boolean;
}

export interface MonsterOptionViewModel {
  name: string;
  sprite: string;
  label: string;
  powerLabel: string;
}

export interface MonsterSelectionViewModel {
  monsters: MonsterOptionViewModel[];
}
