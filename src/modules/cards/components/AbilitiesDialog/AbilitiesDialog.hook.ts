import { useToast } from '@/modules/shared';
import { toAbilitiesDialogViewModel } from './AbilitiesDialog.map';
import type { AbilitiesDialogProps, AbilitiesDialogViewModel, AbilityViewModel } from './AbilitiesDialog.types';

export interface AbilitiesDialogState {
  viewModel: AbilitiesDialogViewModel;
  onBuyAbility: (ability: AbilityViewModel) => void;
  onClose: () => void;
}

const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

export function useAbilitiesDialog(props: AbilitiesDialogProps): AbilitiesDialogState {
  const { player, onClose, onBuyAbility, gameState, isMyTurn } = props;
  const { toast } = useToast();

  const handleBuyAbility = (ability: AbilityViewModel): void => {
    try {
      onBuyAbility(ability.name);
      toast({ title: 'Purchase Successful!', description: `You have acquired the ${ability.title} ability.` });
    } catch (e: unknown) {
      console.error('Purchase Failed:', e);
      const message = e instanceof Error ? e.message : UNKNOWN_ERROR_MESSAGE;
      toast({ title: 'Purchase Failed', description: message, variant: 'destructive' });
    }
  };

  return {
    viewModel: toAbilitiesDialogViewModel(gameState, player, isMyTurn),
    onBuyAbility: handleBuyAbility,
    onClose,
  };
}
