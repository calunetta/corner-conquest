'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useFogSettings } from './TileFog.context';
import { useFogPhase } from './TileFog.hook';
import { toFogVariant } from './TileFog.config';
import { toNeutralFogStyle } from './TileFog.map';
import { styles, toFogLayerStyle } from './TileFog.styles';
import type { TileFogProps } from './TileFog.types';

/**
 * Fog over an undiscovered tile. Covered: the variant's still frame. On discovery its gif plays one
 * pass and fades out slowly before it is removed; the tile's content, already rendered beneath, fades in.
 */
export function TileFog({ isCovered, isNeutral = false, prefersReducedMotion, variantSeed }: TileFogProps) {
  const { timing, variants } = useFogSettings();
  const variant = toFogVariant(variants, variantSeed);
  const { phase, liftId } = useFogPhase(isCovered, prefersReducedMotion, timing, variant.passMs);
  const isPlayingPass = phase === 'lifting' || phase === 'fadingOut';

  return (
    <div
      data-testid="tile-fog"
      data-phase={phase}
      data-variant={variant.id}
      data-neutral={isNeutral}
      aria-hidden="true"
      className={cn(
        styles.layer,
        isNeutral && styles.layerNeutral,
        phase === 'fadingOut' && styles.layerFadingOut,
        phase === 'cleared' && styles.layerCleared,
      )}
      style={{
        ...toFogLayerStyle(timing, variant.passMs, prefersReducedMotion),
        ...toNeutralFogStyle(isNeutral),
      }}
    >
      {phase === 'covered' && (
        <Image key={`still-${variant.id}`} src={variant.still} alt="" fill className={styles.image} unoptimized />
      )}
      {isPlayingPass && (
        <Image key={`pass-${variant.id}-${liftId}`} src={variant.animation} alt="" fill className={styles.image} unoptimized />
      )}
    </div>
  );
}
