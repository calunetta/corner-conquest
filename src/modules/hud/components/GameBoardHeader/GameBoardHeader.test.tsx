import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ResourceType } from '@/lib/types';
import { GameBoardHeaderView } from './GameBoardHeader';
import {
  waitingCanStartProps,
  waitingCannotStartProps,
  playingMyTurnNotExpiringProps,
  playingMyTurnExpiringProps,
  playingOpponentTurnProps,
  exitingProps,
} from './GameBoardHeader.fixtures';

// Mock next/image like resource-icon.test.tsx does, so the icon renders as a plain <img> with its alt text.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

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

  describe('resource strip', () => {
    it('shows when isPlaying is true', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      expect(screen.getByTestId('gameboard-resource-strip')).toBeInTheDocument();
    });

    it('does not show when isPlaying is false', () => {
      render(<GameBoardHeaderView {...waitingCanStartProps} />);

      expect(screen.queryByTestId('gameboard-resource-strip')).not.toBeInTheDocument();
    });

    it('renders one icon and value pair per resource, in food, wood, gold order', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      const strip = screen.getByTestId('gameboard-resource-strip');
      expect(strip.children).toHaveLength(3);
      expect(within(strip).getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual(['Food', 'Wood', 'Gold']);
    });

    it('shows the local player value next to each resource icon', () => {
      render(<GameBoardHeaderView {...playingMyTurnNotExpiringProps} />);

      const [foodPair, woodPair, goldPair] = Array.from(screen.getByTestId('gameboard-resource-strip').children) as HTMLElement[];
      expect(within(foodPair).getByRole('img', { name: 'Food' })).toBeInTheDocument();
      expect(within(foodPair).getByText('4')).toBeInTheDocument();
      expect(within(woodPair).getByRole('img', { name: 'Wood' })).toBeInTheDocument();
      expect(within(woodPair).getByText('2')).toBeInTheDocument();
      expect(within(goldPair).getByRole('img', { name: 'Gold' })).toBeInTheDocument();
      expect(within(goldPair).getByText('1')).toBeInTheDocument();
    });

    it('shows a zero value as 0 rather than hiding the pair', () => {
      const resources = [
        { type: ResourceType.Food, label: 'Food', value: 0 },
        { type: ResourceType.Wood, label: 'Wood', value: 0 },
        { type: ResourceType.Gold, label: 'Gold', value: 0 },
      ];

      render(<GameBoardHeaderView {...{ ...playingMyTurnNotExpiringProps, resources }} />);

      const strip = screen.getByTestId('gameboard-resource-strip');
      expect(strip.children).toHaveLength(3);
      expect(within(strip).getAllByText('0')).toHaveLength(3);
    });

    it('renders no pairs when resources is empty', () => {
      render(<GameBoardHeaderView {...{ ...playingMyTurnNotExpiringProps, resources: [] }} />);

      expect(screen.getByTestId('gameboard-resource-strip').children).toHaveLength(0);
    });
  });
});
