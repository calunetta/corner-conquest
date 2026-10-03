import { renderHook, act } from '@testing-library/react';
import { useCombatDialog } from './CombatDialog.hook';
import type { CombatDialogProps } from './CombatDialog.types';
import {
  rollingPhaseAttackerNoCards,
  rollingPhaseAttackerBothCards,
  rollingPhaseSpectator,
  resultsPhaseAttackerWins,
} from './CombatDialog.fixtures';

describe('CombatDialog.hook', () => {
  describe('useCombatDialog', () => {
    const createProps = (overrides?: Partial<CombatDialogProps>): CombatDialogProps => ({
      gameState: rollingPhaseAttackerNoCards,
      onRoll: jest.fn(),
      onClose: jest.fn(),
      isMyTurn: true,
      localPlayerId: 0,
      ...overrides,
    });

    describe('initial state', () => {
      it('initializes selectedCard to "none"', () => {
        const props = createProps();
        const { result } = renderHook(() => useCombatDialog(props));
        expect(result.current.selectedCard).toBe('none');
      });

      it('initializes isRolling to false', () => {
        const props = createProps();
        const { result } = renderHook(() => useCombatDialog(props));
        expect(result.current.isRolling).toBe(false);
      });
    });

    describe('onSelectCard', () => {
      it('updates selectedCard to "overcome"', () => {
        const props = createProps();
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onSelectCard('overcome');
        });

        expect(result.current.selectedCard).toBe('overcome');
      });

      it('updates selectedCard to "warchief"', () => {
        const props = createProps();
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onSelectCard('warchief');
        });

        expect(result.current.selectedCard).toBe('warchief');
      });

      it('updates selectedCard back to "none"', () => {
        const props = createProps();
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onSelectCard('overcome');
        });
        expect(result.current.selectedCard).toBe('overcome');

        act(() => {
          result.current.onSelectCard('none');
        });
        expect(result.current.selectedCard).toBe('none');
      });
    });

    describe('onRollClick', () => {
      it('sets isRolling to true', () => {
        const props = createProps();
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onRollClick();
        });

        expect(result.current.isRolling).toBe(true);
      });

      it('calls props.onRoll with useWarChief=false and useOvercome=false when selectedCard is "none"', () => {
        const mockOnRoll = jest.fn();
        const props = createProps({ onRoll: mockOnRoll });
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onRollClick();
        });

        expect(mockOnRoll).toHaveBeenCalledWith({
          useWarChief: false,
          useOvercome: false,
        });
      });

      it('calls props.onRoll with useWarChief=false and useOvercome=true when selectedCard is "overcome"', () => {
        const mockOnRoll = jest.fn();
        const props = createProps({ onRoll: mockOnRoll });
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onSelectCard('overcome');
        });

        act(() => {
          result.current.onRollClick();
        });

        expect(mockOnRoll).toHaveBeenCalledWith({
          useWarChief: false,
          useOvercome: true,
        });
      });

      it('calls props.onRoll with useWarChief=true and useOvercome=false when selectedCard is "warchief"', () => {
        const mockOnRoll = jest.fn();
        const props = createProps({ onRoll: mockOnRoll });
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onSelectCard('warchief');
        });

        act(() => {
          result.current.onRollClick();
        });

        expect(mockOnRoll).toHaveBeenCalledWith({
          useWarChief: true,
          useOvercome: false,
        });
      });
    });

    describe('onClose', () => {
      it('calls props.onClose', () => {
        const mockOnClose = jest.fn();
        const props = createProps({ onClose: mockOnClose });
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onClose();
        });

        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    describe('viewModel', () => {
      it('returns a valid viewModel when gameState has combatState', () => {
        const props = createProps({ gameState: rollingPhaseAttackerBothCards });
        const { result } = renderHook(() => useCombatDialog(props));

        expect(result.current.viewModel).not.toBeNull();
        expect(result.current.viewModel?.phase).toBe('rolling');
        expect(result.current.viewModel?.attacker.name).toBe('Alice');
      });

      it('returns null viewModel when gameState has no combatState', () => {
        const gameStateNoCombat = {
          ...rollingPhaseAttackerNoCards,
          combatState: null,
        };
        const props = createProps({ gameState: gameStateNoCombat });
        const { result } = renderHook(() => useCombatDialog(props));

        expect(result.current.viewModel).toBeNull();
      });

      it('onRollClick does not throw when viewModel is null', () => {
        const gameStateNoCombat = {
          ...rollingPhaseAttackerNoCards,
          combatState: null,
        };
        const mockOnRoll = jest.fn();
        const props = createProps({
          gameState: gameStateNoCombat,
          onRoll: mockOnRoll,
        });
        const { result } = renderHook(() => useCombatDialog(props));

        expect(() => {
          act(() => {
            result.current.onRollClick();
          });
        }).not.toThrow();

        // Should still call onRoll with the selected card flags
        expect(mockOnRoll).toHaveBeenCalledWith({
          useWarChief: false,
          useOvercome: false,
        });
      });
    });

    describe('state updates reflect prop changes', () => {
      it('updates viewModel when gameState changes', () => {
        const props1 = createProps({ gameState: rollingPhaseAttackerNoCards });
        const { result, rerender } = renderHook(
          (p) => useCombatDialog(p),
          { initialProps: props1 }
        );

        expect(result.current.viewModel?.hasOvercomeCard).toBe(false);
        expect(result.current.viewModel?.hasWarChiefCard).toBe(false);

        const props2 = createProps({ gameState: rollingPhaseAttackerBothCards });
        rerender(props2);

        expect(result.current.viewModel?.hasOvercomeCard).toBe(true);
        expect(result.current.viewModel?.hasWarChiefCard).toBe(true);
      });

      it('updates canPerformAction when isMyTurn changes', () => {
        const props1 = createProps({
          gameState: rollingPhaseAttackerBothCards,
          isMyTurn: true,
        });
        const { result, rerender } = renderHook(
          (p) => useCombatDialog(p),
          { initialProps: props1 }
        );

        expect(result.current.viewModel?.canPerformAction).toBe(true);

        const props2 = createProps({
          gameState: rollingPhaseAttackerBothCards,
          isMyTurn: false,
        });
        rerender(props2);

        expect(result.current.viewModel?.canPerformAction).toBe(false);
      });

      it('updates canPerformAction when localPlayerId changes', () => {
        const props1 = createProps({
          gameState: rollingPhaseAttackerBothCards,
          localPlayerId: 0,
        });
        const { result, rerender } = renderHook(
          (p) => useCombatDialog(p),
          { initialProps: props1 }
        );

        expect(result.current.viewModel?.canPerformAction).toBe(true);

        const props2 = createProps({
          gameState: rollingPhaseAttackerBothCards,
          localPlayerId: 1,
        });
        rerender(props2);

        expect(result.current.viewModel?.canPerformAction).toBe(false);
      });
    });

    describe('multiple onRoll calls', () => {
      it('can call onRoll multiple times with different cards', () => {
        const mockOnRoll = jest.fn();
        const props = createProps({ onRoll: mockOnRoll });
        const { result } = renderHook(() => useCombatDialog(props));

        act(() => {
          result.current.onSelectCard('overcome');
        });

        act(() => {
          result.current.onRollClick();
        });

        expect(mockOnRoll).toHaveBeenLastCalledWith({
          useWarChief: false,
          useOvercome: true,
        });

        act(() => {
          result.current.onSelectCard('warchief');
        });

        act(() => {
          result.current.onRollClick();
        });

        expect(mockOnRoll).toHaveBeenLastCalledWith({
          useWarChief: true,
          useOvercome: false,
        });

        expect(mockOnRoll).toHaveBeenCalledTimes(2);
      });
    });

    describe('phase changes', () => {
      it('reflects phase change in viewModel', () => {
        const props1 = createProps({
          gameState: rollingPhaseAttackerNoCards,
        });
        const { result, rerender } = renderHook(
          (p) => useCombatDialog(p),
          { initialProps: props1 }
        );

        expect(result.current.viewModel?.phase).toBe('rolling');
        expect(result.current.viewModel?.isCombatOver).toBe(false);

        const props2 = createProps({
          gameState: resultsPhaseAttackerWins,
        });
        rerender(props2);

        expect(result.current.viewModel?.phase).toBe('results');
        expect(result.current.viewModel?.isCombatOver).toBe(true);
      });
    });

    describe('spectator perspective', () => {
      it('correctly sets canPerformAction to false for spectator', () => {
        const props = createProps({
          gameState: rollingPhaseSpectator,
          localPlayerId: 1, // defender/spectator
          isMyTurn: true,
        });
        const { result } = renderHook(() => useCombatDialog(props));

        expect(result.current.viewModel?.canPerformAction).toBe(false);
      });

      it('canSelectCard is false for spectator even with both cards available', () => {
        const props = createProps({
          gameState: rollingPhaseAttackerBothCards,
          localPlayerId: 1, // spectator
          isMyTurn: true,
        });
        const { result } = renderHook(() => useCombatDialog(props));

        expect(result.current.viewModel?.canSelectCard).toBe(false);
      });
    });
  });
});
