'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTileOccupants } from './TileOccupants.hook';
import { styles } from './TileOccupants.styles';
import type { TileOccupantsProps, OccupantSpriteViewModel } from './TileOccupants.types';

const positions = [
  { bottom: '0', left: '0', origin: 'origin-bottom-left' },
  { bottom: '0', right: '0', origin: 'origin-bottom-right' },
  { top: '0', left: '0', origin: 'origin-top-left' },
  { top: '0', right: '0', origin: 'origin-top-right' },
];

export function TileOccupantsView({ occupants }: { occupants: OccupantSpriteViewModel[] }) {
  return (
    <div className={styles.container}>
      {occupants.map((occupant, index) => {
        const pos = positions[index % 4];

        return (
          <div
            key={occupant.key}
            className={occupant.positionClasses}
            style={{ top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom }}
          >
            <Image
              src={occupant.sprite}
              alt={`${occupant.color} army`}
              width={64}
              height={64}
              className={cn(
                styles.image({ isFaded: occupant.isFaded }),
                pos.origin.includes('top') && 'top-0',
                pos.origin.includes('bottom') && 'bottom-0',
                pos.origin.includes('left') && 'left-0',
                pos.origin.includes('right') && 'right-0',
              )}
              unoptimized
            />
          </div>
        );
      })}
    </div>
  );
}

export function TileOccupants(props: TileOccupantsProps) {
  const { occupants } = useTileOccupants(props);

  return <TileOccupantsView occupants={occupants} />;
}
