import { CardName, PassiveAbilities, ResourceType } from './cards';
import { GameAction } from './actions';
import { PlayerPosition } from './map';

export const PlayerColor = {
  Blue: 'blue',
  Red: 'red',
  Purple: 'purple',
  Yellow: 'yellow',
} as const;
export type PlayerColor = (typeof PlayerColor)[keyof typeof PlayerColor];

export type Army = {
  id: number;
  position: { x: number; y: number };
  hasActed: boolean;
};

export type Player = {
  id: number; // This is the player's seat index (0-3)
  playerId: string; // This is the unique session ID from usePlayer
  name: string;
  color: PlayerColor;
  isBot: boolean;
  armies: Army[];
  resources: Record<ResourceType, number>;
  armyCount: number;
  attackPower: number;
  nextArmyCost: number;
  victoryPoints: number;
  specialCards: CardName[]; // Names of special cards
  positions: PlayerPosition[];
  hasExtraMove: boolean;
  actionsThisTurn: GameAction[];
  passiveAbilities: PassiveAbilities;
  isSabotaged: boolean;
  reinforceActive: boolean;
  efficientActive: boolean;
  masterBuilderActive: boolean;
  revealedTiles: string[];
};
