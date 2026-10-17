'use client';

import Image from 'next/image';
import { PLAYER_DATA } from '@/modules/game-rules';
import { RegistryIcon } from '@/modules/shared';
import type { PlayerColor } from '@/lib/types';
import { PlacedVariantImage, type TileVariant } from '../TileVariants';
import { styles, toBaseCrestStyle } from './IslandTile.styles';

interface BaseCrestProps {
  /** The owner's colour. Undefined for an unowned base, which shows the house icon. */
  color: PlayerColor | undefined;
  /** The base variant picked for this tile. A variant with an image replaces the built-in castle. */
  variant: TileVariant | null;
}

export function BaseCrest({ color, variant }: BaseCrestProps) {
  if (variant?.image) return <PlacedVariantImage src={variant.image} transform={variant.transform} />;
  if (!color) return <RegistryIcon id="home" className={styles.baseFallbackIcon} />;

  return (
    <div className={styles.baseImageWrapper} style={toBaseCrestStyle()} data-testid="base-crest">
      <Image src={PLAYER_DATA[color].base} alt={`${color} base`} fill className={styles.baseImage} unoptimized />
    </div>
  );
}
