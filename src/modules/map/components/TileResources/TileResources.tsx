'use client';

import Image from 'next/image';
import { useTileResources } from './TileResources.hook';
import { styles } from './TileResources.styles';
import type { TileResourcesProps, ResourceNodeViewModel } from './TileResources.types';

export function TileResourcesView({ nodes }: { nodes: ResourceNodeViewModel[] | null }) {
  if (!nodes) return null;

  return (
    <div className={styles.container} data-testid="tile-resources">
      {nodes.map((node) => (
        <div
          key={node.key}
          data-testid={`resource-node-${node.type}`}
          className={styles.nodeSlot}
          style={{
            ...node.slotStyle,
            width: `${node.nodeSize}px`,
            height: `${node.nodeSize}px`,
          }}
        >
          <div data-testid={`resource-sprite-${node.type}`} className={styles.resourceSprite}>
            <Image
              src={node.spriteSrc}
              alt={`${node.type} resource`}
              width={node.nodeSize}
              height={node.nodeSize}
              className={styles.image}
              unoptimized
            />
          </div>

          {node.farmingCollector && (
            <div data-testid={`collector-farm-${node.farmingCollector.color}`} className={styles.collectorOverlay}>
              <Image
                src={node.farmingCollector.sprite}
                alt={`${node.farmingCollector.color} collector farming`}
                width={32}
                height={32}
                className={styles.collectorImage}
                unoptimized
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TileResources(props: TileResourcesProps) {
  const { nodes } = useTileResources(props);

  return <TileResourcesView nodes={nodes} />;
}
