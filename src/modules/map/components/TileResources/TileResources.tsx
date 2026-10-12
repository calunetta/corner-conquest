'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { useIsMobile } from '@/modules/shared';
import { useTileResources } from './TileResources.hook';
import { styles } from './TileResources.styles';
import type {
  FarmingCollectorViewModel,
  ResourceNodeViewModel,
  TileResourcesProps,
} from './TileResources.types';

interface TileResourcesViewProps {
  nodes: ResourceNodeViewModel[] | null;
  /** False on mobile: the badge is a sub-legible speck at mobile tile sizes, so it is not rendered at all. */
  showFarmingCollector?: boolean;
}

/**
 * Anchors the badge on the node's left-edge midpoint, always. The transform's percentages resolve
 * against the badge's own box, so the badge centers on that edge whatever its size.
 */
function toCollectorBadgeStyle({ size }: Pick<FarmingCollectorViewModel, 'size'>): CSSProperties {
  return { width: size, height: size, top: '50%', right: '100%', transform: 'translate(50%, -50%)' };
}

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function TileResourcesView({ nodes, showFarmingCollector = true }: TileResourcesViewProps) {
  if (!nodes) return null;

  return (
    <div className={styles.container} data-testid="tile-resources">
      {nodes.map((node) => (
        <div
          key={node.key}
          data-testid={`resource-node-${node.type}`}
          className={styles.nodeSlot}
          style={{
            width: node.nodeSize,
            height: node.nodeSize,
            ...node.slotStyle,
            // slot.top/left is the node's center; centering here (not baked into the slot
            // table) keeps FOOD_SCALE's size inflation growing symmetrically around that
            // point instead of overflowing past the tile in one direction.
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div data-testid={`resource-sprite-${node.type}`} className={styles.resourceSprite}>
            <Image
              src={node.spriteSrc}
              alt={`${node.type} resource`}
              fill
              className={styles.image}
              unoptimized
            />
          </div>

          {showFarmingCollector && node.farmingCollector && (
            <div
              data-testid={`collector-farm-${node.farmingCollector.color}`}
              className={styles.collectorOverlay}
              style={toCollectorBadgeStyle(node.farmingCollector)}
            >
              <Image
                src={node.farmingCollector.sprite}
                alt={`${node.farmingCollector.color} collector farming`}
                fill
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

/** Connected component for the island tile: reads the tile through its hook. */
export function TileResources(props: TileResourcesProps) {
  const { nodes } = useTileResources(props);
  const isMobile = useIsMobile();

  return <TileResourcesView nodes={nodes} showFarmingCollector={!isMobile} />;
}
