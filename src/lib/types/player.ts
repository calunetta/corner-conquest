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
  /** True only when `isBot` became true because a human's seat was converted (exit or
   *  staleness timeout), not because it was a bot from match setup. Governs reclaim eligibility. */
  isVacant: boolean;
  /** True while a reclaim is pending because it's currently this seat's (bot) turn. Applied,
   *  and cleared, by handleEndTurn the moment that turn ends. */
  reclaimRequested: boolean;
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
  /** Stable catalog id ("human-01".."human-25"); absent/null => caller falls back to the
   *  existing color sprite. Never set for a bot. */
  avatarId?: string | null;
};
