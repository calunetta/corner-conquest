
export type ResourceType = 'gems' | 'iron' | 'food';
export type IslandType = 'base' | 'resource' | 'monster' | 'special' | 'empty';
export type PlayerColor = 'blue' | 'red' | 'purple' | 'yellow';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export type GameSettings = {
    victoryPointGoal: number;
    vpPerIslandDiscovery: number;
    initialDeployCost: number;
    deployCostIncrement: number;
    upgradeCost: number;
    abilityCost: number;
    baseResourceAmount: number;
    resourceDensity: number; // 0-1, likelihood of resource vs monster
    availableCards: string[];
    availableAbilities: string[];
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
    explorer: boolean;
    collector: boolean;
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
  specialCards: string[]; // Names of special cards
  positions: PlayerPosition[];
  hasExtraMove: boolean;
  actionsThisTurn: GameAction[];
  passiveAbilities: PassiveAbilities;
  isSabotaged: boolean;
  reinforceActive: boolean;
  efficientActive: boolean;
  masterBuilderActive: boolean;
};

export type MonsterName = 'Lancer' | 'Bear' | 'Ogre' | 'Minotaur';

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
  isHidden: boolean;
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

export type CollectDialogState = {
    isOpen: boolean;
    x: number;
    y: number;
    resource: IslandResource;
    hasProductiveCard: boolean;
}

export type StealResourceDialogState = {
    targetPlayerId: number | null;
}

export type UseCardDialogState = {
    cardName: string;
}

export type TeleportState = {
    armyId: number | null;
}

export type SabotageDialogState = {
  isOpen: boolean;
}

export type WealthyDialogState = {
    isOpen: boolean;
}

export type ScoutingState = {
    count: number;
}

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

export type GameState = {
  id: string;
  name: string;
  status: GameStatus;
  maxPlayers: number;
  debugMode: boolean;
  settings: GameSettings;
  map: Island[][];
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  log: string[];
  winner: Player | null;
  specialCardsDeck: string[];
  discardPile: string[];
  combatState: CombatState | null;
  monsterCombatState: MonsterCombatState | null;
  positionDialogState: PositionDialogState | null;
  collectDialogState: CollectDialogState | null;
  showCardsDialogForPlayer: number | null;
  stealResourceDialogState: StealResourceDialogState | null;
  useCardDialogState: UseCardDialogState | null;
  teleportState: TeleportState | null;
  abilitiesShopState: AbilitiesShopState | null;
  showHostLeaveDialog?: boolean;
  sabotageDialogState: SabotageDialogState | null;
  wealthyDialogState: WealthyDialogState | null;
  scoutingState: ScoutingState | null;
  armySelectionDialogState: ArmySelectionDialogState | null;
  attackSelectionDialogState: AttackSelectionDialogState | null;
  deathAnimations: DeathAnimation[];
};

// This represents the main game document in Firestore, without the static map data.
export type FirestoreGameState = Omit<GameState, 'map'>;


export type GameAction = 
  | 'deploy' 
  | 'collect' 
  | 'move' 
  | 'attack' 
  | 'position' 
  | 'buy-card' 
  | 'upgrade' 
  | 'show-cards' 
  | 'use-card' 
  | 'confirm-use-card'
  | 'end-turn' 
  | 'teleport' 
  | 'open-abilities-shop' 
  | 'buy-ability' 
  | 'cancel-action'
  // Dialog actions
  | 'select-resource-position'
  | 'confirm-collection'
  | 'select-army'
  | 'select-defender'
  | 'combat-roll'
  | 'close-combat'
  | 'monster-combat-roll'
  | 'close-monster-combat'
  | 'steal-resource'
  | 'sabotage-player'
  | 'gain-wealth'
  ;
