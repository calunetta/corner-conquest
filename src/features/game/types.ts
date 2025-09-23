
import type { Player, Army, CardName, IslandResource, ResourceType } from '@/lib/types';

// This file contains types that are EXCLUSIVELY for local client-side UI state
// within the GameBoard component. They are NOT part of the shared GameState
// and are never synchronized with Firebase.

/** A pending action that requires further user input on the client, like Teleport or Scout. */
export type PendingAction = { type: 'teleport', cardName: CardName } | { type: 'scout', cardName: CardName, count: number } | null;

/** State for the dialog that appears when a player clicks a tile with multiple friendly armies. */
export type ArmySelectionDialogState = { armies: Army[], x: number, y: number } | null;

/** State for the dialog to select a specific enemy army to attack. */
export type AttackSelectionDialogState = { armies: Army[], defendingPlayer: Player, attackingArmyId: number } | null;

/** State for the dialog to choose a resource to position an army on. */
export type PositionDialogState = { x: number; y: number; resources: IslandResource[]; armyId: number; } | null;

/** State for the dialog to choose a player to sabotage. */
export type SabotageDialogState = { isOpen: boolean } | null;

/** State for the dialog to choose a resource to steal. */
export type StealResourceDialogState = { isOpen: boolean } | null;

/** State for the dialog to choose a resource to gain from the 'Wealthy' card. */
export type WealthyDialogState = { isOpen: boolean } | null;

/** State for the dialog when a player has the 'Productive' card and collects resources. */
export type ProductiveCardDialogState = {
    isOpen: boolean;
    options: {
        resource: ResourceType;
        amount: number;
    }[];
} | null;

/** State for the dialog when landing on an already-discovered special island. */
export type SpecialIslandRollDialogState = {
  isOpen: boolean;
  roll: number | null;
  cardDrawn: CardName | null;
} | null;
