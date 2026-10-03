import { renderHook, act } from '@testing-library/react';
import { useProductiveCardDialog } from './ProductiveCardDialog.hook';
import type { ProductiveCardDialogProps } from './ProductiveCardDialog.types';
import { ResourceType } from '@/lib/types';
import { productiveDialogState } from './ProductiveCardDialog.fixtures';

describe('ProductiveCardDialog.hook', () => {
  describe('useProductiveCardDialog', () => {
    const createProps = (overrides?: Partial<ProductiveCardDialogProps>): ProductiveCardDialogProps => ({
      state: productiveDialogState,
      onConfirm: jest.fn(),
      ...overrides,
    });

    it('viewModel is null when state is null', () => {
      const { result } = renderHook(() => useProductiveCardDialog(createProps({ state: null })));
      expect(result.current.viewModel).toBeNull();
    });

    it('starts with no option selected', () => {
      const { result } = renderHook(() => useProductiveCardDialog(createProps()));
      expect(result.current.viewModel?.options.every((o) => !o.isSelected)).toBe(true);
    });

    it('onSelectResource selects the clicked resource', () => {
      const { result } = renderHook(() => useProductiveCardDialog(createProps()));

      act(() => {
        result.current.onSelectResource(ResourceType.Food);
      });

      const food = result.current.viewModel?.options.find((o) => o.resource === ResourceType.Food);
      expect(food?.isSelected).toBe(true);
    });

    it('onSelectResource toggles the same resource back off', () => {
      const { result } = renderHook(() => useProductiveCardDialog(createProps()));

      act(() => {
        result.current.onSelectResource(ResourceType.Food);
      });
      act(() => {
        result.current.onSelectResource(ResourceType.Food);
      });

      expect(result.current.viewModel?.options.every((o) => !o.isSelected)).toBe(true);
    });

    it('onConfirm calls props.onConfirm with the current selection', () => {
      const onConfirm = jest.fn();
      const { result } = renderHook(() => useProductiveCardDialog(createProps({ onConfirm })));

      act(() => {
        result.current.onSelectResource(ResourceType.Gold);
      });
      act(() => {
        result.current.onConfirm();
      });

      expect(onConfirm).toHaveBeenCalledWith(ResourceType.Gold);
    });

    it('onConfirm calls props.onConfirm with null when nothing is selected', () => {
      const onConfirm = jest.fn();
      const { result } = renderHook(() => useProductiveCardDialog(createProps({ onConfirm })));

      act(() => {
        result.current.onConfirm();
      });

      expect(onConfirm).toHaveBeenCalledWith(null);
    });
  });
});
