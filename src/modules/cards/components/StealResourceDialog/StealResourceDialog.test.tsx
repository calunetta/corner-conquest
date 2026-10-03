import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StealResourceDialog } from './StealResourceDialog';
import { stealTargets } from './StealResourceDialog.fixtures';
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

describe('StealResourceDialog', () => {
  it('starts on the player-selection step, showing each target with their total resources', () => {
    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('10 total resources')).toBeInTheDocument(); // Ada: 3+2+5
    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('4 total resources')).toBeInTheDocument(); // Bo: 0+4+0
    expect(screen.queryByTestId('steal-resource-food')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked on the player-selection step', () => {
    const onClose = jest.fn();

    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selecting a player moves to the resource step, titled with that player name', () => {
    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('steal-target-player-0'));

    expect(screen.getByText('Steal from Ada')).toBeInTheDocument();
    expect(screen.queryByTestId('steal-target-player-1')).not.toBeInTheDocument();
  });

  it('disables a resource button whose available amount is 0', () => {
    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('steal-target-player-1')); // Bo: food 0, wood 4, gold 0

    expect(screen.getByTestId('steal-resource-food')).toBeDisabled();
    expect(screen.getByTestId('steal-resource-wood')).not.toBeDisabled();
    expect(screen.getByTestId('steal-resource-gold')).toBeDisabled();
  });

  it('the confirm button is disabled until a resource is selected, then enables and labels the picked resource', () => {
    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('steal-target-player-0'));
    expect(screen.getByText('Steal 2 Resources')).toBeDisabled();

    fireEvent.click(screen.getByTestId('steal-resource-gold'));
    expect(screen.getByText('Steal 2 Gold')).not.toBeDisabled();
  });

  it('toggling between resource selections updates the confirm label to the latest pick', () => {
    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('steal-target-player-0'));

    fireEvent.click(screen.getByTestId('steal-resource-gold'));
    expect(screen.getByText('Steal 2 Gold')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('steal-resource-wood'));
    expect(screen.getByText('Steal 2 Wood')).toBeInTheDocument();
    expect(screen.queryByText('Steal 2 Gold')).not.toBeInTheDocument();
  });

  it('calls onSteal with the selected player id and resource when confirmed', () => {
    const onSteal = jest.fn();

    render(<StealResourceDialog players={stealTargets} onSteal={onSteal} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('steal-target-player-1'));
    fireEvent.click(screen.getByTestId('steal-resource-wood'));
    fireEvent.click(screen.getByText('Steal 2 Wood'));

    expect(onSteal).toHaveBeenCalledWith(1, ResourceType.Wood);
    expect(onSteal).toHaveBeenCalledTimes(1);
  });

  it('clicking Back returns to the player-selection step and clears the resource selection', () => {
    render(<StealResourceDialog players={stealTargets} onSteal={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('steal-target-player-0'));
    fireEvent.click(screen.getByTestId('steal-resource-gold'));

    fireEvent.click(screen.getByText(/Back/));

    expect(screen.getByTestId('steal-target-player-0')).toBeInTheDocument();
    expect(screen.queryByTestId('steal-resource-gold')).not.toBeInTheDocument();

    // Re-entering the resource step for the same player shows no selection carried over.
    fireEvent.click(screen.getByTestId('steal-target-player-0'));
    expect(screen.getByText('Steal 2 Resources')).toBeDisabled();
  });
});
