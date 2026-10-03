import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WealthyDialog } from './WealthyDialog';
import { ResourceType } from '@/lib/types';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('WealthyDialog', () => {
  it('renders all 3 resources in Food, Wood, Gold order with their testids', () => {
    render(<WealthyDialog onSelectResource={jest.fn()} onClose={jest.fn()} />);

    const buttons = screen.getAllByRole('button').filter((button) => button.dataset.testid?.startsWith('wealthy-resource-'));
    expect(buttons.map((button) => button.dataset.testid)).toEqual([
      'wealthy-resource-food',
      'wealthy-resource-wood',
      'wealthy-resource-gold',
    ]);
  });

  it('calls onSelectResource with the clicked resource', () => {
    const onSelectResource = jest.fn();

    render(<WealthyDialog onSelectResource={onSelectResource} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('wealthy-resource-food'));

    expect(onSelectResource).toHaveBeenCalledWith(ResourceType.Food);
    expect(onSelectResource).toHaveBeenCalledTimes(1);
  });

  it('is stateless: clicking a second resource does not undo the first, both calls fire independently', () => {
    const onSelectResource = jest.fn();

    render(<WealthyDialog onSelectResource={onSelectResource} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('wealthy-resource-gold'));
    fireEvent.click(screen.getByTestId('wealthy-resource-wood'));

    expect(onSelectResource).toHaveBeenNthCalledWith(1, ResourceType.Gold);
    expect(onSelectResource).toHaveBeenNthCalledWith(2, ResourceType.Wood);
    expect(onSelectResource).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();

    render(<WealthyDialog onSelectResource={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
