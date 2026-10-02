import { render, screen, fireEvent } from '@testing-library/react';
import { sabotageDialogPreview } from './SabotageDialog.preview';

describe('SabotageDialog preview - stuck modal bug reproduction', () => {
  it('dialog closes when clicking the Cancel button', () => {
    // Render the "Two opponents (interactive)" state from the preview
    const twoOpponentsState = sabotageDialogPreview.states[0];
    render(twoOpponentsState.render());

    // Verify the dialog is initially visible
    expect(screen.getByText('Sabotage Opponent')).toBeInTheDocument();
    const description = screen.getByText(
      'Target an opponent commander. Their entire army will be forced to skip their next turn.'
    );
    expect(description).toBeInTheDocument();

    // Locate and click the Cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // After the fix, the dialog should close
    expect(screen.queryByText('Sabotage Opponent')).not.toBeInTheDocument();
    expect(screen.queryByText(
      'Target an opponent commander. Their entire army will be forced to skip their next turn.'
    )).not.toBeInTheDocument();

    // The reopen button should now be visible
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('clicking a player button closes the dialog', () => {
    // Render the "Two opponents (interactive)" state
    const twoOpponentsState = sabotageDialogPreview.states[0];
    render(twoOpponentsState.render());

    // Verify the dialog is visible
    expect(screen.getByText('Sabotage Opponent')).toBeInTheDocument();

    // Try to sabotage the first player (Red Player)
    const redPlayerButton = screen.getByRole('button', { name: /Red Player/i });
    fireEvent.click(redPlayerButton);

    // After the fix, the dialog should close
    expect(screen.queryByText('Sabotage Opponent')).not.toBeInTheDocument();

    // The reopen button should now be visible
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('renders all four opponents correctly in the full grid state', () => {
    // Render the "Full grid (4 opponents)" state
    const fullGridState = sabotageDialogPreview.states[1];
    render(fullGridState.render());

    // Verify the dialog is visible
    expect(screen.getByText('Sabotage Opponent')).toBeInTheDocument();

    // Verify all four players are rendered as buttons
    expect(screen.getByRole('button', { name: /Red/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Purple/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yellow/i })).toBeInTheDocument();
  });

  it('the full grid state also closes on Cancel, not just the first state', () => {
    const fullGridState = sabotageDialogPreview.states[1];
    render(fullGridState.render());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Sabotage Opponent')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('the long-name-truncation state also closes on Cancel', () => {
    const longNameState = sabotageDialogPreview.states[2];
    render(longNameState.render());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Sabotage Opponent')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
