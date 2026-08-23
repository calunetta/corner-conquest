import { CardName, AbilityName } from './cards';
import { Player } from './player';
import { Island, BaseTileInfo } from './map';
import { CombatState, MonsterCombatState, DeathAnimation } from './combat';

export const GameStatus = {
  Waiting: 'waiting',
  Playing: 'playing',
  Finished: 'finished',
} as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export type GameSettings = {
  victoryPointGoal: number;
  vpPerIslandDiscovery: number;
  initialDeployCost: number;
  deployCostIncrement: number;
  upgradeCost: number;
  abilityCost: number;
  baseResourceAmount: number;
  resourceDensity: number; // 0-1, likelihood of resource vs monster
  availableCards: CardName[];
  availableAbilities: AbilityName[];
  fogOfWar: boolean;
  gridSize: { rows: number; cols: number };
};

// THIS IS THE AUTHORITATIVE SHARED STATE OBJECT
export type GameState = {
  id: string;
  name: string;
  status: GameStatus;
  maxPlayers: number;
  debugMode: boolean;
  settings: GameSettings;
  map: Island[];
  baseTiles: BaseTileInfo[];
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  log: string[];
  winner: Player | null;
  specialCardsDeck: CardName[];
  discardPile: CardName[];
  deathAnimations: DeathAnimation[];

  // SHARED DIALOG STATES (Only those that require all players to see or interact)
  combatState: CombatState | null;
  monsterCombatState: MonsterCombatState | null;
  productiveDialogState: { playerId: number } | null;
};

// Result of a reducer. Can only include state changes.
export type ActionHandlerResult = {
  state: GameState;
};
