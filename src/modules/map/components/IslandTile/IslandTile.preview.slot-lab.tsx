'use client';

import { useMemo, useState } from 'react';
import { IslandType, ResourceType } from '@/lib/types';
import type { Island } from '@/lib/types';
import { IslandTileView } from './IslandTile';
import {
  localPlayerFixture,
  opponentPlayerFixture,
  thirdPlayerFixture,
  fourthPlayerFixture,
  cornerOccupants4,
  labGameStateFixture,
} from './IslandTile.fixtures';
import { GameBoardProvider } from '@/modules/game-board';
import type { IslandTileViewModel } from './IslandTile.types';
import { createViewModel, createBaseViewModel } from './IslandTile.preview.shared';
import { SlotLabControls } from './IslandTile.preview.slot-lab-controls';
import type { LabIslandType, LabResourceKey } from './IslandTile.preview.slot-lab.types';

/** Interactive "Slot lab" preview state, split across this file, IslandTile.preview.slot-lab-
 *  controls.tsx and IslandTile.preview.slot-lab.types.ts to stay under max-lines: pick the
 *  island type, which resources are present (amount + farmed, and by which corner), the tree
 *  count (Empty islands only), and how many corners have a knight. "Farmed" controls two things
 *  at once, same as the real game: the resource node shows that player's collector badge
 *  (TileResources), AND that corner's boat hides its idle collector (TileBoats —
 *  showIdleCollector is false once the army's `positions` includes it, see TileBoats.map.ts's
 *  isPositionedOnResource). Toggle farmed on/off per resource to compare the idle-in-boat
 *  collector against the actively-farming badge for the same army. */

/** Same as WithGameBoardContext (IslandTile.preview.tsx), but on a lab-built GameState
 *  (debugMode: true, so the lab's freely-chosen island id/x/y never has to be pre-registered
 *  anywhere), and an overridable `gameState` so the lab can swap in players with different
 *  `positions` (which corner's army is actively farming — that's what hides the idle collector
 *  in TileBoats, see below). */
function WithLabGameBoardContext({
  viewModel,
  gameState = labGameStateFixture,
}: {
  viewModel: IslandTileViewModel;
  gameState?: typeof labGameStateFixture;
}) {
  return (
    <GameBoardProvider
      gameId="preview_game"
      playerId={localPlayerFixture.playerId}
      serverGameState={gameState}
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

const LAB_ISLAND_TYPES: Record<LabIslandType, IslandType> = {
  empty: IslandType.Empty,
  base: IslandType.Base,
  resource: IslandType.Resource,
  special: IslandType.Special,
};

const LAB_RESOURCE_TYPES: Record<LabResourceKey, ResourceType> = {
  food: ResourceType.Food,
  wood: ResourceType.Wood,
  gold: ResourceType.Gold,
};

// toForestLayout's tree count for an Empty island comes from a seed derived from x/y
// (seed = x*7 + y*13; even -> 2 trees, odd -> 3), so these are picked to hit each count.
const LAB_EMPTY_COORDS: Record<2 | 3, { x: number; y: number }> = {
  2: { x: 10, y: 10 },
  3: { x: 11, y: 10 },
};

// Same 4 players/order as cornerOccupants4 (br, tr, tl, bl), so index N here is corner N there.
const LAB_CORNER_PLAYERS = [localPlayerFixture, opponentPlayerFixture, thirdPlayerFixture, fourthPlayerFixture];

export function IslandTileSlotLab() {
  const [islandType, setIslandType] = useState<LabIslandType>('resource');
  const [amounts, setAmounts] = useState<Record<LabResourceKey, 0 | 1 | 2>>({ food: 2, wood: 2, gold: 0 });
  const [farmed, setFarmed] = useState<Record<LabResourceKey, boolean>>({ food: true, wood: false, gold: false });
  const [farmingCorner, setFarmingCorner] = useState<Record<LabResourceKey, number>>({ food: 0, wood: 1, gold: 2 });
  const [occupantCount, setOccupantCount] = useState(4);
  const [treeCount, setTreeCount] = useState<2 | 3>(3);

  const island: Island = useMemo(() => {
    const resourceKeys: LabResourceKey[] = ['food', 'wood', 'gold'];
    const resources = resourceKeys
      .filter((key) => amounts[key] > 0)
      .map((key) => ({ type: LAB_RESOURCE_TYPES[key], amount: amounts[key] }));
    const positionedBy = resourceKeys
      .filter((key) => amounts[key] > 0 && farmed[key])
      .map((key) => ({
        playerId: cornerOccupants4[farmingCorner[key]].playerId,
        resource: LAB_RESOURCE_TYPES[key],
      }));

    const coords = islandType === 'empty' ? LAB_EMPTY_COORDS[treeCount] : { x: 99, y: 99 };

    return {
      id: 'slot-lab',
      x: coords.x,
      y: coords.y,
      type: LAB_ISLAND_TYPES[islandType],
      owner: islandType === 'base' ? localPlayerFixture.id : undefined,
      resources: islandType === 'special' ? [] : resources,
      occupants: cornerOccupants4.slice(0, occupantCount),
      positionedBy,
    };
  }, [islandType, amounts, farmed, farmingCorner, occupantCount, treeCount]);

  // armyId -> which resource it's farming, so its boat's idle collector can be hidden for it
  // (player.positions is what TileBoats.map.ts's isPositionedOnResource checks, independent
  // of island.positionedBy above, which only drives the resource-node badge).
  const farmingArmyToResource = useMemo(() => {
    const map = new Map<number, ResourceType>();
    (['food', 'wood', 'gold'] as LabResourceKey[]).forEach((key) => {
      if (amounts[key] > 0 && farmed[key]) {
        map.set(cornerOccupants4[farmingCorner[key]].armyId, LAB_RESOURCE_TYPES[key]);
      }
    });
    return map;
  }, [amounts, farmed, farmingCorner]);

  const labState = useMemo(() => {
    const players = LAB_CORNER_PLAYERS.map((player, cornerIndex) => {
      const armyId = cornerOccupants4[cornerIndex].armyId;
      const farmedResource = farmingArmyToResource.get(armyId);
      return {
        ...player,
        positions: farmedResource
          ? [{ x: island.x, y: island.y, resource: farmedResource, armyId }]
          : [],
      };
    });
    return { ...labGameStateFixture, players };
  }, [farmingArmyToResource, island.x, island.y]);

  const viewModel: IslandTileViewModel =
    islandType === 'base'
      ? createBaseViewModel(island, localPlayerFixture)
      : createViewModel(island);

  const totalNodes = (['food', 'wood', 'gold'] as LabResourceKey[]).reduce((sum, key) => sum + amounts[key], 0);

  return (
    <div className="flex flex-wrap items-start gap-8">
      <SlotLabControls
        islandType={islandType}
        onIslandTypeChange={setIslandType}
        treeCount={treeCount}
        onTreeCountChange={setTreeCount}
        amounts={amounts}
        onAmountChange={(key, value) => setAmounts((prev) => ({ ...prev, [key]: value }))}
        farmed={farmed}
        onFarmedChange={(key, value) => setFarmed((prev) => ({ ...prev, [key]: value }))}
        farmingCorner={farmingCorner}
        onFarmingCornerChange={(key, value) => setFarmingCorner((prev) => ({ ...prev, [key]: value }))}
        occupantCount={occupantCount}
        onOccupantCountChange={setOccupantCount}
        totalNodes={totalNodes}
      />

      <div className="w-[clamp(220px,28vw,340px)]">
        <WithLabGameBoardContext viewModel={viewModel} gameState={labState} />
      </div>
    </div>
  );
}
