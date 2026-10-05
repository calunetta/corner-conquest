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

export type LogCategory = 'combat' | 'economy' | 'cards' | 'turn' | 'system';

export type StructuredLogEntry = {
  kind: 'structured';
  turn: number; // GameState.turn at push time; 0 = pre-game (lobby)
  category: LogCategory;
  message: string; // fully-formatted display string, same role as today's plain strings
  playerId?: string; // acting player's Player.playerId
  targetPlayerId?: string; // second player referenced (sabotage, steal, combat winner/loser)
  isMilestone?: boolean; // true only for the 4 game-won lines; always shown, ignores the declutter toggle
  isPassive?: boolean; // true for routine/automatic entries; hidden by the declutter toggle by default
};

export type LogEntry = string | StructuredLogEntry;

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
  log: LogEntry[];
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
