import { cn } from '@/lib/utils';
import type { FogTiming } from '../TileFog';
import type { Island } from '@/lib/types';
import { toRevealLayerStyle, styles } from './IslandTile.styles';
import { toTerrainStyle } from './IslandTile.terrain.map';

export interface TileGroundProps {
  island: Island;
  isNeutralFog: boolean;
  isTileVisible: boolean;
  timing: FogTiming;
  prefersReducedMotion: boolean;
}

/**
 * The tile's ground. With neutralFog on, a covered tile shows a grey island instead of its terrain, and
 * the real ground fades in over it on reveal, using the same timing as the content.
 */
export function TileGround({ island, isNeutralFog, isTileVisible, timing, prefersReducedMotion }: TileGroundProps) {
  return (
    <>
      {isNeutralFog && (
        <div className={styles.neutralGround} data-testid="tile-neutral-ground" />
      )}
      <div
        className={cn(styles.terrain, isNeutralFog && 'transition-opacity')}
        style={{
          ...toTerrainStyle(island),
          ...(isNeutralFog && { opacity: isTileVisible ? 1 : 0, ...toRevealLayerStyle(timing, prefersReducedMotion) }),
        }}
        data-testid="tile-terrain"
      />
    </>
  );
}
