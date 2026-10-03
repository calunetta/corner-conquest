import { useState } from 'react';
import { toCombatDialogViewModel } from './CombatDialog.map';
import type { CombatCardSelection, CombatDialogViewModel } from './CombatDialog.types';
import type { CombatDialogProps } from './CombatDialog.types';

export interface CombatDialogState {
  viewModel: CombatDialogViewModel | null;
  selectedCard: CombatCardSelection;
  isRolling: boolean;
  onSelectCard: (card: CombatCardSelection) => void;
  onRollClick: () => void;
  onClose: () => void;
}

export function useCombatDialog(props: CombatDialogProps): CombatDialogState {
  const [selectedCard, setSelectedCard] = useState<CombatCardSelection>('none');
  const [isRolling, setIsRolling] = useState(false);

  const viewModel = toCombatDialogViewModel(props.gameState, props.localPlayerId, props.isMyTurn);

  const handleSelectCard = (card: CombatCardSelection) => {
    setSelectedCard(card);
  };

  const handleRollClick = () => {
    setIsRolling(true);
    props.onRoll({
      useWarChief: selectedCard === 'warchief',
      useOvercome: selectedCard === 'overcome',
    });
  };

  const handleClose = () => {
    props.onClose();
  };

  return {
    viewModel,
    selectedCard,
    isRolling,
    onSelectCard: handleSelectCard,
    onRollClick: handleRollClick,
    onClose: handleClose,
  };
}
