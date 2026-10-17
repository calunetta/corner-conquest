'use client';

import Image from 'next/image';
import type { CardRevealAnimation } from '@/lib/types';
import { CardRevealEffect } from '../CardRevealEffect';
import { PlacedBuiltInArt, toBuiltInScale, type TileVariant } from '../TileVariants';
import { styles, toSpecialIslandStyle } from './IslandTile.styles';

export const SPECIAL_ISLAND_IDLE_SPRITE = '/sprites/special_island_idle.png';

interface SpecialIslandArtProps {
  /** The special-island variant picked for this tile. Its position and size move the built-in island. */
  variant: TileVariant | null;
  /** Set while the card-reveal animation plays on this tile; the island is replaced by the effect. */
  reveal: CardRevealAnimation | undefined;
  onRevealHidden: (id: string) => void;
}

export function SpecialIslandArt({ variant, reveal, onRevealHidden }: SpecialIslandArtProps) {
  const scale = variant ? toBuiltInScale(variant.transform) : 1;
  const builtIn = (
    <div className={styles.specialContent} style={toSpecialIslandStyle(scale)} data-testid="special-content">
      {reveal ? (
        <CardRevealEffect id={reveal.id} createdAt={reveal.createdAt} onHidden={() => onRevealHidden(reveal.id)} />
      ) : (
        <Image src={SPECIAL_ISLAND_IDLE_SPRITE} alt="Special island" fill className={styles.specialImage} unoptimized />
      )}
    </div>
  );
  return variant ? <PlacedBuiltInArt transform={variant.transform}>{builtIn}</PlacedBuiltInArt> : builtIn;
}
