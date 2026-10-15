'use client';

import { IslandType } from '@/lib/types';
import {
  createBaseViewModel,
  createViewModel,
  IslandTileView,
  labGameStateFixture,
  localPlayerFixture,
} from '@/modules/map';
import type { DecorationInstance, DecorationScenarioKey, IslandTileViewModel } from '@/modules/map';
import { GameBoardProvider } from '@/modules/game-board';
import { toReferenceIsland } from './TileDecorationEditor.display.map';
import { styles } from './TileDecorationEditor.styles';
import { TileDecorationEditorSprite } from './TileDecorationEditorSprite';

const EMPTY_LAYOUT_HINT = 'No decorations — pick an image to add one';

interface TileDecorationEditorCanvasProps {
  scenarioKey: DecorationScenarioKey;
  instances: DecorationInstance[];
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string) => void;
  onDragInstance: (instanceId: string, top: number, left: number) => void;
  onNudgeInstance: (instanceId: string, dTop: number, dLeft: number) => void;
}

/** Wraps the reference tile in the same GameBoardProvider the slot lab uses. debugMode (in
 *  labGameStateFixture) keeps the tile visible without pre-registering its id in any player's map. */
function WithReferenceGameBoardContext({ viewModel }: { viewModel: IslandTileViewModel }) {
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

/** The realistic tile, with its own decoration layer hidden (see styles.tileFrame) and the editor's
 *  draggable sprites drawn in its place at the same z-[12] slot. */
export function TileDecorationEditorCanvas({
  scenarioKey,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onDragInstance,
  onNudgeInstance,
}: TileDecorationEditorCanvasProps) {
  const island = toReferenceIsland(scenarioKey);
  const viewModel =
    island.type === IslandType.Base ? createBaseViewModel(island, localPlayerFixture) : createViewModel(island);

  return (
    <div className={styles.tileFrame}>
      <WithReferenceGameBoardContext viewModel={viewModel} />
      <div className={styles.decorationOverlay}>
        {instances.map((instance, index) => (
          <TileDecorationEditorSprite
            key={instance.id}
            instance={instance}
            index={index}
            count={instances.length}
            isSelected={instance.id === selectedInstanceId}
            onSelect={() => onSelectInstance(instance.id)}
            onDrag={(top, left) => onDragInstance(instance.id, top, left)}
            onNudge={(dTop, dLeft) => onNudgeInstance(instance.id, dTop, dLeft)}
          />
        ))}
      </div>
      {instances.length === 0 && <p className={styles.emptyHint}>{EMPTY_LAYOUT_HINT}</p>}
    </div>
  );
}
