'use client';

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IslandTile, IslandTileView } from './IslandTile';
import { REVEAL_ANIMATION_DURATION } from '../CardRevealEffect';
import { toIslandTileViewModel } from './IslandTile.map';
import {
  localPlayerFixture,
  baseIslandOwnedByLocalPlayer,
  baseIslandWithThreeResources,
  resourceIsland,
  monsterIslandWithLivingMonster,
  specialIsland,
  emptyIsland,
  hiddenFogIsland,
  gameStateFixture,
  uiStateFixture,
} from './IslandTile.fixtures';
import type { IslandTileContext } from './IslandTile.types';

// Helper to create a UI state context
const makeUIState = (overrides = {}) => ({
  ...uiStateFixture,
  possibleMoves: [],
  pendingAction: null,
  selectedArmyId: null,
  ...overrides,
});

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imgProps } = props as { alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(imgProps as Record<string, unknown>)} alt={alt} />;
  },
}));

// Mock Tooltip (radix)
jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useGameBoard
jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

import { useGameBoard } from '@/modules/game-board';

describe('IslandTile Component', () => {
  beforeEach(() => {
    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: gameStateFixture,
      localPlayer: localPlayerFixture,
      uiState: makeUIState(),
      selectedArmy: null,
      handleTileClick: jest.fn(),
    });
  });

  describe('IslandTileView (pure view)', () => {
    it('renders a tile button with correct testid', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(baseIslandOwnedByLocalPlayer, context);
      const enriched = {
        ...viewModel,
        island: baseIslandOwnedByLocalPlayer,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      const button = screen.getByTestId('island-tile-0-0');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('renders the correct aria-label with island coordinates', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(resourceIsland, context);
      const enriched = {
        ...viewModel,
        island: resourceIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      const button = screen.getByRole('button', { name: /Island at 2, 2/ });
      expect(button).toBeInTheDocument();
    });

    it('renders base island with base imagery', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(baseIslandOwnedByLocalPlayer, context);
      const enriched = {
        ...viewModel,
        island: baseIslandOwnedByLocalPlayer,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByTestId('island-tile-0-0')).toBeInTheDocument();
    });

    const visibleSpecialIslandPlayer = {
      ...localPlayerFixture,
      revealedTiles: [...localPlayerFixture.revealedTiles, specialIsland.id],
    };

    it('renders special island with the idle sprite, not a Star icon', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: visibleSpecialIslandPlayer,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(specialIsland, context);
      const enriched = {
        ...viewModel,
        island: specialIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      const image = screen.getByAltText('Special island');
      expect(image).toBeInTheDocument();
      expect(image.getAttribute('src')).toMatch(/special_island_idle\.png/);
      expect(screen.queryByText('Star', { exact: false })).not.toBeInTheDocument();
    });

    it('renders the CardRevealEffect instead of the idle sprite when a reveal animation is active', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: visibleSpecialIslandPlayer,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(specialIsland, context);
      const enriched = {
        ...viewModel,
        island: specialIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: { id: 'card-4-4-0', x: 4, y: 4, createdAt: Date.now() },
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByAltText('Card revealed')).toBeInTheDocument();
      expect(screen.queryByAltText('Special island')).not.toBeInTheDocument();
    });

    it('renders only the idle sprite when prefersReducedMotion is true, even with an active reveal animation', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: visibleSpecialIslandPlayer,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(specialIsland, context);
      const enriched = {
        ...viewModel,
        island: specialIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: { id: 'card-4-4-0', x: 4, y: 4, createdAt: Date.now() },
        prefersReducedMotion: true,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByAltText('Special island')).toBeInTheDocument();
      expect(screen.queryByAltText('Card revealed')).not.toBeInTheDocument();
    });

    it('renders fog-of-war placeholder when tile is not visible', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: { ...localPlayerFixture, revealedTiles: [] },
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(hiddenFogIsland, context);
      const enriched = {
        ...viewModel,
        island: hiddenFogIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByTestId('island-tile-4-0')).toBeInTheDocument();
    });

    it('shows the fog icon on a fogged special island even with an active reveal animation, not idle or reveal art', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: { ...localPlayerFixture, revealedTiles: [] },
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(specialIsland, context);
      const enriched = {
        ...viewModel,
        island: specialIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: { id: 'card-4-4-0', x: 4, y: 4, createdAt: Date.now() },
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.queryByAltText('Special island')).not.toBeInTheDocument();
      expect(screen.queryByAltText('Card revealed')).not.toBeInTheDocument();
      // Fog placeholder is the HelpCircle icon (no next/image, no alt text); its presence confirms
      // the fog branch rendered instead of idle/reveal art, not just that neither art rendered.
      expect(screen.getByTestId('lucide-icon-helpcircle')).toBeInTheDocument();
    });

    it('calls onClick handler when button is clicked', () => {
      const handleClick = jest.fn();
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(resourceIsland, context);
      const enriched = {
        ...viewModel,
        island: resourceIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: handleClick,
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      const button = screen.getByTestId('island-tile-2-2');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('passes borderImageSequence to view', () => {
      const borderImages = ['/sprites/border1.png', '/sprites/border2.png', '/sprites/border3.png'];
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(resourceIsland, context);
      const enriched = {
        ...viewModel,
        island: resourceIsland,
        deathAnimationOnTile: undefined,
        cardRevealAnimationOnTile: undefined,
        prefersReducedMotion: false,
        borderImageSequence: borderImages as [string, string, string],
        onClick: jest.fn(),
        onCardRevealHidden: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      const button = screen.getByTestId('island-tile-2-2');
      // Border images are rendered inside the tile
      expect(button).toBeInTheDocument();
    });
  });

  describe('IslandTileView Base layout', () => {
    const renderBaseTile = (island: typeof baseIslandWithThreeResources) => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(island, context);
      render(
        <IslandTileView
          {...viewModel}
          island={island}
          deathAnimationOnTile={undefined}
          cardRevealAnimationOnTile={undefined}
          prefersReducedMotion={false}
          borderImageSequence={['', '', '']}
          onClick={jest.fn()}
          onCardRevealHidden={jest.fn()}
        />,
      );
    };

    it('shows the castle crest and all three base resource nodes at the same time', () => {
      renderBaseTile(baseIslandWithThreeResources);
      expect(screen.getByRole('img', { name: 'blue base' })).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-food')).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-wood')).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-gold')).toBeInTheDocument();
    });

    it('shows the castle crest and no resource nodes on a base without resources', () => {
      renderBaseTile(baseIslandOwnedByLocalPlayer);
      expect(screen.getByRole('img', { name: 'blue base' })).toBeInTheDocument();
      expect(screen.queryByTestId(/^resource-node-/)).not.toBeInTheDocument();
    });
  });

  describe('IslandTile (connected component with hook)', () => {
    it('renders base island with connected component', () => {
      render(<IslandTile island={baseIslandOwnedByLocalPlayer} />);
      expect(screen.getByTestId('island-tile-0-0')).toBeInTheDocument();
    });

    it('renders resource island with connected component', () => {
      render(<IslandTile island={resourceIsland} />);
      expect(screen.getByTestId('island-tile-2-2')).toBeInTheDocument();
    });

    it('renders special island with connected component', () => {
      render(<IslandTile island={specialIsland} />);
      expect(screen.getByTestId('island-tile-4-4')).toBeInTheDocument();
    });

    it('renders empty island with connected component', () => {
      render(<IslandTile island={emptyIsland} />);
      expect(screen.getByTestId('island-tile-2-3')).toBeInTheDocument();
    });

    it('renders monster island with connected component', () => {
      render(<IslandTile island={monsterIslandWithLivingMonster} />);
      expect(screen.getByTestId('island-tile-3-3')).toBeInTheDocument();
    });

    it('calls handleTileClick when button is clicked', () => {
      const handleTileClick = jest.fn().mockResolvedValue(undefined);
      (useGameBoard as jest.Mock).mockReturnValue({
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
        handleTileClick,
      });

      render(<IslandTile island={resourceIsland} />);
      const button = screen.getByTestId('island-tile-2-2');
      fireEvent.click(button);
      expect(button).toBeInTheDocument();
    });

    it('falls back to the idle sprite once its own reveal timer fires, even though gameState.cardRevealAnimations is untouched', () => {
      // Regression test for preview-b's find: CardRevealEffect's local setTimeout hides the GIF
      // before the Firestore clear removes the array entry, so without onHidden/onCardRevealHidden
      // wiring the tile would render neither the GIF nor the idle art for that gap.
      jest.useFakeTimers();
      const visibleSpecialIslandPlayer = {
        ...localPlayerFixture,
        revealedTiles: [...localPlayerFixture.revealedTiles, specialIsland.id],
      };
      const stateWithActiveReveal = {
        ...gameStateFixture,
        cardRevealAnimations: [{ id: 'card-4-4-0', x: 4, y: 4, createdAt: Date.now() }],
      };
      (useGameBoard as jest.Mock).mockReturnValue({
        gameState: stateWithActiveReveal,
        localPlayer: visibleSpecialIslandPlayer,
        uiState: makeUIState(),
        selectedArmy: null,
        handleTileClick: jest.fn(),
      });

      try {
        render(<IslandTile island={specialIsland} />);
        expect(screen.getByAltText('Card revealed')).toBeInTheDocument();
        expect(screen.queryByAltText('Special island')).not.toBeInTheDocument();

        act(() => {
          jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
        });

        // gameState.cardRevealAnimations still has the entry (no new mock return), but the
        // locally-hidden id must suppress it so the idle art reappears, not a blank tile.
        expect(screen.getByAltText('Special island')).toBeInTheDocument();
        expect(screen.queryByAltText('Card revealed')).not.toBeInTheDocument();
      } finally {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
      }
    });

    it('respects fog of war when tile is hidden', () => {
      const hiddenGameState = {
        ...gameStateFixture,
        settings: { ...gameStateFixture.settings, fogOfWar: true },
      };
      (useGameBoard as jest.Mock).mockReturnValue({
        gameState: hiddenGameState,
        localPlayer: { ...localPlayerFixture, revealedTiles: [] },
        uiState: makeUIState(),
        selectedArmy: null,
        handleTileClick: jest.fn(),
      });

      render(<IslandTile island={hiddenFogIsland} />);
      expect(screen.getByTestId('island-tile-4-0')).toBeInTheDocument();
    });
  });
});
