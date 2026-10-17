'use client';

import Image from 'next/image';
import { PLAYER_DATA } from '@/modules/game-rules';
import { RegistryIcon } from '@/modules/shared';
import type { PlayerColor } from '@/lib/types';
import { PlacedBuiltInArt, PlacedVariantImage, toBuiltInScale, type TileVariant } from '../TileVariants';
import { styles, toBaseCrestStyle } from './IslandTile.styles';

interface BaseCrestProps {
  /** The owner's colour. Undefined for an unowned base, which shows the house icon. */
  color: PlayerColor | undefined;
  /** The base variant picked for this tile. A variant with an image replaces the built-in castle. */
  variant: TileVariant | null;
}

export function BaseCrest({ color, variant }: BaseCrestProps) {
  if (variant?.image) return <PlacedVariantImage src={variant.image} transform={variant.transform} />;
  const built = toBuiltInCrest(color, variant);
  return variant ? <PlacedBuiltInArt transform={variant.transform}>{built}</PlacedBuiltInArt> : built;
}

function toBuiltInCrest(color: PlayerColor | undefined, variant: TileVariant | null) {
  if (!color) return <RegistryIcon id="home" className={styles.baseFallbackIcon} />;
  const scale = variant ? toBuiltInScale(variant.transform) : 1;

  return (
    <div className={styles.baseImageWrapper} style={toBaseCrestStyle(scale)} data-testid="base-crest">
      <Image src={PLAYER_DATA[color].base} alt={`${color} base`} fill className={styles.baseImage} unoptimized />
    </div>
  );
}
