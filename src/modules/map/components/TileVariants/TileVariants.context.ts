import { createContext, useContext } from 'react';
import { DEFAULT_TILE_VARIANTS, resolveTileArt, type TileArt, type TileVariantsConfig } from './TileVariants.config';

/** Game defaults come from tile-variants.config.json. The testbed can provide its own selection. */
const TileVariantsContext = createContext<TileVariantsConfig>(DEFAULT_TILE_VARIANTS);

export const TileVariantsProvider = TileVariantsContext.Provider;

/** The art to draw for every slot right now. */
export function useTileArt(): TileArt {
  return resolveTileArt(useContext(TileVariantsContext));
}
