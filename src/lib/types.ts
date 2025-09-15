
export type ResourceType = 'gems' | 'iron' | 'food';
export type IslandType = 'base' | 'resource' | 'monster' | 'special' | 'empty';
export type PlayerColor = 'blue' | 'red' | 'green' | 'yellow';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export type IslandResource = {
  type: ResourceType;
  amount: number;
}

export type PlayerPosition = {
  x: number;
  y: number;
  resource: ResourceType;
}

export type Army = {
  id: number;
  position: { x: number; y: number };
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
  lastAction: GameAction | null;
  specialCards: string[]; // Names of special cards
  positions: PlayerPosition[];
  hasExtraMove: boolean;
  actionsThisTurn: GameAction[];
  teleportState?: TeleportState | null; 
};

export type Monster = {
  id: 'little' | 'big';
  type: 'cub' | 'huge';
  level: number;
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

export type CombatState = {
  attackerId: number;
  defenderId: number;
  attackerRolls: number[];
  defenderRolls: number[];
  winnerId: number | null;
  phase: 'rolling' | 'results';
};

export type MonsterCombatState = {
  attackerId: number;
  monster: Monster;
  attackerRolls: number[];
  monsterRolls: number[];
  winnerId: number | null;
  phase: 'rolling' | 'results';
  useDecideDiceRollCard: boolean;
  decidedRollValue: number;
};

export type PositionDialogState = {
  x: number;
  y: number;
  resources: IslandResource[];
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

export type GameState = {
  id: string;
  name: string;
  status: GameStatus;
  maxPlayers: number;
  map: Island[][];
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  log: string[];
  winner: Player | null;
  selectedTile: { x: number, y: number } | null;
  selectedArmyId: number | null;
  possibleMoves: { x: number, y: number }[];
  currentAction: GameAction | null;
  specialCardsDeck: string[];
  combatState: CombatState | null;
  monsterCombatState: MonsterCombatState | null;
  positionDialogState: PositionDialogState | null;
  showCardsDialogForPlayer: number | null;
  stealResourceDialogState: StealResourceDialogState | null;
  useCardDialogState: UseCardDialogState | null;
  teleportState: TeleportState | null;
  showHostLeaveDialog?: boolean;
};

export type FirestoreGameState = Omit<GameState, 'map'> & {
  map: Island[];
  mapSize: number;
};


export type GameAction = 'deploy' | 'collect' | 'move' | 'attack' | 'position' | 'buy-card' | 'upgrade' | 'show-cards' | 'use-card' | 'end-turn' | 'teleport';
