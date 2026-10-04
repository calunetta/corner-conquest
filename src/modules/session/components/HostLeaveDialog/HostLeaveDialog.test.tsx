import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HostLeaveDialog } from './HostLeaveDialog';
import { inProgressProps, lastPlayerProps, newHostTakesOverProps } from './HostLeaveDialog.fixtures';

describe('HostLeaveDialog view', () => {
  it('shows the in-progress copy when gameStatus is Playing, even if isLastPlayer is true', () => {
    render(<HostLeaveDialog {...inProgressProps} />);

    expect(
      screen.getByText(
        'You are the host. If you leave a game in progress, the game room will be closed, and the match will end for all players.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the dismantle copy when not Playing and isLastPlayer is true', () => {
    render(<HostLeaveDialog {...lastPlayerProps} />);

    expect(
      screen.getByText('You are the only player remaining. If you leave, the game room will be dismantled.'),
    ).toBeInTheDocument();
  });

  it('shows the new-host copy when not Playing and not the last player', () => {
    render(<HostLeaveDialog {...newHostTakesOverProps} />);

    expect(
      screen.getByText('As the host, if you leave now, the next player in line will become the new host.'),
    ).toBeInTheDocument();
  });

  it('renders nothing (dialog closed) when open is false', () => {
    render(<HostLeaveDialog {...newHostTakesOverProps} open={false} />);

    expect(screen.queryByText('Host Departure')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<HostLeaveDialog {...newHostTakesOverProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when "Confirm & Leave" is clicked', () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<HostLeaveDialog {...newHostTakesOverProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /Confirm & Leave/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('always renders the "Host Departure" title regardless of description branch', () => {
    render(<HostLeaveDialog {...inProgressProps} />);
    expect(screen.getByText('Host Departure')).toBeInTheDocument();
  });
});
