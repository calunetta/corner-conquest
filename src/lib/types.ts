

export const MAP_ROWS = 6;
export const MAP_COLS = 5;
export const HAND_LIMIT = 7;

export enum GameAction {
  // Shared Game State Actions
  Deploy = 'deploy',
  Move = 'move',
  Attack = 'attack',
  SelectResourcePosition = 'select-resource-position',
  BuyCard = 'buy-card',
  Upgrade = 'upgrade',
  EndTurn = 'end-turn',
  BuyAbility = 'buy-ability',
  UseProductiveCard = 'use-productive-card',
  SabotagePlayer = 'sabotage-player',
  GainWealth = 'gain-wealth',
  StealResource = 'steal-resource',
  RollOnSpecialIsland = 'roll-on-special-island',
  CloseSpecialIslandDialog = 'close-special-island-dialog',
  SelectDefender = 'select-defender',
  CombatRoll = 'combat-roll',
  CloseCombat = 'close-combat',
  MonsterCombatRoll = 'monster-combat-roll',
  CloseMonsterCombat = 'close-monster-combat',
  UseCard = 'use-card',
  Scout = 'scout',
  HostLeave = 'host-leave',
  CancelAction = 'cancel-action',

  // Local UI Actions (prefixed with 'local:')
  local_DeselectArmy = 'local:deselect-army',
  local_CancelAction = 'local:cancel-action',
  local_ShowCards = 'local:show-cards',
  local_CloseCards = 'local:close-cards',
  local_OpenAbilitiesShop = 'local:open-abilities-shop',
  local_CloseAbilitiesShop = 'local:close-abilities-shop',
  local_UseCard = 'local:use-card',
  local_Position = 'local:position',
}

export enum CardName {
  ExtraMove = 'Extra Move',
  StealResource = 'Steal Resource',
  Sabotage = 'Sabotage',
  Reinforce = 'Reinforce',
  Scout = 'Scout',
  Overcome = 'Overcome',
  Wealthy = 'Wealthy',
  Productive = 'Productive',
  Efficient = 'Efficient',
  MasterBuilder = 'Master Builder',
  WarChief = 'War Chief',
  DecideDiceRoll = 'Decide Dice Roll',
  Teleport = 'Teleport',
}

export enum AbilityName {
  Explorer = 'explorer',
  Collector = 'collector',
}

export enum ResourceType {
    Gems = 'gems',
    Iron = 'iron',
    Wheat = 'wheat',
}

export enum IslandType {
    Base = 'base',
    Resource = 'resource',
    Monster = 'monster',
    Special = 'special',
    Empty = 'empty',
}

export enum PlayerColor {
    Blue = 'blue',
    Red = 'red',
    Purple = 'purple',
    Yellow = 'yellow',
}

export enum GameStatus {
    Waiting = 'waiting',
    Playing = 'playing',
    Finished = 'finished',
}

export enum MonsterName {
    Lancer = 'Lancer',
    Bear = 'Bear',
    Ogre = 'Ogre',
    Minotaur = 'Minotaur',
}


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
    gridSize: { rows: number, cols: number };
};

export type IslandResource = {
  type: ResourceType;
  amount: number;
}

export type PlayerPosition = {
  x: number;
  y: number;
  resource: ResourceType;
  armyId: number;
}

export type Army = {
  id: number;
  position: { x: number; y: number };
  hasActed: boolean;
}

export type PassiveAbilities = {
    [key in AbilityName]?: boolean;
}

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

export type Monster = {
  name: MonsterName;
  level: number;
  sprite: {
    idle: string;
    attack: string;
    death: string;
  }
}

export type Island = {
  id: string;
  x: number;
  y: number;
  type: IslandType;
  owner?: number;
  resources: IslandResource[];
  occupants: { playerId: number, armyId: number }[];
  monsters?: Monster[];
  positionedBy?: {playerId: number, resource: ResourceType}[];
};

export type CombatPhase = 'rolling' | 'results' | 'death';

export type CombatState = {
  attackerId: number;
  attackingArmyId: number;
  defenderId: number;
  defendingArmyId: number;
  attackerRolls: number[];
  defenderRolls: number[];
  winnerId: number | null;
  phase: CombatPhase;
};

export type MonsterCombatState = {
  attackerId: number;
  attackerPosition: { x: number, y: number };
  monster: Monster;
  attackerRolls: number[];
  monsterRolls: number[];
  winnerId: number | null;
  phase: CombatPhase;
};

export type DeathAnimation = {
    id: string; // "army-playerId-armyId" or "monster-x-y-name"
    x: number;
    y: number;
    sprite: string;
}

export type BaseTileInfo = {
    owner: number;
    x: number;
    y: number;
}

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
};

// Result of a reducer. Can include state changes and/or UI events.
export type ActionHandlerResult = {
    state: GameState | null;
    ui?: {
        newAttackSelectionDialogState?: {
            attackingArmyId: number;
            defendingPlayer: Player;
            armies: Army[];
        },
        specialIslandRoll?: { roll: number, cardDrawn: CardName | null }
    } | null
}
