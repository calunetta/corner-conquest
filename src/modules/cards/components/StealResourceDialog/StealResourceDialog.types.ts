import type { Player, ResourceType } from '@/lib/types';

export interface StealResourceDialogProps {
  players: Player[];
  onSteal: (targetPlayerId: number, resource: ResourceType) => void;
  onClose: () => void;
}

export interface StealPlayerOptionViewModel {
  id: number;
  name: string;
  sprite: string;
  totalResources: number;
  isSelected: boolean;
}

export interface StealResourceOptionViewModel {
  resource: ResourceType;
  sprite: string;
  displayName: string;
  available: number;
  isAvailable: boolean;
  isSelected: boolean;
}

export type StealResourceStep =
  | { kind: 'player'; options: StealPlayerOptionViewModel[] }
  | {
      kind: 'resource';
      playerName: string;
      playerId: number;
      options: StealResourceOptionViewModel[];
      canConfirm: boolean;
    };

export interface PlayerSelectionStepProps {
  options: StealPlayerOptionViewModel[];
  onSelectPlayer: (playerId: number) => void;
  onClose: () => void;
}

export interface ResourceSelectionStepProps {
  playerName: string;
  options: StealResourceOptionViewModel[];
  canConfirm: boolean;
  selectedDisplayName: string | null;
  onSelectResource: (resource: ResourceType) => void;
  onBack: () => void;
  onSteal: () => void;
}
