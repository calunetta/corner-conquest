import { useState } from 'react';
import { toMonsterCombatViewModel } from './MonsterCombatDialog.map';
import type { MonsterCombatCardSelection, MonsterCombatViewModel } from './MonsterCombatDialog.types';
import type { MonsterCombatDialogProps } from './MonsterCombatDialog.types';

export interface MonsterCombatDialogState {
  viewModel: MonsterCombatViewModel | null;
  selectedCard: MonsterCombatCardSelection;
  decidedValue: number;             // default 6, legacy :42
  onSelectCard: (card: MonsterCombatCardSelection) => void;
  onDecidedValueChange: (value: number) => void;
  onAttack: () => void;             // builds the onRoll payload from gameState.monsterCombatState!.monster + selectedCard/decidedValue; no-ops if there is no monster (legacy :54 guard)
  onCancel: () => void;             // wraps legacy handleCancel: calls props.onClose only (see Decisions)
  onContinue: () => void;           // results screen's "Continue" button -> props.onClose
}

export function useMonsterCombatDialog(props: MonsterCombatDialogProps): MonsterCombatDialogState {
  const [selectedCard, setSelectedCard] = useState<MonsterCombatCardSelection>('none');
  const [decidedValue, setDecidedValue] = useState(6);

  const viewModel = toMonsterCombatViewModel(props.gameState, props.isMyTurn ?? false, props.localPlayerId);

  const handleSelectCard = (card: MonsterCombatCardSelection) => {
    setSelectedCard(card);
  };

  const handleDecidedValueChange = (value: number) => {
    setDecidedValue(value);
  };

  const handleAttack = () => {
    const monster = props.gameState.monsterCombatState?.monster;
    if (monster) {
      props.onRoll({
        monster,
        useDecideCard: selectedCard === 'decide',
        decidedValue,
        useOvercomeCard: selectedCard === 'overcome',
        useWarChief: selectedCard === 'warchief',
      });
    }
  };

  const handleCancel = () => {
    props.onClose();
  };

  const handleContinue = () => {
    props.onClose();
  };

  return {
    viewModel,
    selectedCard,
    decidedValue,
    onSelectCard: handleSelectCard,
    onDecidedValueChange: handleDecidedValueChange,
    onAttack: handleAttack,
    onCancel: handleCancel,
    onContinue: handleContinue,
  };
}
