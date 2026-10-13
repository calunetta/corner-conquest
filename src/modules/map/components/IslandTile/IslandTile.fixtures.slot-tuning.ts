import type { Island, Player } from '@/lib/types';
import { IslandType, ResourceType } from '@/lib/types';

/** One army per corner (br, tr, tl, bl — BOAT_CORNER_POSITIONS order), each a different
 *  player color, so every corner's knight-vs-resource/forest overlap is visible at once.
 *  Exported standalone so the interactive slot lab (IslandTile.preview.tsx) can build its
 *  own islands with the same occupant set without going through buildSlotTuningFixtures. */
export function buildCornerOccupants4(localPlayer: Player, opponentPlayer: Player, thirdPlayer: Player, fourthPlayer: Player) {
  return [
    { playerId: localPlayer.id, armyId: localPlayer.armies[0].id },
    { playerId: opponentPlayer.id, armyId: opponentPlayer.armies[0].id },
    { playerId: thirdPlayer.id, armyId: thirdPlayer.armies[0].id },
    { playerId: fourthPlayer.id, armyId: fourthPlayer.armies[0].id },
  ];
}

/** Corner-occupant fixtures, split out of IslandTile.fixtures.ts to stay under max-lines: every
 *  occupant-vs-node/tree collision shape in one set of states. Edit OCCUPANT_CORNER_SLOTS /
 *  TileOccupants.styles.ts and reload the matching testbed state (group "Game map" > "Island
 *  Tile") to check a corner. */
export function buildSlotTuningFixtures(
  localPlayer: Player,
  opponentPlayer: Player,
  thirdPlayer: Player,
  fourthPlayer: Player,
) {
  const threeOccupants = [
    { playerId: localPlayer.id, armyId: localPlayer.armies[0].id },
    { playerId: opponentPlayer.id, armyId: opponentPlayer.armies[0].id },
    { playerId: localPlayer.id, armyId: localPlayer.armies[1].id },
  ];

  const resourceIslandWithTwoNodesAndThreeOccupants: Island = {
    id: 'resource-two-three-occ', x: 3, y: 0, type: IslandType.Resource,
    resources: [{ type: ResourceType.Food, amount: 1 }, { type: ResourceType.Wood, amount: 1 }],
    occupants: threeOccupants, positionedBy: [],
  };

  const resourceIslandWithThreeNodesAndThreeOccupants: Island = {
    id: 'resource-three-three-occ', x: 3, y: 1, type: IslandType.Resource,
    resources: [
      { type: ResourceType.Food, amount: 1 }, { type: ResourceType.Wood, amount: 1 }, { type: ResourceType.Gold, amount: 1 },
    ],
    occupants: threeOccupants, positionedBy: [],
  };

  const emptyIslandWithThreeOccupants: Island = {
    id: 'empty-three-occ', x: 3, y: 2, type: IslandType.Empty,
    resources: [], occupants: threeOccupants, positionedBy: [],
  };

  const emptyIslandWithTwoOccupants: Island = {
    id: 'empty-two-occ', x: 3, y: 4, type: IslandType.Empty,
    resources: [], occupants: threeOccupants.slice(0, 2), positionedBy: [],
  };

  /** One army per corner (br, tr, tl, bl — BOAT_CORNER_POSITIONS order), each a different
   *  player color, so every corner's knight-vs-resource/forest overlap is visible at once. */
  const cornerOccupants4 = [
    { playerId: localPlayer.id, armyId: localPlayer.armies[0].id },
    { playerId: opponentPlayer.id, armyId: opponentPlayer.armies[0].id },
    { playerId: thirdPlayer.id, armyId: thirdPlayer.armies[0].id },
    { playerId: fourthPlayer.id, armyId: fourthPlayer.armies[0].id },
  ];

  const resourceIslandSlotTuningSingle: Island = {
    id: 'slot-tuning-resource-1', x: 20, y: 20, type: IslandType.Resource,
    resources: [{ type: ResourceType.Gold, amount: 1 }], occupants: cornerOccupants4, positionedBy: [],
  };

  const resourceIslandSlotTuningDual: Island = {
    id: 'slot-tuning-resource-2', x: 21, y: 20, type: IslandType.Resource,
    resources: [{ type: ResourceType.Food, amount: 1 }, { type: ResourceType.Wood, amount: 1 }],
    occupants: cornerOccupants4, positionedBy: [],
  };

  const resourceIslandSlotTuningTriple: Island = {
    id: 'slot-tuning-resource-3', x: 22, y: 20, type: IslandType.Resource,
    resources: [
      { type: ResourceType.Food, amount: 1 }, { type: ResourceType.Wood, amount: 1 }, { type: ResourceType.Gold, amount: 1 },
    ],
    occupants: cornerOccupants4, positionedBy: [],
  };

  /** The real max (2 resource types x amount 2 each -> 4 nodes, see map-generation.ts), two of
   *  them farmed so the collector badge (QUAD_RESOURCE_SLOTS, TileResources.map.ts/.tsx) is in
   *  the stress test too, alongside all four knight corners. The worst-case tile for overlap. */
  const resourceIslandSlotTuningQuad: Island = {
    id: 'slot-tuning-resource-4', x: 24, y: 20, type: IslandType.Resource,
    resources: [
      { type: ResourceType.Food, amount: 2 }, { type: ResourceType.Wood, amount: 2 },
    ],
    occupants: cornerOccupants4,
    positionedBy: [{ playerId: localPlayer.id, resource: ResourceType.Food }],
  };

  /** x/y chosen so toForestLayout's seed (x*7 + y*13) is even -> EMPTY_GROVE_SLOTS.slice(0, 2). */
  const emptyIslandSlotTuningGrove2: Island = {
    id: 'slot-tuning-grove-2', x: 10, y: 10, type: IslandType.Empty,
    resources: [], occupants: cornerOccupants4, positionedBy: [],
  };

  /** x/y chosen so the same seed is odd -> EMPTY_GROVE_SLOTS.slice(0, 3). */
  const emptyIslandSlotTuningGrove3: Island = {
    id: 'slot-tuning-grove-3', x: 11, y: 10, type: IslandType.Empty,
    resources: [], occupants: cornerOccupants4, positionedBy: [],
  };

  /** Base tiles always render BASE_FOREST_SLOTS and (with resources) BASE_RESOURCE_SLOTS
   *  together, so this one state covers both tables plus all four occupant corners. */
  const baseIslandSlotTuningAll: Island = {
    id: 'slot-tuning-base', x: 23, y: 20, type: IslandType.Base, owner: localPlayer.id,
    resources: [
      { type: ResourceType.Food, amount: 1 }, { type: ResourceType.Wood, amount: 1 }, { type: ResourceType.Gold, amount: 1 },
    ],
    occupants: cornerOccupants4, positionedBy: [],
  };

  return {
    resourceIslandWithTwoNodesAndThreeOccupants,
    resourceIslandWithThreeNodesAndThreeOccupants,
    emptyIslandWithThreeOccupants,
    emptyIslandWithTwoOccupants,
    resourceIslandSlotTuningSingle,
    resourceIslandSlotTuningDual,
    resourceIslandSlotTuningTriple,
    resourceIslandSlotTuningQuad,
    emptyIslandSlotTuningGrove2,
    emptyIslandSlotTuningGrove3,
    baseIslandSlotTuningAll,
  };
}
