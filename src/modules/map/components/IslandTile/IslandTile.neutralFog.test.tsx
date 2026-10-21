import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IslandTileView } from './IslandTile';
import { toIslandTileViewModel } from './IslandTile.map';
import { hiddenFogIsland, gameStateFixture, localPlayerFixture, uiStateFixture } from './IslandTile.fixtures';
import type { IslandTileContext } from './IslandTile.types';
import { useGameBoard } from '@/modules/game-board';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imgProps } = props as { alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(imgProps as Record<string, unknown>)} alt={alt} />;
  },
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
  useResourceGainEvents: jest.fn().mockReturnValue([]),
}));

/** Renders the fogged fixture island with the given neutralFog setting (undefined = field missing). */
function renderFoggedTile(neutralFog: boolean | undefined, isRevealed = false) {
  const settings = { ...gameStateFixture.settings, fogOfWar: true, neutralFog };
  const context: IslandTileContext = {
    gameState: { ...gameStateFixture, settings },
    localPlayer: { ...localPlayerFixture, revealedTiles: isRevealed ? [hiddenFogIsland.id] : [] },
    uiState: { ...uiStateFixture, possibleMoves: [], pendingAction: null, selectedArmyId: null },
    selectedArmy: null,
  };
  (useGameBoard as jest.Mock).mockReturnValue({ ...context, selectedArmy: null, handleTileClick: jest.fn() });
  const viewModel = toIslandTileViewModel(hiddenFogIsland, context);
  render(
    <IslandTileView
      {...viewModel}
      island={hiddenFogIsland}
      deathAnimationOnTile={undefined}
      cardRevealAnimationOnTile={undefined}
      prefersReducedMotion={false}
      borderImageSequence={['', '', '']}
      onClick={jest.fn()}
      onCardRevealHidden={jest.fn()}
    />,
  );
}

describe('IslandTileView neutral fog', () => {
  it('draws a covered tile in neutral grey with its real ground hidden', () => {
    renderFoggedTile(true);

    expect(screen.getByTestId('tile-neutral-ground')).toHaveClass('bg-terrain-neutral');
    expect(screen.getByTestId('tile-terrain')).toHaveStyle({ opacity: '0' });
    expect(screen.getByTestId('tile-fog')).toBeInTheDocument();
  });

  it('fades the real ground in once the tile is revealed', () => {
    renderFoggedTile(true, true);

    expect(screen.getByTestId('tile-terrain')).toHaveStyle({ opacity: '1' });
    expect(screen.getByTestId('tile-terrain')).toHaveClass('transition-opacity');
  });

  it('keeps the terrain-coloured fog when the setting is off', () => {
    renderFoggedTile(false);

    expect(screen.queryByTestId('tile-neutral-ground')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-terrain').style.opacity).toBe('');
  });

  it('treats a game saved without the neutralFog field as off', () => {
    renderFoggedTile(undefined);

    expect(screen.queryByTestId('tile-neutral-ground')).not.toBeInTheDocument();
  });
});
