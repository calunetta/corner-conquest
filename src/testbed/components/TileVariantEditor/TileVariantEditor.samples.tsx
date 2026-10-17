'use client';

import { WithGameBoardContext, createBaseViewModel, createViewModelWithState } from '@/modules/map/components/IslandTile/IslandTile.preview.shared';
import {
  localPlayerFixture,
  monsterIslandWithLivingMonster,
  resourceIslandWithThreeNodesAndThreeOccupants,
  specialIsland,
  baseIslandOwnedByLocalPlayer,
} from '@/modules/map/components/IslandTile/IslandTile.fixtures';

const SAMPLE_WIDTH_PX = 150;

/** One tile of each kind, drawn with the editor's current selection through the shared provider. */
export function TileVariantSamples() {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">Preview</h3>
      <div className="flex flex-wrap gap-4">
        <div style={{ width: SAMPLE_WIDTH_PX }}>
          <WithGameBoardContext viewModel={createViewModelWithState(specialIsland, {})} />
        </div>
        <div style={{ width: SAMPLE_WIDTH_PX }}>
          <WithGameBoardContext viewModel={createViewModelWithState(monsterIslandWithLivingMonster, {})} />
        </div>
        <div style={{ width: SAMPLE_WIDTH_PX }}>
          <WithGameBoardContext viewModel={createViewModelWithState(resourceIslandWithThreeNodesAndThreeOccupants, {})} />
        </div>
        <div style={{ width: SAMPLE_WIDTH_PX }}>
          <WithGameBoardContext viewModel={createBaseViewModel(baseIslandOwnedByLocalPlayer, localPlayerFixture)} />
        </div>
      </div>
    </section>
  );
}
