import { render, screen, fireEvent } from '@testing-library/react';
import { stealResourceDialogPreview } from './StealResourceDialog.preview';

describe('StealResourceDialog preview', () => {
  it('renders the player selection step and closes via the Cancel button', () => {
    const playerSelectionState = stealResourceDialogPreview.states[0];
    render(playerSelectionState.render());

    expect(screen.getByText(/Infiltrate & Steal/)).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText(/Bo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Infiltrate & Steal/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('renders the resource selection step with all available', () => {
    const resourceAllState = stealResourceDialogPreview.states[1];
    render(resourceAllState.render());

    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.getByText(/Wood/)).toBeInTheDocument();
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
  });

  it('renders the resource selection step with one unavailable', () => {
    const resourceUnavailableState = stealResourceDialogPreview.states[2];
    render(resourceUnavailableState.render());

    expect(screen.getByText(/Bo/)).toBeInTheDocument();
  });

  it('renders the resource selection step with a resource selected', () => {
    const resourceSelectedState = stealResourceDialogPreview.states[3];
    render(resourceSelectedState.render());

    expect(screen.getByText(/Ada/)).toBeInTheDocument();
  });
});
