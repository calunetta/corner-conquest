import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PositionDialog } from './PositionDialog';
import { singleResource, multipleResources } from './PositionDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('PositionDialog view', () => {
  it('renders a button per resource, with its display name and per-turn amount', () => {
    render(<PositionDialog resources={multipleResources} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Wood')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('+3 / turn')).toBeInTheDocument();
    expect(screen.getByText('+1 / turn')).toBeInTheDocument();
    expect(screen.getByText('+2 / turn')).toBeInTheDocument();
  });

  it('sets data-testid="position-resource-btn-{type}" on each resource button', () => {
    render(<PositionDialog resources={singleResource} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId('position-resource-btn-gold')).toBeInTheDocument();
  });

  it('calls onSelect with the resource type when a resource button is clicked', () => {
    const onSelect = jest.fn();
    render(<PositionDialog resources={singleResource} onSelect={onSelect} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('position-resource-btn-gold'));
    expect(onSelect).toHaveBeenCalledWith('gold');
  });

  it('renders one button per resource plus the Cancel button, and calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<PositionDialog resources={multipleResources} onSelect={jest.fn()} onClose={onClose} />);

    expect(screen.getAllByRole('button')).toHaveLength(multipleResources.length + 1);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders only the Cancel button when there are no resources', () => {
    render(<PositionDialog resources={[]} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('renders each resource button scoped by its own display name (regression for cross-button name collisions)', () => {
    render(<PositionDialog resources={multipleResources} onSelect={jest.fn()} onClose={jest.fn()} />);

    const woodButton = screen.getByTestId('position-resource-btn-wood');
    expect(within(woodButton).getByText('Wood')).toBeInTheDocument();
    expect(within(woodButton).getByText('+1 / turn')).toBeInTheDocument();
  });
});
