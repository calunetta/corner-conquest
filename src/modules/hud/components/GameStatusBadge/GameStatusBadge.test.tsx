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

    it('shows countdown badge with formatted time when not expiring', () => {
      render(<GameStatusBadgeView {...playingMyTurnNotExpiringViewModel} />);

      expect(screen.getByTestId('turn-countdown-timer')).toBeInTheDocument();
      expect(screen.getByText('02:30')).toBeInTheDocument();
    });

    it('shows countdown badge with formatted time when expiring', () => {
      render(<GameStatusBadgeView {...playingMyTurnExpiringViewModel} />);

      expect(screen.getByTestId('turn-countdown-timer')).toBeInTheDocument();
      expect(screen.getByText('00:05')).toBeInTheDocument();
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
