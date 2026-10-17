'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { toBuiltInOffsetStyle, toPlacementStyle } from './TileVariants.map';
import type { TileTransform } from './TileVariants.config';

interface PlacedVariantImageProps {
  src: string;
  transform: TileTransform;
}

interface PlacedBuiltInArtProps {
  transform: TileTransform;
  children: ReactNode;
}

/** The game's built-in art, moved by a variant's position. Its own spot and size come from its children. */
export function PlacedBuiltInArt({ transform, children }: PlacedBuiltInArtProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={toBuiltInOffsetStyle(transform)} data-testid="placed-built-in">
      {children}
    </div>
  );
}

/** A variant's image at its saved position and size, relative to the tile. */
export function PlacedVariantImage({ src, transform }: PlacedVariantImageProps) {
  return (
    <div className="pointer-events-none absolute" style={toPlacementStyle(transform)} data-testid="placed-variant">
      <Image src={src} alt="" fill className="object-contain" unoptimized />
    </div>
  );
}
