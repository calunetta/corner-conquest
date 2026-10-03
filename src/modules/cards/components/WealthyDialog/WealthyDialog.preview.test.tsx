import { render, screen, fireEvent } from '@testing-library/react';
import { wealthyDialogPreview } from './WealthyDialog.preview';

describe('WealthyDialog preview', () => {
  it('renders the all resources state and closes via the Cancel button', () => {
    const resourcesState = wealthyDialogPreview.states[0];
    render(resourcesState.render());

    expect(screen.getByText(/Royal Wealth Bounty/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Royal Wealth Bounty/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
