'use client';

import Image from 'next/image';
import { useTileOccupants } from './TileOccupants.hook';
import { styles } from './TileOccupants.styles';
import type { TileOccupantsProps, OccupantSpriteViewModel } from './TileOccupants.types';

export function TileOccupantsView({ occupants }: { occupants: OccupantSpriteViewModel[] }) {
  return (
    <div className={styles.container}>
      {occupants.map((occupant) => (
        <div
          key={occupant.key}
          className={styles.slot({ isOverflow: occupant.isOverflow })}
          style={occupant.slotStyle}
        >
          <Image
            src={occupant.sprite}
            alt={`${occupant.color} army`}
            fill
            className={styles.image({ isFaded: occupant.isFaded, isOverflow: occupant.isOverflow })}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}

export function TileOccupants(props: TileOccupantsProps) {
  const { occupants } = useTileOccupants(props);

  return <TileOccupantsView occupants={occupants} />;
}
