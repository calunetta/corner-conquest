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

  it('shows the victory point goal badge without opening the settings popover', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByText('30 VP')).toBeInTheDocument();
    expect(screen.queryByText('Match Settings')).not.toBeInTheDocument();
  });

  it('shows the victory point goal badge on a full room row too', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={fullGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByText('30 VP')).toBeInTheDocument();
  });

  it('places the victory point goal badge after the player-count chip', () => {
    renderWithTooltip(
      <LobbyGameRow
        game={openGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    const playerCount = screen.getByText(`${openGame.players.length} / ${openGame.maxPlayers}`);
    const vpBadge = screen.getByText('30 VP');
    expect(playerCount.compareDocumentPosition(vpBadge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the game own victory point goal, not the default, in the badge', () => {
    const customGoalGame = {
      ...openGame,
      settings: { ...openGame.settings, victoryPointGoal: 45 },
    };
    renderWithTooltip(
      <LobbyGameRow
        game={customGoalGame}
        isJoining={false}
        isAnyJoining={false}
        onJoin={() => {}}
      />,
    );

    expect(screen.getByText('45 VP')).toBeInTheDocument();
    expect(screen.queryByText('30 VP')).not.toBeInTheDocument();
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

  it('disables the join button while this game is being joined', () => {
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
