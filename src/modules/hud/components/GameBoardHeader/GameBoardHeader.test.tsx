import { render, screen, fireEvent } from '@testing-library/react';
import { GameBoardHeaderView } from './GameBoardHeader';
import {
  waitingCanStartProps,
  waitingCannotStartProps,
  playingMyTurnNotExpiringProps,
  playingMyTurnExpiringProps,
  playingOpponentTurnProps,
  exitingProps,
} from './GameBoardHeader.fixtures';

describe('GameBoardHeaderView', () => {
  it('displays the game name', () => {
    render(<GameBoardHeaderView {...waitingCanStartProps} />);

    expect(screen.getByRole('heading', { name: 'Island Quest' })).toBeInTheDocument();
  });

  describe('start game button', () => {
    it('shows when canStartGame is true', () => {
      render(<GameBoardHeaderView {...waitingCanStartProps} />);

      expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument();
    });

    it('does not show when canStartGame is false', () => {
      render(<GameBoardHeaderView {...waitingCannotStartProps} />);

      expect(screen.queryByRole('button', { name: /Start Game/i })).not.toBeInTheDocument();
    });

    it('calls onStartGame when clicked', async () => {
      const onStartGame = jest.fn();

      render(<GameBoardHeaderView {...{ ...waitingCanStartProps, onStartGame }} />);

      fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));

      expect(onStartGame).toHaveBeenCalled();
    });
  });

  describe('VP goal badge', () => {
    it('shows when isPlaying is true', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      expect(screen.getByText(/VP Goal: 30/)).toBeInTheDocument();
    });

    it('does not show when isPlaying is false', () => {
      render(<GameBoardHeaderView {...waitingCanStartProps} />);

      expect(screen.queryByText(/VP Goal:/)).not.toBeInTheDocument();
    });
  });

  describe('turn indicator', () => {
    it('shows when isPlaying is true', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('does not show when isPlaying is false', () => {
      render(<GameBoardHeaderView {...waitingCanStartProps} />);

      expect(screen.queryByText('Turn:')).not.toBeInTheDocument();
    });

    it('displays current player name', () => {
      render(<GameBoardHeaderView {...playingOpponentTurnProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('countdown timer', () => {
    it('shows when isMyTurn is true', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      expect(screen.getByText(/02:30/)).toBeInTheDocument();
    });

    it('does not show when isMyTurn is false', () => {
      render(<GameBoardHeaderView {...playingOpponentTurnProps} />);

      expect(screen.queryByText(/02:30/)).not.toBeInTheDocument();
    });

    it('shows countdown with correct time when expiring', () => {
      render(<GameBoardHeaderView {...playingMyTurnExpiringProps} />);

      expect(screen.getByText(/00:05/)).toBeInTheDocument();
    });

    it('shows countdown with correct time when not expiring', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      expect(screen.getByText(/02:30/)).toBeInTheDocument();
    });
  });

  describe('exit button', () => {
    it('is enabled when isExiting is false', () => {
      render(<GameBoardHeaderView {...waitingCanStartProps} />);

      expect(screen.getByTestId('gameboard-exit-btn')).not.toBeDisabled();
    });

    it('is disabled when isExiting is true', () => {
      render(<GameBoardHeaderView {...exitingProps} />);

      expect(screen.getByTestId('gameboard-exit-btn')).toBeDisabled();
    });

    it('shows spinner when exiting', () => {
      render(<GameBoardHeaderView {...exitingProps} />);

      const button = screen.getByTestId('gameboard-exit-btn');
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('calls onExitClick when clicked', async () => {
      const onExitClick = jest.fn();

      render(<GameBoardHeaderView {...{ ...waitingCanStartProps, onExitClick }} />);

      fireEvent.click(screen.getByTestId('gameboard-exit-btn'));

      expect(onExitClick).toHaveBeenCalled();
    });
  });
});
