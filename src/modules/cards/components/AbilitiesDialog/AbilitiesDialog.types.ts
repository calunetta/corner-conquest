import type { AbilityName, GameState, Player } from '@/lib/types';

export interface AbilitiesDialogProps {
  player: Player;
  onClose: () => void;
  onBuyAbility: (abilityName: AbilityName) => void;
  gameState: GameState;
  isMyTurn: boolean;
}

export interface AbilityViewModel {
  name: AbilityName;
  title: string;
  description: string;
  hasAbility: boolean;
  showBuyButton: boolean;
  canAfford: boolean;
}

export interface AbilitiesDialogViewModel {
  cost: number;
  abilities: AbilityViewModel[];
}
