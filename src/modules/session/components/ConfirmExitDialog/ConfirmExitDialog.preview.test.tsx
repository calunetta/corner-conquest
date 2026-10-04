import { render, screen, fireEvent } from '@testing-library/react';
import { confirmExitDialogPreview } from './ConfirmExitDialog.preview';

describe('ConfirmExitDialog preview', () => {
  it('renders the default state and closes via the Stay in Game button', () => {
    const defaultState = confirmExitDialogPreview.states[0];
    render(defaultState.render());

    expect(screen.getByText(/Leave Conquest\?/)).toBeInTheDocument();
    expect(screen.getByText(/Leaving will remove your army/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stay in Game' }));

    expect(screen.queryByText(/Leave Conquest\?/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
