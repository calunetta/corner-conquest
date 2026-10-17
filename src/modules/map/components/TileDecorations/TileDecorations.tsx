'use client';

import Image from 'next/image';
import { toDecorationLayout } from './TileDecorations.map';
import { styles } from './TileDecorations.styles';
import type { TileDecorationsProps } from './TileDecorations.types';

export function TileDecorations({ island, isBase = false, layouts }: TileDecorationsProps) {
  const layout = layouts ? toDecorationLayout(island, isBase, layouts) : toDecorationLayout(island, isBase);

  return (
    <div className={styles.container} data-testid="tile-decorations">
      {layout.instances.map((instance) => (
        <div
          key={instance.id}
          data-testid="tile-decoration"
          className={styles.decoration}
          style={{
            top: `${instance.top}%`,
            left: `${instance.left}%`,
            width: `${instance.size}%`,
            height: `${instance.size}%`,
            zIndex: instance.z,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Image src={instance.image} alt="Island decoration" fill className={styles.image} unoptimized />
        </div>
      ))}
    </div>
  );
}
