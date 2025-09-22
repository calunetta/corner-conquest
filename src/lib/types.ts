

export const MAP_ROWS = 6;
export const MAP_COLS = 5;

export enum GameAction {
  Deploy = 'deploy',
  Move = 'move',
  Attack = 'attack',
  Position = 'position',
  BuyCard = 'buy-card',
  Upgrade = 'upgrade',
  OpenAbilitiesShop = 'open-abilities-shop',
  CloseAbilitiesShop = 'close-abilities-shop',
  ShowCards = 'show-cards',
  CloseCards = 'close-cards',
  UseCard = 'use-card',
  UseProductiveCard = 'use-productive-card',
  EndTurn = 'end-turn',
  Teleport = 'teleport',
  BuyAbility = 'buy-ability',
  CancelAction = 'cancel-action',
  DeselectArmy = 'deselect-army',
  TileClick = 'tile-click',
  SelectResourcePosition = 'select-resource-position',
  SelectArmy = 'select-army',
  SelectDefender = 'select-defender',
  CombatRoll = 'combat-roll',
  CloseCombat = 'close-combat',
  MonsterCombatRoll = 'monster-combat-roll',
  CloseMonsterCombat = 'close-monster-combat',
  StealResource = 'steal-resource',
  SabotagePlayer = 'sabotage-player',
  GainWealth = 'gain-wealth',
  RollOnSpecialIsland = 'roll-on-special-island',
  CloseSpecialIslandDialog = 'close-special-island-dialog',
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
    [key in AbilityName]: boolean;
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
  useDecideDiceRollCard: boolean;
  decidedRollValue: number;
};

export type PositionDialogState = {
  x: number;
  y: number;
  resources: IslandResource[];
}

export type ProductiveCardDialogState = {
    isOpen: boolean;
    options: {
        resource: ResourceType;
        amount: number;
        x: number;
        y: number;
    }[];
}

export type SpecialIslandRollDialogState = {
  isOpen: boolean;
  roll: number | null;
  cardDrawn: CardName | null;
};

export type StealResourceDialogState = {
    isOpen: boolean;
}

export type SabotageDialogState = {
  isOpen: boolean;
}

export type WealthyDialogState = {
    isOpen: boolean;
}

export type ScoutingState = {
    count: number;
    cardName: CardName;
}

export type TeleportState = {
    armyId: number | null;
    cardName: CardName;
};


export type AbilitiesShopState = {
    isOpen: boolean;
}

export type ArmySelectionDialogState = {
    isOpen: boolean;
    x: number;
    y: number;
    armies: Army[];
}

export type AttackSelectionDialogState = {
    isOpen: boolean;
    x: number;
    y: number;
    attackingArmyId: number;
    defendingPlayer: Player;
    armies: Army[];
}

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
  combatState: CombatState | null;
  monsterCombatState: MonsterCombatState | null;
  positionDialogState: PositionDialogState | null;
  productiveCardDialogState: ProductiveCardDialogState | null;
  specialIslandRollDialogState: SpecialIslandRollDialogState | null;
  stealResourceDialogState: StealResourceDialogState | null;
  abilitiesShopState: AbilitiesShopState | null;
  sabotageDialogState: SabotageDialogState | null;
  wealthyDialogState: WealthyDialogState | null;
  scoutingState: ScoutingState | null;
  teleportState: TeleportState | null;
  armySelectionDialogState: ArmySelectionDialogState | null;
  attackSelectionDialogState: AttackSelectionDialogState | null;
  showHostLeaveDialog: boolean;
};

export type ActionHandlerResult = {
    newState: GameState;
    selectedArmyId?: number | null;
    possibleMoves?: {x:number, y:number}[];
    currentAction?: GameAction | null;
    selectedTile?: {x: number, y: number} | null;
}
