import { fireEvent, render, screen } from '@testing-library/react';
import { LobbyView } from './Lobby';
import { emptyLobby, loadingLobby, lobbyWithOpenGames, lobbyWithVacantSeat } from './Lobby.fixtures';
import { styles } from './Lobby.styles';

describe('LobbyView', () => {
  it('renders the header with title and player greeting', () => {
    render(<LobbyView {...emptyLobby} />);

    expect(screen.getByText('Game Lobby')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Ada!')).toBeInTheDocument();
  });

  it('shows loading state with spinner and message', () => {
    render(<LobbyView {...loadingLobby} />);

    expect(screen.getByText('Scanning tactical channels for open games...')).toBeInTheDocument();
  });

  it('shows empty state when no games are available', () => {
    render(<LobbyView {...emptyLobby} />);

    expect(screen.getByText('No open matches currently waiting.')).toBeInTheDocument();
    expect(screen.getByText(/Be the first commander to launch a match/)).toBeInTheDocument();
  });

  it('renders open games list when games are available', () => {
    render(<LobbyView {...lobbyWithOpenGames} />);

    expect(screen.getByText("Ada's Archipelago")).toBeInTheDocument();
    expect(screen.getByText("Rex's Grand Conquest")).toBeInTheDocument();
  });

  it('displays correct room count in badge', () => {
    render(<LobbyView {...lobbyWithOpenGames} />);

    expect(screen.getByText('2 Open Rooms')).toBeInTheDocument();
  });

  it('displays singular "Open Room" for one game', () => {
    const oneGame = { ...lobbyWithOpenGames, games: lobbyWithOpenGames.games.slice(0, 1) };
    render(<LobbyView {...oneGame} />);

    expect(screen.getByText('1 Open Room')).toBeInTheDocument();
  });

  it('shows logout button', () => {
    render(<LobbyView {...emptyLobby} />);

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = jest.fn();
    const model = { ...emptyLobby, onLogout };
    render(<LobbyView {...model} />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    logoutButton.click();

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders create game button', () => {
    render(<LobbyView {...emptyLobby} />);

    expect(screen.getByRole('button', { name: /create new game/i })).toBeInTheDocument();
  });

  describe('when the player still holds a seat in a match', () => {
    it('shows the rejoin panel with the match name', () => {
      render(<LobbyView {...lobbyWithVacantSeat} />);

      expect(screen.getByRole('heading', { name: 'Hollow Shoals' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Resume Command' })).toBeEnabled();
    });

    it('hides the create/join UI and the list of open games', () => {
      render(<LobbyView {...lobbyWithVacantSeat} />);

      expect(screen.queryByRole('button', { name: /create new game/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Active Conquest Rooms')).not.toBeInTheDocument();
      expect(screen.queryByText("Ada's Archipelago")).not.toBeInTheDocument();
    });

    it('keeps the Create Game dialog closed even when it was requested open', () => {
      render(<LobbyView {...lobbyWithVacantSeat} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onReclaimSeat once when Resume Command is clicked', () => {
      const onReclaimSeat = jest.fn().mockResolvedValue(undefined);
      render(<LobbyView {...lobbyWithVacantSeat} onReclaimSeat={onReclaimSeat} />);

      fireEvent.click(screen.getByRole('button', { name: 'Resume Command' }));

      expect(onReclaimSeat).toHaveBeenCalledTimes(1);
    });
  });

  describe('root stacking context (z-index regression)', () => {
    it('root has explicit z-index utility class to establish stacking context', () => {
      expect(styles.root).toMatch(/\bz-\d+/);
    });

    it('root uses relative positioning', () => {
      expect(styles.root).toMatch(/relative/);
    });
  });
});
