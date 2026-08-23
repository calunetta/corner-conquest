import { CardName, ResourceType } from './cards';
import { IslandResource } from './map';
import { Army, Player } from './player';
import { Monster } from './monsters';

export type ProductiveCardDialogState = {
  isOpen: boolean;
  options: {
    resource: ResourceType;
    amount: number;
  }[];
} | null;

export type SpecialIslandRollDialogState = {
  isOpen: boolean;
  roll: number | null;
  cardDrawn: CardName | null;
} | null;

export type ArmySelectionDialogState = {
  armies: Army[];
  x: number;
  y: number;
} | null;

export type AttackSelectionDialogState = {
  armies: Army[];
  defendingPlayer: Player;
  attackingArmyId: number;
} | null;

export type MonsterSelectionDialogState = {
  monsters: Monster[];
  attackingArmyId: number;
} | null;

export type PositionDialogState = {
  x: number;
  y: number;
  resources: IslandResource[];
  armyId: number;
} | null;

export type SabotageDialogState = {
  isOpen: boolean;
} | null;

export type StealResourceDialogState = {
  isOpen: boolean;
} | null;

export type WealthyDialogState = {
  isOpen: boolean;
} | null;

export type PendingAction =
  | { type: 'teleport'; cardName: CardName }
  | { type: 'scout'; cardName: CardName; count: number; scoutedTiles: string[] }
  | { type: 'extra-move'; cardName: CardName }
  | null;
