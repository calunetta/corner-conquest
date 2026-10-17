import { createContext, useContext } from 'react';
import { DEFAULT_TILE_VARIANTS_CONFIG, type TileVariant, type TileVariantsConfig } from './TileVariants.config';

/** Game defaults come from tile-variants.config.json. The testbed can provide a draft instead. */
const TileVariantsContext = createContext<TileVariantsConfig>(DEFAULT_TILE_VARIANTS_CONFIG);

export const TileVariantsProvider = TileVariantsContext.Provider;

export function useTileVariants(): TileVariantsConfig {
  return useContext(TileVariantsContext);
}

/** The board's variant per tile id, from assignTileVariants. Absent outside the board (previews, editors). */
const TileVariantAssignmentContext = createContext<ReadonlyMap<string, string> | null>(null);

export const TileVariantAssignmentProvider = TileVariantAssignmentContext.Provider;

/** The variant this tile was given on the board, or null when there is no assignment for it. */
export function useAssignedTileVariant(tileId: string): TileVariant | null {
  const assignments = useContext(TileVariantAssignmentContext);
  const { variants } = useTileVariants();
  const variantId = assignments?.get(tileId);
  return variants.find((variant) => variant.id === variantId) ?? null;
}
