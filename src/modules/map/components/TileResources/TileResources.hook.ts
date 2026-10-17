import { useMemo } from 'react';
import { useGameBoard, useResourceGainEvents } from '@/modules/game-board';
import { RESOURCE_GAIN_ANIMATION_MS, useTransientPulses } from '@/modules/shared';
import { pickVariant, poolFor, toOffsetSlotStyle, useTileVariants, type TileVariant } from '../TileVariants';
import { toTileResourcesViewModel } from './TileResources.map';
import type { TileResourcesProps, ResourceNodeViewModel } from './TileResources.types';
import type { ResourceType } from '@/lib/types';

export function useTileResources(props: TileResourcesProps): { nodes: ResourceNodeViewModel[] | null } {
  const { gameState } = useGameBoard();
  const resourceGainEvents = useResourceGainEvents(gameState);
  const islandId = props.island.id;

  // Only gains that named this tile pulse it (Wealthy and Steal have no tileIds). Memoized so a
  // re-render with the same log keeps one trigger reference, and useTransientPulses does not re-pulse.
  const pulseTriggers = useMemo(
    () =>
      resourceGainEvents
        .filter((event) => event.tileIds.includes(islandId))
        .map((event) => ({ key: event.type })),
    [islandId, resourceGainEvents],
  );
  const gainPulses = useTransientPulses(pulseTriggers, RESOURCE_GAIN_ANIMATION_MS);

  const variants = useTileVariants();
  const seed = props.island.x * 31 + props.island.y;
  const builtInNodes = toTileResourcesViewModel(props.island, props.isBase ?? false, gameState.players, gainPulses);
  const nodes = builtInNodes?.map((node) => applyResourceVariant(node, pickResourceVariant(variants, node.type, seed))) ?? null;

  return { nodes };
}

function pickResourceVariant(variants: ReturnType<typeof useTileVariants>, type: ResourceType, seed: number): TileVariant | null {
  return pickVariant(poolFor(variants, `resource-${type}`), seed);
}

/** A resource variant replaces the sprite and size of every node of its type, and offsets each node from its slot. */
function applyResourceVariant(node: ResourceNodeViewModel, variant: TileVariant | null): ResourceNodeViewModel {
  if (!variant?.image) return node;
  return {
    ...node,
    spriteSrc: variant.image,
    nodeSize: `${variant.transform.size}%`,
    slotStyle: toOffsetSlotStyle(node.slotStyle, variant.transform),
  };
}
