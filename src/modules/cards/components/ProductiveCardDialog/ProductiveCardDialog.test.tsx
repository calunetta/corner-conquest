import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductiveCardDialog } from './ProductiveCardDialog';
import { ResourceType } from '@/lib/types';
import { productiveDialogState } from './ProductiveCardDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('ProductiveCardDialog', () => {
  it('renders null when state is null', () => {
    const { container } = render(<ProductiveCardDialog state={null} onConfirm={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to the "Harvest Normally" label with nothing selected', () => {
    render(<ProductiveCardDialog state={productiveDialogState} onConfirm={jest.fn()} />);
    expect(screen.getByText('Harvest Normally (Skip 2x)')).toBeInTheDocument();
  });

  it('selects an option and updates the confirm label', () => {
    render(<ProductiveCardDialog state={productiveDialogState} onConfirm={jest.fn()} />);

    fireEvent.click(screen.getByTestId(`productive-option-${ResourceType.Food}`));

    expect(screen.getByText('Double Food Harvest')).toBeInTheDocument();
  });

  it('toggles a selection off when the same option is clicked again, reverting to the default label', () => {
    render(<ProductiveCardDialog state={productiveDialogState} onConfirm={jest.fn()} />);

    fireEvent.click(screen.getByTestId(`productive-option-${ResourceType.Food}`));
    expect(screen.getByText('Double Food Harvest')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`productive-option-${ResourceType.Food}`));
    expect(screen.getByText('Harvest Normally (Skip 2x)')).toBeInTheDocument();
  });

  it('calls onConfirm with null when confirming with no selection', () => {
    const onConfirm = jest.fn();
    render(<ProductiveCardDialog state={productiveDialogState} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Harvest Normally (Skip 2x)'));

    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('calls onConfirm with the selected resource', () => {
    const onConfirm = jest.fn();
    render(<ProductiveCardDialog state={productiveDialogState} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId(`productive-option-${ResourceType.Gold}`));
    fireEvent.click(screen.getByText('Double Gold Harvest'));

    expect(onConfirm).toHaveBeenCalledWith(ResourceType.Gold);
  });

  it('has no close control at all (non-dismissible)', () => {
    render(<ProductiveCardDialog state={productiveDialogState} onConfirm={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
});
