import { render, screen, fireEvent } from '@testing-library/react';
import { specialIslandRollDialogPreview } from './SpecialIslandRollDialog.preview';

describe('SpecialIslandRollDialog preview', () => {
  it('renders the not-rolled state with roll button', () => {
    const notRolledState = specialIslandRollDialogPreview.states[0];
    render(notRolledState.render());

    expect(screen.getByText('Special Island Treasure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Roll/ })).toBeInTheDocument();
  });

  it('renders the rolled-with-card state showing the card description', () => {
    const rolledWithCardState = specialIslandRollDialogPreview.states[1];
    render(rolledWithCardState.render());

    expect(screen.getByText('Special Island Treasure')).toBeInTheDocument();
    // The roll result and card name should be displayed
    expect(screen.getByText(/Wealthy/)).toBeInTheDocument();
  });

  it('renders the rolled-without-card state', () => {
    const rolledWithoutCardState = specialIslandRollDialogPreview.states[2];
    render(rolledWithoutCardState.render());

    expect(screen.getByText('Special Island Treasure')).toBeInTheDocument();
  });

  it('closes via the Close button when rolled', () => {
    const state = specialIslandRollDialogPreview.states[1]; // Rolled with card
    render(state.render());

    expect(screen.getByText('Special Island Treasure')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Special Island Treasure')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
