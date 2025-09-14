import type { MonsterEncounterOutput } from "@/ai/flows/monster-encounter-generation";

export type ResourceType = 'gold' | 'gems' | 'iron';
export type IslandType = 'base' | 'resource' | 'monster' | 'special' | 'empty';
export type PlayerColor = 'blue' | 'red' | 'green' | 'yellow';

export type Player = {
  id: number;
  name: string;
  color: PlayerColor;
  position: { x: number; y: number };
  resources: Record<ResourceType, number>;
  armySize: number;
  victoryPoints: number;
  lastAction: GameAction | null;
  specialCards: any[]; // Define later
  farmPosition: { x: number, y: number } | null;
};

export type Island = {
  id: string;
  x: number;
  y: number;
  type: IslandType;
  isHidden: boolean;
  resourceType?: ResourceType;
  occupants: number[]; // player ids
  isFetchingMonster?: boolean;
  monsterDetails?: MonsterEncounterOutput;
  farmedBy?: number; // player id
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
};

export type GameAction = 'deploy' | 'mine' | 'move' | 'attack' | 'farm';
