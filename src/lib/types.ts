import type { MonsterEncounterOutput } from "@/ai/flows/monster-encounter-generation";

export type ResourceType = 'gems' | 'iron' | 'food';
export type IslandType = 'base' | 'resource' | 'monster' | 'special' | 'empty';
export type PlayerColor = 'blue' | 'red' | 'green' | 'yellow';

export type Player = {
  id: number;
  name: string;
  color: PlayerColor;
  position: { x: number; y: number };
  resources: Record<ResourceType, number>;
  armySize: number;
  nextArmyCost: number;
  victoryPoints: number;
  lastAction: GameAction | null;
  specialCards: string[]; // Names of special cards
  positions: { x: number, y: number }[];
  occupiedResourceTiles: { x: number; y: number }[];
};

export type Island = {
  id: string;
  x: number;
  y: number;
  type: IslandType;
  isHidden: boolean;
  resources: ResourceType[];
  occupants: number[]; // player ids
  isFetchingMonster?: boolean;
  monsterDetails?: MonsterEncounterOutput;
  positionedBy?: number[]; // player ids
};

export type CombatState = {
  attackerId: number;
  defenderId: number;
  attackerRolls: number[];
  defenderRolls: number[];
  winnerId: number | null;
  phase: 'rolling' | 'results';
};

export type GameState = {
  map: Island[][];
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  log: string[];
  winner: Player | null;
  selectedTile: { x: number, y: number } | null;
  possibleMoves: { x: number, y: number }[];
  currentAction: GameAction | null;
  specialCardsDeck: string[];
  combatState: CombatState | null;
};

export type GameAction = 'deploy' | 'collect' | 'move' | 'attack' | 'position' | 'buy-card';