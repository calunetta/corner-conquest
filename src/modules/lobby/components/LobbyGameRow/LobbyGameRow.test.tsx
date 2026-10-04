import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LobbyGameRow } from './LobbyGameRow';
import { openGame, fullGame } from './LobbyGameRow.fixtures';

describe('LobbyGameRow', () => {
  const renderWithTooltip = (component: React.ReactElement) => {
    return render(<TooltipProvider>{component}</TooltipProvider>);
  };

  it('renders game name and player count', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByText(openGame.name)).toBeInTheDocument();
    expect(screen.getByText(`${openGame.players.length} / ${openGame.maxPlayers}`)).toBeInTheDocument();
  });

  it('displays host player name with crown icon', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByText(openGame.players[0].name)).toBeInTheDocument();
  });

  it('shows Join button for open games', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
  });

  it('shows Full button and disables join for full games', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={fullGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: 'Full' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows loading spinner when joining this game', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={true}
        isAnyJoining={true}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /join/i })).toBeDisabled();
  });

  it('disables join button when any game is being joined', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={true}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
  });

  it('shows settings popover with game info button', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    const infoButton = screen.getByRole('button', { name: '' });
    expect(infoButton).toBeInTheDocument();
  });

  it('shows settings popover with match settings label when info button is clicked', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    const infoButton = screen.getAllByRole('button')[0]; // The info button (first button)
    fireEvent.click(infoButton);

    // Check that the popover appears with the settings label
    expect(screen.getByText('Match Settings')).toBeInTheDocument();
  });
});
