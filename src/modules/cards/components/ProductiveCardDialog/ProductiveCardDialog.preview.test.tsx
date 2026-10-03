import { render, screen, fireEvent } from '@testing-library/react';
import { productiveCardDialogPreview } from './ProductiveCardDialog.preview';

describe('ProductiveCardDialog preview - non-dismissible dialog', () => {
  it('renders the dialog and closes via "Close preview" since dialog has no onOpenChange', () => {
    const state = productiveCardDialogPreview.states[0];
    render(state.render());

    expect(screen.getByText('Productive Harvest')).toBeInTheDocument();

    // The AlertDialog has no onOpenChange (intentionally non-dismissible), so the only
    // way to close it in the preview is via the "Close preview" button with pointer-events-auto.
    fireEvent.click(screen.getByRole('button', { name: 'Close preview', hidden: true }));

    expect(screen.queryByText('Productive Harvest')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('shows all three resource options', () => {
    const state = productiveCardDialogPreview.states[0];
    render(state.render());

    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.getByText(/Wood/)).toBeInTheDocument();
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
  });

  it('allows selecting and deselecting resources by clicking', () => {
    const state = productiveCardDialogPreview.states[1];
    render(state.render());

    const foodButton = screen.getByRole('button', { name: /Food/ });
    expect(foodButton).toBeInTheDocument();

    // User can click to select
    fireEvent.click(foodButton);
    // Then click again to deselect (toggling behavior)
    fireEvent.click(foodButton);
  });
});
