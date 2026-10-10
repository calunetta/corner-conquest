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
            width: `${node.nodeSize}px`,
            height: `${node.nodeSize}px`,
            ...node.slotStyle,
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
            <div
              data-testid={`collector-farm-${node.farmingCollector.color}`}
              className={styles.collectorOverlay}
              style={{
                width: `${node.farmingCollector.size}px`,
                height: `${node.farmingCollector.size}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                [node.farmingCollector.side]: `${node.farmingCollector.offset}px`,
              }}
            >
              <Image
                src={node.farmingCollector.sprite}
                alt={`${node.farmingCollector.color} collector farming`}
                width={node.farmingCollector.size}
                height={node.farmingCollector.size}
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
