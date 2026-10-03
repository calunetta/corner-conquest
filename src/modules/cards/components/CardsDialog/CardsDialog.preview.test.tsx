import { render, screen, fireEvent } from '@testing-library/react';
import { cardsDialogPreview } from './CardsDialog.preview';

describe('CardsDialog preview', () => {
  it('renders the no cards state and closes via the Close button', () => {
    const noCardsState = cardsDialogPreview.states[0];
    render(noCardsState.render());

    expect(screen.getByText(/Special Cards/)).toBeInTheDocument();
    expect(screen.getByText(/currently has no special cards/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText(/Special Cards/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('renders cards when player has cards', () => {
    const withCardsState = cardsDialogPreview.states[1];
    render(withCardsState.render());

    expect(screen.getByText(/Special Cards/)).toBeInTheDocument();
    // Card name is rendered as a title in the card header
    expect(screen.getByText('Steal Resource')).toBeInTheDocument();
  });

  it('shows use button as disabled when canUseCards is false', () => {
    const noUseState = cardsDialogPreview.states[1];
    render(noUseState.render());

    const useButtons = screen.queryAllByRole('button', { name: /Use/ });
    useButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows use button as enabled when canUseCards is true', () => {
    const canUseState = cardsDialogPreview.states[2];
    render(canUseState.render());

    const useButtons = screen.queryAllByRole('button', { name: /Use/ });
    expect(useButtons.length).toBeGreaterThan(0);
    useButtons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });

  it('disables use buttons when an action is already taken this turn', () => {
    const usedState = cardsDialogPreview.states[3];
    render(usedState.render());

    const useButtons = screen.queryAllByRole('button', { name: /Use/ });
    useButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
