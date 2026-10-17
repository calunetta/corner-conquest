'use client';

import Image from 'next/image';
import { IslandType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TileDecorations } from '../TileDecorations';
import { TileResources } from '../TileResources';
import { TileBoats } from '../TileBoats';
import { TileOccupants } from '../TileOccupants';
import { DeathEffect } from '../DeathEffect';
import { TileFog, useFogSettings } from '../TileFog';
import {
  PlacedVariantImage,
  toDecorationLayoutsConfig,
  toTilePicks,
  toTileVariant,
  useAssignedTileVariant,
  useTileVariants,
  type TileVariant,
} from '../TileVariants';
import { DECORATION_LAYOUTS_DEFAULT } from '../TileDecorations/TileDecorations.map';
import { BaseCrest } from './IslandTile.base';
import { SpecialIslandArt } from './IslandTile.special';
import { TileGround } from './IslandTile.ground';
import { MonsterIcons } from './IslandTile.monsters';
import { useIslandTile } from './IslandTile.hook';
import {
  playerTileIndicatorShadow,
  styles,
  toBorderImageStyle,
  toBorderRowStyle,
  toRevealLayerStyle,
} from './IslandTile.styles';
import type { IslandTileProps, IslandTileViewModel } from './IslandTile.types';

export { SPECIAL_ISLAND_IDLE_SPRITE } from './IslandTile.special';

/**
 * The tile's center feature: base crest, monster stack, special island art, or resources. Rendered
 * even while the tile is fogged (the reveal layer hides it), so the reveal fade has content to show.
 */
/** The variant each kind of tile draws, picked once per tile from the tile's seed. */
interface TilePicks {
  special: TileVariant | null;
  monster: TileVariant | null;
  base: TileVariant | null;
  empty: TileVariant | null;
}

function getTileCenterContent(viewModel: IslandTileViewModel, picks: TilePicks) {
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
          <BaseCrest color={baseOwner?.color} variant={picks.base} />
          <TileResources island={island} isBase />
        </div>
      );
    case IslandType.Monster:
      if (!island.monsters?.length || deathAnimationOnTile?.id.startsWith('monster-')) return null;
      return <MonsterIcons monsters={island.monsters} background={picks.monster} />;
    case IslandType.Special: {
      const showsReveal = isTileVisible && cardRevealAnimationOnTile && !prefersReducedMotion;
      if (picks.special?.image && !showsReveal) {
        return <PlacedVariantImage src={picks.special.image} transform={picks.special.transform} />;
      }
      return (
        <SpecialIslandArt
          variant={picks.special}
          reveal={showsReveal ? cardRevealAnimationOnTile : undefined}
          onRevealHidden={onCardRevealHidden}
        />
      );
    }
    case IslandType.Resource:
      return <TileResources island={island} isBase={false} />;
    case IslandType.Empty:
      return picks.empty?.image ? <PlacedVariantImage src={picks.empty.image} transform={picks.empty.transform} /> : null;
    default:
      return null;
  }
}

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function IslandTileView(viewModel: IslandTileViewModel) {
  const { island, isTileVisible, isNeutralFog, isBase, deathAnimationOnTile, borderImageSequence, tilePlayerColor, onClick, showDecorations = true } =
    viewModel;
  const { isSelected, isPossibleMove, isTeleportTarget, isScoutTarget, isClickable, prefersReducedMotion } = viewModel;
  const { timing: fogTiming } = useFogSettings();
  const variants = useTileVariants();
  const seed = island.x * 31 + island.y;
  const ownerColor = viewModel.baseOwner?.color;
  // The board spreads variants so neighbours differ; the seed pick is only the fallback outside the board.
  const assigned = useAssignedTileVariant(island.id);
  const picks: TilePicks = toTilePicks(variants, assigned, seed, ownerColor);
  const decorationLayouts = toDecorationLayoutsConfig(DECORATION_LAYOUTS_DEFAULT, assigned ?? toTileVariant(island, variants, seed, ownerColor));

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
        <TileGround
          island={island}
          isNeutralFog={isNeutralFog}
          isTileVisible={isTileVisible}
          timing={fogTiming}
          prefersReducedMotion={prefersReducedMotion}
        />
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
          {showDecorations && <TileDecorations island={island} isBase={isBase} layouts={decorationLayouts} />}
          <div className={styles.centerContent}>{getTileCenterContent(viewModel, picks)}</div>
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
