import type { CardName, Player } from '@/lib/types';

export interface CardsDialogProps {
  player: Player;
  onClose: () => void;
  onUseCard: (cardName: CardName) => void;
  canUseCards: boolean;
}

export interface SpecialCardViewModel {
  name: CardName;
  count: number;
  description: string;
  isUsable: boolean;
}

export interface CardsDialogViewModel {
  playerName: string;
  cards: SpecialCardViewModel[];
  canUseCardAbility: boolean;
}
