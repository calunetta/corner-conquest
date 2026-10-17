'use client';

import { WithGameBoardContext, createViewModelWithState } from '../IslandTile/IslandTile.preview.shared';
import { resourceIslandWithThreeNodesAndThreeOccupants } from '../IslandTile/IslandTile.fixtures';
import { FogSettingsProvider } from './TileFog.context';
import { DEFAULT_FOG_TIMING, DEFAULT_FOG_VARIANTS } from './TileFog.config';

const TILE_WIDTH_PX = 160;

/** Every configured fog variant, each on a covered tile, so each still can be checked side by side. */
export function TileFogVariantGallery() {
  return (
    <div className="flex flex-wrap gap-4">
      {DEFAULT_FOG_VARIANTS.map((variant) => (
        <figure key={variant.id} className="flex flex-col gap-2" style={{ width: TILE_WIDTH_PX }}>
          <FogSettingsProvider value={{ timing: DEFAULT_FOG_TIMING, variants: [variant] }}>
            <WithGameBoardContext
              viewModel={createViewModelWithState(resourceIslandWithThreeNodesAndThreeOccupants, { isTileVisible: false })}
            />
          </FogSettingsProvider>
          <figcaption className="text-center text-xs text-muted-foreground">{variant.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}
