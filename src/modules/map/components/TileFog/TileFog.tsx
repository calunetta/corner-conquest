'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useFogSettings } from './TileFog.context';
import { useFogPhase } from './TileFog.hook';
import { toFogVariant } from './TileFog.config';
import { styles, toFogLayerStyle } from './TileFog.styles';
import type { TileFogProps } from './TileFog.types';

/**
 * Fog over an undiscovered tile. Covered: the variant's still frame. On discovery its gif plays one
 * pass and fades out slowly before it is removed; the tile's content, already rendered beneath, fades in.
 */
export function TileFog({ isCovered, prefersReducedMotion, variantSeed }: TileFogProps) {
  const { timing, variants } = useFogSettings();
  const variant = toFogVariant(variants, variantSeed);
  const { phase, liftId } = useFogPhase(isCovered, prefersReducedMotion, timing, variant.passMs);
  // The gif is not decoded when it mounts, so an empty frame would show until its first frame loads.
  // The still stays underneath until then; the gif paints over it, and the still is removed on load.
  const [loadedLiftId, setLoadedLiftId] = useState<number | null>(null);
  const isPlayingPass = phase === 'lifting' || phase === 'fadingOut';
  const isPassLoaded = loadedLiftId === liftId;
  const showStill = phase === 'covered' || (isPlayingPass && !isPassLoaded);

  return (
    <div
      data-testid="tile-fog"
      data-phase={phase}
      data-variant={variant.id}
      aria-hidden="true"
      className={cn(
        styles.layer,
        phase === 'fadingOut' && styles.layerFadingOut,
        phase === 'cleared' && styles.layerCleared,
      )}
      style={toFogLayerStyle(timing, variant.passMs, prefersReducedMotion)}
    >
      {showStill && (
        <Image key={`still-${variant.id}`} src={variant.still} alt="" fill className={styles.image} unoptimized />
      )}
      {isPlayingPass && (
        <Image
          key={`pass-${variant.id}-${liftId}`}
          src={variant.animation}
          alt=""
          fill
          className={styles.image}
          unoptimized
          onLoad={() => setLoadedLiftId(liftId)}
        />
      )}
    </div>
  );
}
