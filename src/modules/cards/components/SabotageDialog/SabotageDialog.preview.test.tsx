import { render, screen, fireEvent } from '@testing-library/react';
import { sabotageDialogPreview } from './SabotageDialog.preview';

describe('SabotageDialog preview', () => {
  it('renders the two opponents state and closes via the Cancel button', () => {
    const twoOpponentsState = sabotageDialogPreview.states[0];
    render(twoOpponentsState.render());

    expect(screen.getByText(/Sabotage Opponent/)).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText(/Bo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Sabotage Opponent/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('renders all three opponents in the full grid state', () => {
    const fullGridState = sabotageDialogPreview.states[1];
    render(fullGridState.render());

    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText(/Bo/)).toBeInTheDocument();
    expect(screen.getByText(/Cy/)).toBeInTheDocument();
  });
});
