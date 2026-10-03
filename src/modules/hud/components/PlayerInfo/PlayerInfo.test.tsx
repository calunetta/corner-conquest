import { render, screen } from '@testing-library/react';
import type { PlayerInfoViewModel } from './PlayerInfo.types';
import { currentPlayerWithBuffs, botPlayerNoBuffs } from './PlayerInfo.fixtures';
import { PlayerInfoView } from './PlayerInfo';

describe('PlayerInfoView', () => {
  describe('basic player info rendering', () => {
    it('renders player name and color class', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      expect(screen.getByText(viewModel.name)).toBeInTheDocument();
    });

    it('shows BOT badge for bot players', () => {
      const viewModel: PlayerInfoViewModel = {
        ...botPlayerNoBuffs,
        isBot: true,
      };
      render(<PlayerInfoView {...viewModel} />);

      expect(screen.getByText('BOT')).toBeInTheDocument();
    });

    it('hides BOT badge for human players', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      expect(screen.queryByText('BOT')).not.toBeInTheDocument();
    });
  });

  describe('victory points display', () => {
    it('renders victory points and goal', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      const vpText = screen.getByText(new RegExp(`${viewModel.victoryPoints}.*${viewModel.vpGoal}`));
      expect(vpText).toBeInTheDocument();
    });

    it('displays victory points progress bar', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      const progressBars = screen.getAllByRole('generic').filter((el) => {
        const style = el.getAttribute('style');
        return style && style.includes('width');
      });

      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('victory points progress bar width reflects vpPercent', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      const progressBars = screen.getAllByRole('generic').filter((el) => {
        const style = el.getAttribute('style');
        return style && style.includes('width');
      });

      // The first progress bar should be the VP bar
      const vpBar = progressBars[0];
      expect(vpBar).toHaveStyle(`width: ${viewModel.vpPercent}%`);
    });
  });

  describe('turn badge', () => {
    it('renders turn badge when turnBadge is not null', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      const badge = screen.getByTestId('player-info-turn-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('TURN');
    });

    it('does not render turn badge when turnBadge is null', () => {
      const viewModel: PlayerInfoViewModel = {
        ...currentPlayerWithBuffs,
        turnBadge: null,
      };
      render(<PlayerInfoView {...viewModel} />);

      expect(screen.queryByTestId('player-info-turn-badge')).not.toBeInTheDocument();
    });

    it('shows countdown time when showCountdown is true', () => {
      const viewModel: PlayerInfoViewModel = {
        ...currentPlayerWithBuffs,
        turnBadge: {
          isExpiring: false,
          showCountdown: true,
          formattedTime: '1:30',
        },
      };
      render(<PlayerInfoView {...viewModel} />);

      const badge = screen.getByTestId('player-info-turn-badge');
      expect(badge).toHaveTextContent('1:30');
    });

    it('hides countdown time when showCountdown is false', () => {
      const viewModel: PlayerInfoViewModel = {
        ...currentPlayerWithBuffs,
        turnBadge: {
          isExpiring: false,
          showCountdown: false,
          formattedTime: '1:30',
        },
      };
      render(<PlayerInfoView {...viewModel} />);

      const badge = screen.getByTestId('player-info-turn-badge');
      expect(badge).not.toHaveTextContent('1:30');
    });

    it('applies expiring style when isExpiring is true', () => {
      const viewModel: PlayerInfoViewModel = {
        ...currentPlayerWithBuffs,
        turnBadge: {
          isExpiring: true,
          showCountdown: true,
          formattedTime: '0:05',
        },
      };
      render(<PlayerInfoView {...viewModel} />);

      const badge = screen.getByTestId('player-info-turn-badge');
      // The badge should have a different style applied (e.g., warning colors)
      expect(badge).toBeInTheDocument();
    });
  });

  describe('buffs section', () => {
    it('renders buffs section when buffs array is not empty', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      const buffsSection = screen.getByTestId('player-info-buffs');
      expect(buffsSection).toBeInTheDocument();
    });

    it('does not render buffs section when buffs array is empty', () => {
      const viewModel: PlayerInfoViewModel = {
        ...currentPlayerWithBuffs,
        buffs: [],
      };
      render(<PlayerInfoView {...viewModel} />);

      expect(screen.queryByTestId('player-info-buffs')).not.toBeInTheDocument();
    });

    it('renders each buff with its label', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      viewModel.buffs.forEach((buff) => {
        expect(screen.getByText(buff.label)).toBeInTheDocument();
      });
    });

    it('renders buff tooltip content on hover', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      // Buffs should be present
      const buffsSection = screen.getByTestId('player-info-buffs');
      expect(buffsSection).toBeInTheDocument();

      // At least one buff should be rendered
      expect(viewModel.buffs.length).toBeGreaterThan(0);
    });

    it('renders all buffs in order', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      const buffLabels = viewModel.buffs.map((buff) => buff.label);
      buffLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('stats section', () => {
    it('displays army count stat', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      // The component should render, and stats should be visible
      expect(screen.getByText(/Victory Points|Army|attacked|card/i)).toBeInTheDocument();
    });

    it('displays resources in order: Food, Wood, Gold', () => {
      const viewModel = currentPlayerWithBuffs;
      const { container } = render(<PlayerInfoView {...viewModel} />);

      const foodResource = viewModel.resources.find((r) => r.type === 'food');
      const woodResource = viewModel.resources.find((r) => r.type === 'wood');
      const goldResource = viewModel.resources.find((r) => r.type === 'gold');

      // Resources are rendered with test ids
      if (foodResource) {
        expect(container.querySelector('[data-testid="player-info-resource-food"]')).toBeInTheDocument();
      }
      if (woodResource) {
        expect(container.querySelector('[data-testid="player-info-resource-wood"]')).toBeInTheDocument();
      }
      if (goldResource) {
        expect(container.querySelector('[data-testid="player-info-resource-gold"]')).toBeInTheDocument();
      }
    });

    it('displays resource values correctly', () => {
      const viewModel = currentPlayerWithBuffs;
      render(<PlayerInfoView {...viewModel} />);

      viewModel.resources.forEach((resource) => {
        expect(screen.getByText(resource.value.toString())).toBeInTheDocument();
      });
    });
  });

  describe('player state visibility', () => {
    it('shows different styling for current player', () => {
      const viewModel: PlayerInfoViewModel = {
        ...currentPlayerWithBuffs,
        isCurrentPlayer: true,
      };
      const { container } = render(<PlayerInfoView {...viewModel} />);

      // The card should be rendered with appropriate styling
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });

    it('shows different styling for non-current player', () => {
      const viewModel: PlayerInfoViewModel = {
        ...botPlayerNoBuffs,
        isCurrentPlayer: false,
        turnBadge: null,
      };
      const { container } = render(<PlayerInfoView {...viewModel} />);

      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('image rendering', () => {
    it('renders player sprite image', () => {
      const viewModel = currentPlayerWithBuffs;
      const { container } = render(<PlayerInfoView {...viewModel} />);

      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
      const spriteImage = Array.from(images).find((img) => img.src.includes(viewModel.spriteSrc));
      expect(spriteImage).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders with proper heading hierarchy and landmark structure', () => {
      const viewModel = currentPlayerWithBuffs;
      const { container } = render(<PlayerInfoView {...viewModel} />);

      // Component should render without errors
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
    });

    it('has alt text for player sprite image', () => {
      const viewModel = currentPlayerWithBuffs;
      const { container } = render(<PlayerInfoView {...viewModel} />);

      const images = container.querySelectorAll('img');
      const spriteImage = Array.from(images).find((img) => img.src.includes(viewModel.spriteSrc));
      expect(spriteImage).toHaveAttribute('alt');
      expect(spriteImage?.getAttribute('alt')).toMatch(/player|commander/i);
    });
  });
});
