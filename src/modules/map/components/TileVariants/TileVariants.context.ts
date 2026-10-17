import { createContext, useContext } from 'react';
import { DEFAULT_TILE_VARIANTS_CONFIG, type TileVariantsConfig } from './TileVariants.config';

/** Game defaults come from tile-variants.config.json. The testbed can provide a draft instead. */
const TileVariantsContext = createContext<TileVariantsConfig>(DEFAULT_TILE_VARIANTS_CONFIG);

export const TileVariantsProvider = TileVariantsContext.Provider;

export function useTileVariants(): TileVariantsConfig {
  return useContext(TileVariantsContext);
}
