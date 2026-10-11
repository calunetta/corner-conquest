import { fireEvent, render, screen } from '@testing-library/react';
import { RejoinMatchPanel } from './RejoinMatchPanel';
import { idleRejoinPanel, reclaimingRejoinPanel } from './RejoinMatchPanel.fixtures';

describe('RejoinMatchPanel', () => {
  it('shows the name of the match the seat belongs to', () => {
    render(<RejoinMatchPanel {...idleRejoinPanel} />);

    expect(screen.getByRole('heading', { name: 'Hollow Shoals' })).toBeInTheDocument();
  });

  it('tells the player that their seat is bot-controlled', () => {
    render(<RejoinMatchPanel {...idleRejoinPanel} />);

    expect(screen.getByText('Your seat is bot-controlled.')).toBeInTheDocument();
  });

  it('enables the Resume Command button when no reclaim is in flight', () => {
    render(<RejoinMatchPanel {...idleRejoinPanel} />);

    expect(screen.getByRole('button', { name: 'Resume Command' })).toBeEnabled();
  });

  it('disables the Resume Command button while a reclaim is in flight', () => {
    render(<RejoinMatchPanel {...reclaimingRejoinPanel} />);

    expect(screen.getByRole('button', { name: 'Resume Command' })).toBeDisabled();
  });

  it('calls onReclaim exactly once when the button is clicked', () => {
    const onReclaim = jest.fn();
    render(<RejoinMatchPanel {...idleRejoinPanel} onReclaim={onReclaim} />);

    fireEvent.click(screen.getByRole('button', { name: 'Resume Command' }));

    expect(onReclaim).toHaveBeenCalledTimes(1);
  });

  it('does not call onReclaim when clicked while a reclaim is in flight', () => {
    const onReclaim = jest.fn();
    render(<RejoinMatchPanel {...reclaimingRejoinPanel} onReclaim={onReclaim} />);

    fireEvent.click(screen.getByRole('button', { name: 'Resume Command' }));

    expect(onReclaim).not.toHaveBeenCalled();
  });
});
