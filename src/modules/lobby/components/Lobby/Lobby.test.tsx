import { render, screen } from '@testing-library/react';
import { LobbyView } from './Lobby';
import { emptyLobby, loadingLobby, lobbyWithOpenGames } from './Lobby.fixtures';

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
});
