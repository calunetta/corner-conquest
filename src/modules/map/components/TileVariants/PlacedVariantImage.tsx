'use client';

import Image from 'next/image';
import { toPlacementStyle } from './TileVariants.map';
import type { TileTransform } from './TileVariants.config';

interface PlacedVariantImageProps {
  src: string;
  transform: TileTransform;
}

/** A variant's image at its saved position and size, relative to the tile. */
export function PlacedVariantImage({ src, transform }: PlacedVariantImageProps) {
  return (
    <div className="pointer-events-none absolute" style={toPlacementStyle(transform)} data-testid="placed-variant">
      <Image src={src} alt="" fill className="object-contain" unoptimized />
    </div>
  );
}
