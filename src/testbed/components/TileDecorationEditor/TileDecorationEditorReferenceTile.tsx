'use client';

import { IslandType } from '@/lib/types';
import type { Island } from '@/lib/types';
import {
  createBaseViewModel,
  createViewModel,
  IslandTileView,
  labGameStateFixture,
  localPlayerFixture,
} from '@/modules/map';
import { GameBoardProvider } from '@/modules/game-board';

interface TileDecorationEditorReferenceTileProps {
  island: Island;
}

/** Wraps one reference island in the same GameBoardProvider the slot lab uses, so the editor's
 *  canvas renders the exact same tile the live game would. debugMode (in labGameStateFixture)
 *  keeps the tile visible without pre-registering its id in any player's map. */
export function TileDecorationEditorReferenceTile({ island }: TileDecorationEditorReferenceTileProps) {
  const viewModel =
    island.type === IslandType.Base ? createBaseViewModel(island, localPlayerFixture) : createViewModel(island);

  return (
    <GameBoardProvider
      gameId="preview_game"
      playerId={localPlayerFixture.playerId}
      serverGameState={labGameStateFixture}
      localPlayerFromServer={localPlayerFixture}
      isMyTurn={false}
      isHost={true}
      setGameState={async () => {}}
      onExit={() => {}}
    >
      <IslandTileView {...viewModel} />
    </GameBoardProvider>
  );
}
