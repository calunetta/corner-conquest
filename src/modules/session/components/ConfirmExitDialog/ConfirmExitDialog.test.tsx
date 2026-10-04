import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmExitDialog } from './ConfirmExitDialog';

describe('ConfirmExitDialog view', () => {
  it('renders the static title and body copy', () => {
    render(<ConfirmExitDialog onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Leave Conquest?')).toBeInTheDocument();
    expect(
      screen.getByText('Leaving will remove your army from this active match. This action cannot be undone.'),
    ).toBeInTheDocument();
  });

  it('calls onClose when "Stay in Game" is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmExitDialog onConfirm={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stay in Game' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when "Leave Match" is clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmExitDialog onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Leave Match/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders exactly two buttons', () => {
    render(<ConfirmExitDialog onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('does not call onConfirm when "Stay in Game" is clicked, and vice versa', () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(<ConfirmExitDialog onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stay in Game' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
