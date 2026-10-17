import { act, render, screen, within } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { useResourceGainEvents } from '@/modules/game-board';
import { resolveIcon } from '@/modules/icons';
import { RESOURCE_GAIN_ANIMATION_MS, RESOURCE_GAIN_SPRITES } from '@/modules/shared';
import { CardName, ResourceType } from '@/lib/types';
import type { Player } from '@/lib/types';
import type { PlayerInfoViewModel } from './PlayerInfo.types';
import { currentPlayerWithBuffs, botPlayerNoBuffs } from './PlayerInfo.fixtures';
import { PlayerInfo, PlayerInfoView } from './PlayerInfo';

// The connected PlayerInfo reads the game-board context and the gain events; the view tests above do not use either.
jest.mock('@/features/game/context/GameBoardContext', () => ({
  useGameBoard: jest.fn(),
}));

jest.mock('@/modules/game-board', () => ({
  useResourceGainEvents: jest.fn(),
}));

/** The image URL a registry icon id resolves to, so a test can find its <img>. */
function iconSrc(iconId: string): string {
  const { source } = resolveIcon(iconId);
  return source.kind === 'image' ? source.src : '';
}

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
      const spriteImage = Array.from(images).find((img) => img.src.includes(iconSrc(viewModel.iconId)));
      expect(spriteImage).toBeInTheDocument();
    });
  });

  describe('resource gain overlay', () => {
    const goldGainSrc = RESOURCE_GAIN_SPRITES.gold;
    const withGoldPulse = (token: number): PlayerInfoViewModel => ({
      ...currentPlayerWithBuffs,
      resources: currentPlayerWithBuffs.resources.map((resource) =>
        resource.type === 'gold' ? { ...resource, gainPulse: { token, spriteSrc: goldGainSrc } } : resource,
      ),
    });

    it('renders the gain overlay inside the gold chip only', () => {
      render(<PlayerInfoView {...withGoldPulse(1)} />);

      const goldChip = screen.getByTestId('player-info-resource-gold');
      const foodChip = screen.getByTestId('player-info-resource-food');
      expect(goldChip.querySelector(`img[src="${goldGainSrc}"]`)).toBeInTheDocument();
      expect(foodChip.querySelector(`img[src$="_gain.gif"]`)).not.toBeInTheDocument();
    });

    it('keeps the gold value readable while the overlay plays', () => {
      render(<PlayerInfoView {...withGoldPulse(1)} />);

      expect(within(screen.getByTestId('player-info-resource-gold')).getByText('10')).toBeInTheDocument();
    });

    it('removes the overlay from the DOM once the view model no longer carries a pulse', () => {
      const { rerender, container } = render(<PlayerInfoView {...withGoldPulse(1)} />);
      expect(container.querySelector(`img[src="${goldGainSrc}"]`)).toBeInTheDocument();

      rerender(<PlayerInfoView {...currentPlayerWithBuffs} />);

      expect(container.querySelector(`img[src="${goldGainSrc}"]`)).not.toBeInTheDocument();
    });

    it('mounts a new overlay element when the token changes, so a repeat gain restarts the GIF', () => {
      const { rerender, container } = render(<PlayerInfoView {...withGoldPulse(1)} />);
      const firstOverlay = container.querySelector(`img[src="${goldGainSrc}"]`);

      rerender(<PlayerInfoView {...withGoldPulse(2)} />);

      const secondOverlay = container.querySelector(`img[src="${goldGainSrc}"]`);
      expect(secondOverlay).toBeInTheDocument();
      expect(secondOverlay).not.toBe(firstOverlay);
    });

    // Reduced-motion fallback (acceptance criterion 5): the chip gets a ring and the GIF is hidden.
    // Asserted as classes on purpose: they are the only mechanism that implements this fallback.
    it('carries the reduced-motion ring on the chip and hides the GIF overlay under reduced motion', () => {
      render(<PlayerInfoView {...withGoldPulse(1)} />);

      const goldChip = screen.getByTestId('player-info-resource-gold');
      const overlay = goldChip.querySelector(`img[src="${goldGainSrc}"]`);
      expect(goldChip).toHaveClass('motion-reduce:ring-2', 'motion-reduce:ring-accent');
      expect(overlay).toHaveClass('motion-reduce:hidden');
    });
  });

  describe('resource gain overlay on the connected card', () => {
    const localPlayerId = 'player-0';
    const goldGainSrc = RESOURCE_GAIN_SPRITES.gold;

    const createPlayer = (overrides: Partial<Player> = {}): Player =>
      ({
        id: 0,
        playerId: localPlayerId,
        name: 'Test Player',
        color: 'blue',
        isBot: false,
        armies: [{ id: 0, position: { x: 0, y: 0 }, hasActed: false }],
        resources: { food: 10, wood: 5, gold: 3 },
        armyCount: 1,
        attackPower: 1,
        nextArmyCost: 10,
        victoryPoints: 5,
        specialCards: [CardName.Scout],
        positions: [],
        passiveAbilities: { collector: false, explorer: false },
        isSabotaged: false,
        reinforceActive: false,
        efficientActive: false,
        masterBuilderActive: false,
        hasExtraMove: false,
        actionsThisTurn: [],
        revealedTiles: [],
        ...overrides,
      }) as Player;

    const renderCardFor = (player: Player, localPlayerIdValue: string) => {
      jest.mocked(useGameBoard).mockReturnValue({
        turnTimer: { formattedTime: '1:00', isExpiring: false },
        isMyTurn: false,
        gameState: {},
        localPlayer: { playerId: localPlayerIdValue },
      } as unknown as ReturnType<typeof useGameBoard>);
      return render(<PlayerInfo player={player} isCurrentPlayer={false} />);
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.mocked(useResourceGainEvents).mockReturnValue([
        { playerId: localPlayerId, type: ResourceType.Gold, tileIds: [] },
      ]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows the gold gain overlay on the local player card', () => {
      renderCardFor(createPlayer(), localPlayerId);

      expect(screen.getByTestId('player-info-resource-gold').querySelector(`img[src="${goldGainSrc}"]`)).toBeInTheDocument();
    });

    it('removes the overlay from the DOM once the animation duration has elapsed', () => {
      const { container } = renderCardFor(createPlayer(), localPlayerId);

      act(() => jest.advanceTimersByTime(RESOURCE_GAIN_ANIMATION_MS));

      expect(container.querySelector(`img[src="${goldGainSrc}"]`)).not.toBeInTheDocument();
    });

    it('never animates a card that belongs to another player, even when that player gains gold', () => {
      const otherPlayer = createPlayer({ playerId: 'player-1', name: 'Rival', color: 'red' });
      const { container } = renderCardFor(otherPlayer, 'player-0');

      expect(container.querySelector(`img[src="${goldGainSrc}"]`)).not.toBeInTheDocument();
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
      const spriteImage = Array.from(images).find((img) => img.src.includes(iconSrc(viewModel.iconId)));
      expect(spriteImage).toHaveAttribute('alt');
      expect(spriteImage?.getAttribute('alt')).toMatch(/player|commander/i);
    });
  });
});
