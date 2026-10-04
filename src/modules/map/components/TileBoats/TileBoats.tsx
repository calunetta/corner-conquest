'use client';

import Image from 'next/image';
import { useTileBoats } from './TileBoats.hook';
import { styles } from './TileBoats.styles';
import type { TileBoatsProps, BoatEntryViewModel } from './TileBoats.types';

export function TileBoatsView({ boats }: { boats: BoatEntryViewModel[] | null }) {
  if (!boats) return null;

  return (
    <div className={styles.container} data-testid="tile-boats">
      {boats.map((boat) => (
        <div key={boat.key} className={styles.boatEntry} style={boat.cornerStyle}>
          <div data-testid="docked-boat" className={styles.boat}>
            <Image
              src="/sprites/boat.gif"
              alt={`${boat.color} boat`}
              width={32}
              height={32}
              className={styles.boatImage}
              unoptimized
            />

            {boat.showIdleCollector && boat.idleCollectorSprite && (
              <div data-testid={`collector-idle-${boat.color}`} className={styles.collectorOverlay}>
                <Image
                  src={boat.idleCollectorSprite}
                  alt={`${boat.color} collector idle`}
                  width={24}
                  height={24}
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

  return <TileBoatsView boats={boats} />;
}
