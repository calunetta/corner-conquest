'use client';

import Image from 'next/image';
import { Home, HelpCircle, Star } from 'lucide-react';
import { IslandType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PLAYER_DATA } from '@/modules/game-rules';
import { AnimatedMonster } from '../AnimatedMonster';
import { TileForest } from '../TileForest';
import { TileResources } from '../TileResources';
import { TileBoats } from '../TileBoats';
import { TileOccupants } from '../TileOccupants';
import { DeathEffect } from '../DeathEffect';
import { useIslandTile } from './IslandTile.hook';
import { playerTileIndicatorShadow, styles } from './IslandTile.styles';
import type { IslandTileProps, IslandTileViewModel } from './IslandTile.types';

/** One tile's monster icons, suppressed while its death animation is playing. */
function renderMonsterIcons(viewModel: IslandTileViewModel) {
  const { island, deathAnimationOnTile } = viewModel;
  if (!island.monsters || island.monsters.length === 0) return null;
  if (deathAnimationOnTile?.id.startsWith('monster-')) return null;

  return (
    <div className={styles.monsterStack}>
      {island.monsters.map((monster, i) => (
        <div key={`${monster.name}-${i}`} className={styles.monsterSlot}>
          <AnimatedMonster monster={monster} />
        </div>
      ))}
    </div>
  );
}

/** The tile's center feature: fogged placeholder, base crest, monster stack, special star, or resources. */
function getTileCenterContent(viewModel: IslandTileViewModel) {
  const { island, isTileVisible, baseOwner } = viewModel;
  if (!isTileVisible) return <HelpCircle className={styles.fogIcon} />;

  switch (island.type) {
    case IslandType.Base:
      return (
        <div className={styles.baseContent}>
          {baseOwner?.color ? (
            <div
              className={styles.baseImageWrapper}
              style={{ width: 'max(18px, 44%)', height: 'max(18px, 44%)' }}
            >
              <Image
                src={PLAYER_DATA[baseOwner.color].base}
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
      return renderMonsterIcons(viewModel);
    case IslandType.Special:
      return <Star className={styles.specialIcon} />;
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
  const { isSelected, isPossibleMove, isTeleportTarget, isScoutTarget, isClickable } = viewModel;

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

        {isTileVisible && <TileForest island={island} isBase={isBase} />}

        <TileBoats island={island} />

        <div className={styles.centerContent}>{getTileCenterContent(viewModel)}</div>

        <TileOccupants island={island} />

        <div className={styles.borderRow}>
          {borderImageSequence.map((src, index) => (
            <div key={index} className={styles.borderImageWrapper}>
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
