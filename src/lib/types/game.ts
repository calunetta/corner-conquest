import { CardName, AbilityName, ResourceType, CardRevealAnimation } from './cards';
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

/** One resource gain for the resource-gain animation. `tileIds` holds `Island.id` values the gain
 *  is attributed to; omitted means no tile (Wealthy, Steal). */
export type ResourceGainLogEntry = {
  type: ResourceType;
  amount: number;
  /** Island.id values this gain can be attributed to. Omitted = no tile (Wealthy, Steal). */
  tileIds?: string[];
};

/** Who may read a structured entry's full `message`. Absent on an entry = public (every player reads it).
 *  `owner`: only the entry's `playerId`. `tiles`: the `playerId` plus any viewer who can see one of
 *  `tileIds` (see `canViewerReadLogEntry` in `src/modules/game-rules/log-visibility.ts`). */
export type LogVisibility = { scope: 'owner' } | { scope: 'tiles'; tileIds: string[] };

export type StructuredLogEntry = {
  kind: 'structured';
  turn: number; // GameState.turn at push time; 0 = pre-game (lobby)
  category: LogCategory;
  message: string; // fully-formatted display string, same role as today's plain strings
  playerId?: string; // acting player's Player.playerId
  targetPlayerId?: string; // second player referenced (sabotage, steal, combat winner/loser)
  isMilestone?: boolean; // true only for the 4 game-won lines; always shown, ignores the declutter toggle
  isPassive?: boolean; // true for routine/automatic entries; hidden by the declutter toggle by default
  /** Set only on the two collection log entries (automatic + Productive-card); lets a client
   *  derive a toast without re-parsing `message`. Never read by GameLog rendering. */
  resourcesCollected?: Partial<Record<ResourceType, number>>;
  /** Set on every log entry that increases `playerId`'s resources, for the resource-gain
   *  animation feature. `playerId` is always the gainer. Independent of `resourcesCollected`
   *  (toast-only) — adding this never changes which entries toast. */
  resourceGain?: ResourceGainLogEntry[];
  visibility?: LogVisibility; // who may read `message`; absent = public
  /** Shown instead of `message` to viewers `visibility` excludes. Required whenever `visibility` is set,
   *  so every player still learns that the event happened without learning the hidden detail. */
  redactedMessage?: string;
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
  /** Epoch ms of each human seat's last heartbeat write, keyed by `Player.id` (seat index).
   *  A missing key means no heartbeat yet (equivalent to the old `lastSeenAt: null`); bot seats
   *  never get an entry. Written by `writeHeartbeat` via a single-field-path `updateDoc`, so a
   *  heartbeat write is never version-checked against the rest of the document. Cleared (key
   *  deleted) by `convertSeatToBot` on takeover. */
  heartbeats: Partial<Record<number, number>>;
  currentPlayerIndex: number;
  turn: number;
  log: LogEntry[];
  winner: Player | null;
  specialCardsDeck: CardName[];
  discardPile: CardName[];
  deathAnimations: DeathAnimation[];
  cardRevealAnimations: CardRevealAnimation[];

  // SHARED DIALOG STATES (Only those that require all players to see or interact)
  combatState: CombatState | null;
  monsterCombatState: MonsterCombatState | null;
  productiveDialogState: { playerId: number } | null;
};

// Result of a reducer. Can only include state changes.
export type ActionHandlerResult = {
  state: GameState;
};
