import { render, screen } from '@testing-library/react';
import { GameStatusBadgeView } from './GameStatusBadge';
import {
  waitingViewModel,
  playingMyTurnNotExpiringViewModel,
  playingMyTurnExpiringViewModel,
  playingOpponentTurnViewModel,
} from './GameStatusBadge.fixtures';

describe('GameStatusBadgeView', () => {
  describe('waiting state', () => {
    it('shows waiting message with player count', () => {
      render(<GameStatusBadgeView {...waitingViewModel} />);

      expect(screen.getByText(/Waiting for players \(2\/4\)/)).toBeInTheDocument();
    });

    it('does not show turn label when waiting', () => {
      render(<GameStatusBadgeView {...waitingViewModel} />);

      expect(screen.queryByText(/Your Turn|Alice's Turn|Player's Turn/)).not.toBeInTheDocument();
    });

    it('does not show countdown badge when waiting', () => {
      render(<GameStatusBadgeView {...waitingViewModel} />);

      expect(screen.queryByTestId('turn-countdown-timer')).not.toBeInTheDocument();
    });
  });

  describe('playing state - my turn', () => {
    it('shows "Your Turn" label', () => {
      render(<GameStatusBadgeView {...playingMyTurnNotExpiringViewModel} />);

      expect(screen.getByText('Your Turn')).toBeInTheDocument();
    });

    it('shows countdown badge', () => {
      render(<GameStatusBadgeView {...playingMyTurnNotExpiringViewModel} />);

      expect(screen.getByTestId('turn-countdown-timer')).toBeInTheDocument();
      expect(screen.getByText('02:30')).toBeInTheDocument();
    });

    it('applies primary styling when not expiring', () => {
      render(<GameStatusBadgeView {...playingMyTurnNotExpiringViewModel} />);

      const badge = screen.getByTestId('turn-countdown-timer');
      expect(badge).toHaveClass('bg-primary/20');
      expect(badge).toHaveClass('border-primary/40');
      expect(badge).toHaveClass('text-primary');
    });

    it('applies destructive styling when expiring', () => {
      render(<GameStatusBadgeView {...playingMyTurnExpiringViewModel} />);

      const badge = screen.getByTestId('turn-countdown-timer');
      expect(badge).toHaveClass('bg-destructive/20');
      expect(badge).toHaveClass('border-destructive');
      expect(badge).toHaveClass('text-destructive');
      expect(badge).toHaveClass('animate-pulse');
    });
  });

  describe('playing state - opponent turn', () => {
    it('shows opponent turn label', () => {
      render(<GameStatusBadgeView {...playingOpponentTurnViewModel} />);

      expect(screen.getByText("Alice's Turn")).toBeInTheDocument();
    });

    it('does not show countdown badge', () => {
      render(<GameStatusBadgeView {...playingOpponentTurnViewModel} />);

      expect(screen.queryByTestId('turn-countdown-timer')).not.toBeInTheDocument();
    });

    it('does not show countdown time', () => {
      render(<GameStatusBadgeView {...playingOpponentTurnViewModel} />);

      expect(screen.queryByText('02:30')).not.toBeInTheDocument();
    });
  });
});
