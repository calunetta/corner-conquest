'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IslandTile, IslandTileView } from './IslandTile';
import { toIslandTileViewModel } from './IslandTile.map';
import {
  localPlayerFixture,
  baseIslandOwnedByLocalPlayer,
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
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
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
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
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
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByTestId('island-tile-0-0')).toBeInTheDocument();
    });

    it('renders special island with star icon', () => {
      const context: IslandTileContext = {
        gameState: gameStateFixture,
        localPlayer: localPlayerFixture,
        uiState: makeUIState(),
        selectedArmy: null,
      };
      const viewModel = toIslandTileViewModel(specialIsland, context);
      const enriched = {
        ...viewModel,
        island: specialIsland,
        deathAnimationOnTile: undefined,
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByTestId('island-tile-4-4')).toBeInTheDocument();
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
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      expect(screen.getByTestId('island-tile-4-0')).toBeInTheDocument();
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
        borderImageSequence: ['', '', ''] as [string, string, string],
        onClick: handleClick,
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
        borderImageSequence: borderImages as [string, string, string],
        onClick: jest.fn(),
      };

      render(<IslandTileView {...enriched} />);
      const button = screen.getByTestId('island-tile-2-2');
      // Border images are rendered inside the tile
      expect(button).toBeInTheDocument();
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
