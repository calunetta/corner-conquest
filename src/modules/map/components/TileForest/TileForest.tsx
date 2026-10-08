'use client';

import Image from 'next/image';
import { toForestLayout } from './TileForest.map';
import { styles } from './TileForest.styles';
import type { TileForestProps } from './TileForest.types';

export function TileForest({ island, isBase = false }: TileForestProps) {
  const layout = toForestLayout(island, isBase);

  if (!layout) return null;

  return (
    <div className={styles.container} data-testid="tile-forest">
      {layout.layout.map((pos, idx) => (
        <div
          key={`forest-tree-${idx}`}
          data-testid="tile-forest-tree"
          className={styles.tree}
          style={{
            top: pos.top,
            bottom: (pos as { bottom?: string }).bottom,
            left: (pos as { left?: string }).left,
            right: (pos as { right?: string }).right,
            width: pos.size,
            height: pos.size,
            zIndex: pos.z,
          }}
        >
          <Image src={layout.treeSprite} alt="Island Tree" fill className={styles.image} unoptimized />
        </div>
      ))}
    </div>
  );
}
