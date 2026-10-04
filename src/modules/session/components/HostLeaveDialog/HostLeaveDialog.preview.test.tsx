import { render, screen, fireEvent } from '@testing-library/react';
import { hostLeaveDialogPreview } from './HostLeaveDialog.preview';

describe('HostLeaveDialog preview', () => {
  it('renders the in-progress game state and closes via the Cancel button', () => {
    const inProgressState = hostLeaveDialogPreview.states[0];
    render(inProgressState.render());

    expect(screen.getByText(/Host Departure/)).toBeInTheDocument();
    expect(screen.getByText(/game room will be closed/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Host Departure/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('renders the last player remaining state', () => {
    const lastPlayerState = hostLeaveDialogPreview.states[1];
    render(lastPlayerState.render());

    expect(screen.getByText(/Host Departure/)).toBeInTheDocument();
    expect(screen.getByText(/only player remaining/)).toBeInTheDocument();
  });

  it('renders the mid-lobby new host state', () => {
    const midLobbyState = hostLeaveDialogPreview.states[2];
    render(midLobbyState.render());

    expect(screen.getByText(/Host Departure/)).toBeInTheDocument();
    expect(screen.getByText(/next player in line/)).toBeInTheDocument();
  });
});
