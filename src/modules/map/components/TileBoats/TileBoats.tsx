'use client';

import Image from 'next/image';
import { useIsMobile } from '@/modules/shared';
import { useTileBoats } from './TileBoats.hook';
import { styles } from './TileBoats.styles';
import type { TileBoatsProps, BoatEntryViewModel } from './TileBoats.types';

interface TileBoatsViewProps {
  boats: BoatEntryViewModel[] | null;
  /** False on mobile: the collector is a sub-legible speck at mobile tile sizes, so it is not rendered at all. */
  showIdleCollectors?: boolean;
}

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function TileBoatsView({ boats, showIdleCollectors = true }: TileBoatsViewProps) {
  if (!boats) return null;

  return (
    <div className={styles.container} data-testid="tile-boats">
      {boats.map((boat) => (
        <div key={boat.key} className={styles.boatEntry} style={boat.cornerStyle}>
          <div data-testid="docked-boat" className={styles.boat}>
            <Image
              src="/sprites/boat.gif"
              alt={`${boat.color} boat`}
              fill
              className={styles.boatImage}
              unoptimized
            />

            {showIdleCollectors && boat.showIdleCollector && boat.idleCollectorSprite && (
              <div data-testid={`collector-idle-${boat.color}`} className={styles.collectorOverlay}>
                <Image
                  src={boat.idleCollectorSprite}
                  alt={`${boat.color} collector idle`}
                  fill
                  className={styles.collectorImage}
                  unoptimized
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TileBoats(props: TileBoatsProps) {
  const { boats } = useTileBoats(props);
  const isMobile = useIsMobile();

  return <TileBoatsView boats={boats} showIdleCollectors={!isMobile} />;
}
