'use client';

import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { useMonsterCombatDialog } from './MonsterCombatDialog.hook';
import { MonsterAttackScreen } from './MonsterAttackScreen';
import { MonsterResultsScreen } from './MonsterResultsScreen';
import { MonsterSpectatorScreen } from './MonsterSpectatorScreen';
import { styles } from './MonsterCombatDialog.styles';
import type { MonsterCombatDialogProps } from './MonsterCombatDialog.types';

export function MonsterCombatDialog(props: MonsterCombatDialogProps): JSX.Element | null {
  const {
    viewModel,
    selectedCard,
    decidedValue,
    onSelectCard,
    onDecidedValueChange,
    onAttack,
    onCancel,
    onContinue,
  } = useMonsterCombatDialog(props);

  if (!viewModel) return null;

  const { screen, isAttacker } = viewModel;

  return (
    <AlertDialog open={true} onOpenChange={isAttacker ? onCancel : undefined}>
      <AlertDialogContent className={styles.content}>
        {screen.kind === 'attack' && (
          <MonsterAttackScreen
            data={screen.data}
            selectedCard={selectedCard}
            decidedValue={decidedValue}
            onSelectCard={onSelectCard}
            onDecidedValueChange={onDecidedValueChange}
            onCancel={onCancel}
            onAttack={onAttack}
          />
        )}
        {screen.kind === 'results' && <MonsterResultsScreen data={screen.data} onContinue={onContinue} />}
        {screen.kind === 'spectator' && <MonsterSpectatorScreen data={screen.data} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
