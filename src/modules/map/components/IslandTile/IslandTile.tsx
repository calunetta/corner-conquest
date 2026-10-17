'use client';

import Image from 'next/image';
import { Home } from 'lucide-react';
import { IslandType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PLAYER_DATA } from '@/modules/game-rules';
import { TileDecorations } from '../TileDecorations';
import { TileResources } from '../TileResources';
import { TileBoats } from '../TileBoats';
import { TileOccupants } from '../TileOccupants';
import { DeathEffect } from '../DeathEffect';
import { CardRevealEffect } from '../CardRevealEffect';
import { TileFog, useFogSettings } from '../TileFog';
import { useTileArt, type TileArt } from '../TileVariants';
import { MonsterIcons } from './IslandTile.monsters';
import { useIslandTile } from './IslandTile.hook';
import {
  playerTileIndicatorShadow,
  styles,
  toBaseCrestStyle,
  toBorderImageStyle,
  toBorderRowStyle,
  toRevealLayerStyle,
  toSpecialIslandStyle,
} from './IslandTile.styles';
import type { IslandTileProps, IslandTileViewModel } from './IslandTile.types';

export const SPECIAL_ISLAND_IDLE_SPRITE = '/sprites/special_island_idle.png';

/**
 * The tile's center feature: base crest, monster stack, special island art, or resources. Rendered
 * even while the tile is fogged (the reveal layer hides it), so the reveal fade has content to show.
 */
function getTileCenterContent(viewModel: IslandTileViewModel, art: TileArt) {
  const {
    island,
    isTileVisible,
    baseOwner,
    cardRevealAnimationOnTile,
    deathAnimationOnTile,
    prefersReducedMotion,
    onCardRevealHidden,
  } = viewModel;

  switch (island.type) {
    case IslandType.Base:
      return (
        <div className={styles.baseContent}>
          {baseOwner?.color ? (
            <div className={styles.baseImageWrapper} style={toBaseCrestStyle()} data-testid="base-crest">
              <Image
                src={art.base[baseOwner.color] ?? PLAYER_DATA[baseOwner.color].base}
                alt={`${baseOwner.color} base`}
                fill
                className={styles.baseImage}
                unoptimized
              />
            </div>
          ) : (
            <Home className={styles.baseFallbackIcon} />
          )}
          <TileResources island={island} isBase />
        </div>
      );
    case IslandType.Monster:
      if (!island.monsters?.length || deathAnimationOnTile?.id.startsWith('monster-')) return null;
      return <MonsterIcons monsters={island.monsters} backgroundSrc={art.monster} />;
    case IslandType.Special:
      return (
        <div className={styles.specialContent} style={toSpecialIslandStyle()} data-testid="special-content">
          {isTileVisible && cardRevealAnimationOnTile && !prefersReducedMotion ? (
            <CardRevealEffect
              id={cardRevealAnimationOnTile.id}
              createdAt={cardRevealAnimationOnTile.createdAt}
              onHidden={() => onCardRevealHidden(cardRevealAnimationOnTile.id)}
            />
          ) : (
            <Image
              src={art.special ?? SPECIAL_ISLAND_IDLE_SPRITE}
              alt="Special island"
              fill
              className={styles.specialImage}
              unoptimized
            />
          )}
        </div>
      );
    case IslandType.Resource:
      return <TileResources island={island} isBase={false} />;
    case IslandType.Empty:
    default:
      return null;
  }
}

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function IslandTileView(viewModel: IslandTileViewModel) {
  const { island, isTileVisible, isBase, deathAnimationOnTile, borderImageSequence, tilePlayerColor, onClick } =
    viewModel;
  const { isSelected, isPossibleMove, isTeleportTarget, isScoutTarget, isClickable, prefersReducedMotion } = viewModel;
  const { timing: fogTiming } = useFogSettings();
  const tileArt = useTileArt();

  return (
    <TooltipProvider>
      <button
        onClick={onClick}
        className={cn(
          styles.tile({ isClickable, isSelected, isPossibleMove, isTeleportTarget, isScoutTarget }),
          tilePlayerColor && !isSelected && cn('shadow-lg', playerTileIndicatorShadow[tilePlayerColor]),
        )}
        aria-label={`Island at ${island.x}, ${island.y}`}
        data-testid={`island-tile-${island.x}-${island.y}`}
      >
        <div className={styles.terrain} />
        {deathAnimationOnTile && (
          <DeathEffect
            sprite={deathAnimationOnTile.sprite}
            id={deathAnimationOnTile.id}
            createdAt={deathAnimationOnTile.createdAt}
          />
        )}
        <div
          className={cn(styles.revealLayer, !isTileVisible && styles.revealLayerCovered)}
          style={toRevealLayerStyle(fogTiming, prefersReducedMotion)}
          data-testid="tile-reveal-layer"
        >
          <TileDecorations island={island} isBase={isBase} />
          <div className={styles.centerContent}>{getTileCenterContent(viewModel, tileArt)}</div>
        </div>
        <TileBoats island={island} />
        <TileFog
          isCovered={!isTileVisible}
          prefersReducedMotion={prefersReducedMotion}
          variantSeed={island.x * 31 + island.y}
        />
        <TileOccupants island={island} />
        <div className={styles.borderRow} style={toBorderRowStyle()}>
          {borderImageSequence.map((src, index) => (
            <div key={index} className={styles.borderImageWrapper} style={toBorderImageStyle()}>
              <Image src={src} alt="" fill className={styles.borderImage} unoptimized />
            </div>
          ))}
        </div>
      </button>
    </TooltipProvider>
  );
}

/** Connected component for the game board: reads the match through its hook. */
export function IslandTile(props: IslandTileProps) {
  return <IslandTileView {...useIslandTile(props)} />;
}
