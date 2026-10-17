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
import { TileVariantsProvider, type TileImage, type TileVariant } from '@/modules/map/components/TileVariants';

/** A base variant only draws for castles of its own colour, so the reference base takes that colour. */
function toReferenceOwner(artVariant: TileVariant | null) {
  return artVariant?.color ? { ...localPlayerFixture, color: artVariant.color } : localPlayerFixture;
}

interface TileDecorationEditorReferenceTileProps {
  island: Island;
  /** Drawn in place of the built-in art, so the tile shows the variant being decorated. */
  artVariant?: TileVariant | null;
  artImages?: TileImage[];
}

/** Wraps one reference island in the same GameBoardProvider the slot lab uses, so the editor's
 *  canvas renders the exact same tile the live game would. debugMode (in labGameStateFixture)
 *  keeps the tile visible without pre-registering its id in any player's map. */
export function TileDecorationEditorReferenceTile({ island, artVariant = null, artImages = [] }: TileDecorationEditorReferenceTileProps) {
  const viewModel =
    island.type === IslandType.Base ? createBaseViewModel(island, toReferenceOwner(artVariant)) : createViewModel(island);

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
      <TileVariantsProvider value={{ images: artImages, variants: artVariant ? [artVariant] : [] }}>
        <IslandTileView {...viewModel} />
      </TileVariantsProvider>
    </GameBoardProvider>
  );
}
