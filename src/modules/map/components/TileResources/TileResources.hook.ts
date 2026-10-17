import { useMemo } from 'react';
import { useGameBoard, useResourceGainEvents } from '@/modules/game-board';
import { RESOURCE_GAIN_ANIMATION_MS, useTransientPulses } from '@/modules/shared';
import { useTileArt } from '../TileVariants';
import { toTileResourcesViewModel } from './TileResources.map';
import type { TileResourcesProps, ResourceNodeViewModel } from './TileResources.types';

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

  const tileArt = useTileArt();
  const builtInNodes = toTileResourcesViewModel(props.island, props.isBase ?? false, gameState.players, gainPulses);
  const nodes = builtInNodes?.map((node) => ({ ...node, spriteSrc: tileArt.resources[node.type] ?? node.spriteSrc })) ?? null;

  return { nodes };
}
