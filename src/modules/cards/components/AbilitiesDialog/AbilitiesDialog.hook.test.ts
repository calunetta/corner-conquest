import { renderHook, act } from '@testing-library/react';
import { AbilityName } from '@/lib/types';
import { useAbilitiesDialog } from './AbilitiesDialog.hook';
import type { AbilitiesDialogProps } from './AbilitiesDialog.types';
import {
  gameStateWithAffordableAbilities,
  playerWhoCanAffordAbilities,
  playerWithExplorerAndNoGold,
} from './AbilitiesDialog.fixtures';

const mockToast = jest.fn();
jest.mock('@/modules/shared', () => ({ useToast: () => ({ toast: mockToast }) }));

describe('AbilitiesDialog.hook', () => {
  describe('useAbilitiesDialog', () => {
    beforeEach(() => {
      mockToast.mockClear();
    });

    const createProps = (overrides?: Partial<AbilitiesDialogProps>): AbilitiesDialogProps => ({
      player: playerWhoCanAffordAbilities,
      onClose: jest.fn(),
      onBuyAbility: jest.fn(),
      gameState: gameStateWithAffordableAbilities,
      isMyTurn: true,
      ...overrides,
    });

    it('viewModel.cost reflects gameState.settings.abilityCost', () => {
      const { result } = renderHook(() => useAbilitiesDialog(createProps()));
      expect(result.current.viewModel.cost).toBe(10);
    });

    it('onBuyAbility calls props.onBuyAbility with the ability name', () => {
      const onBuyAbility = jest.fn();
      const { result } = renderHook(() => useAbilitiesDialog(createProps({ onBuyAbility })));
      const explorer = result.current.viewModel.abilities.find((a) => a.name === AbilityName.Explorer)!;

      act(() => {
        result.current.onBuyAbility(explorer);
      });

      expect(onBuyAbility).toHaveBeenCalledWith(AbilityName.Explorer);
    });

    it('onBuyAbility shows a success toast when props.onBuyAbility does not throw', () => {
      const { result } = renderHook(() => useAbilitiesDialog(createProps()));
      const explorer = result.current.viewModel.abilities.find((a) => a.name === AbilityName.Explorer)!;

      act(() => {
        result.current.onBuyAbility(explorer);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Purchase Successful!' }),
      );
    });

    it('onBuyAbility shows a destructive toast with the thrown Error message', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onBuyAbility = jest.fn(() => {
        throw new Error('Not enough gold');
      });
      const { result } = renderHook(() => useAbilitiesDialog(createProps({ onBuyAbility })));
      const explorer = result.current.viewModel.abilities.find((a) => a.name === AbilityName.Explorer)!;

      act(() => {
        result.current.onBuyAbility(explorer);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Purchase Failed',
          description: 'Not enough gold',
          variant: 'destructive',
        }),
      );
      consoleErrorSpy.mockRestore();
    });

    it('onBuyAbility shows the fallback "Unknown error" message when a non-Error is thrown', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // Exercises the non-Error branch intentionally: production code can only guarantee callers
      // throw, not that they throw an Error instance.
      const onBuyAbility = jest.fn(() => {
        throw 'a plain string';
      });
      const { result } = renderHook(() => useAbilitiesDialog(createProps({ onBuyAbility })));
      const explorer = result.current.viewModel.abilities.find((a) => a.name === AbilityName.Explorer)!;

      act(() => {
        result.current.onBuyAbility(explorer);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Unknown error' }),
      );
      consoleErrorSpy.mockRestore();
    });

    it('onClose forwards to props.onClose', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() => useAbilitiesDialog(createProps({ onClose })));

      result.current.onClose();

      expect(onClose).toHaveBeenCalled();
    });

    it('viewModel updates when the player prop changes', () => {
      const { result, rerender } = renderHook(
        (props: AbilitiesDialogProps) => useAbilitiesDialog(props),
        { initialProps: createProps({ player: playerWhoCanAffordAbilities }) },
      );

      const collectorBefore = result.current.viewModel.abilities.find((a) => a.name === AbilityName.Collector)!;
      expect(collectorBefore.canAfford).toBe(true);

      rerender(createProps({ player: playerWithExplorerAndNoGold }));

      const collectorAfter = result.current.viewModel.abilities.find((a) => a.name === AbilityName.Collector)!;
      expect(collectorAfter.canAfford).toBe(false);
    });
  });
});
