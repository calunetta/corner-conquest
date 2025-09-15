import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor, IslandResource, FirestoreGameState } from './types';
import { SPECIAL_CARDS } from './card-data';

const MAP_SIZE = 7;
const ALL_PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow'];

export function flattenMap(map: Island[][]): Island[] {
  return map.flat();
}

export function unflattenMap(flatMap: Island[], size: number): Island[][] {
  const map: Island[][] = [];
  for (let i = 0; i < size; i++) {
    map.push(flatMap.slice(i * size, (i + 1) * size));
  }
  return map;
}

export function initializeGame(gameId: string, gameName: string, maxPlayers: number, creator: { playerId: string, name: string, color: PlayerColor }): GameState {
  const map: Island[][] = Array.from({ length: MAP_SIZE }, (_, y) =>
    Array.from({ length: MAP_SIZE }, (_, x) => ({
      id: `${x}-${y}`,
      x,
      y,
      type: 'empty',
      isHidden: true,
      occupants: [],
      resources: [],
      positionedBy: [],
      monsters: [],
    }))
  );

  const players: Player[] = [];
  
  const basePositions = [
    { x: 0, y: 0 },
    { x: MAP_SIZE - 1, y: MAP_SIZE - 1 },
    { x: 0, y: MAP_SIZE - 1 },
    { x: MAP_SIZE - 1, y: 0 },
  ];
  
  const creatorSeatIndex = 0;
  const creatorPos = basePositions[creatorSeatIndex];

  const initialArmy = { id: 0, position: creatorPos };
  map[creatorPos.y][creatorPos.x] = {
      ...map[creatorPos.y][creatorPos.x],
      type: 'base',
      owner: creatorSeatIndex,
      isHidden: false,
      occupants: [{ playerId: creatorSeatIndex, armyId: initialArmy.id }],
      resources: [
        { type: 'gems', amount: 1 }, 
        { type: 'iron', amount: 1 }, 
        { type: 'food', amount: 1 }
      ], 
  };
  
  players.push({
      id: creatorSeatIndex, // This is the seat index
      playerId: creator.playerId, // This is the unique session ID
      name: creator.name,
      color: creator.color,
      armies: [initialArmy],
      resources: { gems: 0, iron: 0, food: 0 },
      armyCount: 1,
      attackPower: 0,
      nextArmyCost: 5,
      victoryPoints: 0,
      lastAction: null,
      specialCards: ['Extra Move', 'Steal Resource', 'Decide Dice Roll'],
      positions: [],
      hasExtraMove: false,
      actionsThisTurn: [],
  });

  const center = { x: Math.floor(MAP_SIZE / 2), y: Math.floor(MAP_SIZE / 2) };

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === 'base' && map[y][x].owner !== undefined) continue;

      const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
      let islandType: IslandType;
      
      let rand = Math.random();
      if (distance <= 1) { 
        if (rand < 0.5) islandType = 'monster';    
        else if (rand < 0.8) islandType = 'special';  
        else islandType = 'resource'; 
      } else if (distance <= 3) {
        if (rand < 0.6) islandType = 'resource'; 
        else if (rand < 0.9) islandType = 'monster'; 
        else islandType = 'special';  
      } else {
        if (rand < 0.85) islandType = 'resource';
        else if (rand < 0.95) islandType = 'monster';
        else islandType = 'special';
      }

      if (x === center.x && y === center.y) {
          islandType = 'monster';
      }
      
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gems', 'iron', 'food'];
        const availableResources = [...resourceTypes];
        
        let numResourceTypes: number;
        if (distance <= 1) { 
            numResourceTypes = Math.random() < 0.7 ? 2 : 1;
        } else if (distance <= 3) {
            numResourceTypes = Math.random() < 0.5 ? 2 : 1;
        } else { 
            numResourceTypes = Math.random() < 0.3 ? 2 : 1;
        }
        
        const islandResources: IslandResource[] = [];

        if (numResourceTypes === 1) {
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
            islandResources.push({ type: selectedResourceType, amount: 2 });
        } else {
            const firstRandomIndex = Math.floor(Math.random() * availableResources.length);
            const firstResourceType = availableResources.splice(firstRandomIndex, 1)[0];
            
            const secondRandomIndex = Math.floor(Math.random() * availableResources.length);
            const secondResourceType = availableResources.splice(secondRandomIndex, 1)[0];

            let firstResourceAmount = 1;
            let secondResourceAmount = 1;

            if (distance <= 3) {
                if (Math.random() < 0.4) firstResourceAmount = 2;
                if (Math.random() < 0.4) secondResourceAmount = 2;
            } else {
                if (Math.random() < 0.2) firstResourceAmount = 2;
                if (Math.random() < 0.2) secondResourceAmount = 2;
            }
            
            islandResources.push({ type: firstResourceType, amount: firstResourceAmount });
            islandResources.push({ type: secondResourceType, amount: secondResourceAmount });
        }
        map[y][x].resources = islandResources;
      }
    }
  }
  
  players.forEach(p => {
    p.armies.forEach(army => {
        map[army.position.y][army.position.x].isHidden = false;
    })
  });

  return {
    id: gameId,
    name: gameName,
    status: 'waiting',
    maxPlayers,
    map,
    players,
    currentPlayerIndex: 0,
    turn: 0, // Turn 0 means game hasn't started
    log: [`Game '${gameName}' created by ${creator.name}! Waiting for players...`],
    winner: null,
    selectedTile: null,
    selectedArmyId: 0,
    possibleMoves: [],
    currentAction: null,
    specialCardsDeck: [...SPECIAL_CARDS],
    combatState: null,
    monsterCombatState: null,
    positionDialogState: null,
    showCardsDialogForPlayer: null,
    stealResourceDialogState: null,
    useCardDialogState: null,
  };
}

export function addPlayerToGame(gameState: GameState, playerInfo: { playerId: string, name: string }): GameState | null {
    if (gameState.players.length >= gameState.maxPlayers) {
        return null; // Game is full
    }
    if (gameState.players.some(p => p.playerId === playerInfo.playerId)) {
        return gameState; // Player is already in the game
    }

    const newGameState = JSON.parse(JSON.stringify(gameState));

    const usedColors = newGameState.players.map((p: Player) => p.color);
    const availableColors = ALL_PLAYER_COLORS.filter(c => !usedColors.includes(c));

    if (availableColors.length === 0) return null; // Should not happen if maxPlayers is 4

    const newPlayerColor = availableColors[0];
    const newPlayerSeatIndex = newGameState.players.length;
    
    const basePositions = [
        { x: 0, y: 0 },
        { x: MAP_SIZE - 1, y: MAP_SIZE - 1 },
        { x: 0, y: MAP_SIZE - 1 },
        { x: MAP_SIZE - 1, y: 0 },
    ];
    const newPlayerPos = basePositions[newPlayerSeatIndex];

    const newArmy = { id: 0, position: newPlayerPos };
    
    newGameState.map[newPlayerPos.y][newPlayerPos.x] = {
        ...newGameState.map[newPlayerPos.y][newPlayerPos.x],
        type: 'base',
        owner: newPlayerSeatIndex,
        isHidden: false,
        occupants: [{ playerId: newPlayerSeatIndex, armyId: newArmy.id }],
        resources: [
            { type: 'gems', amount: 1 }, 
            { type: 'iron', amount: 1 }, 
            { type: 'food', amount: 1 }
        ],
    };
    newGameState.map[newPlayerPos.y][newPlayerPos.x].isHidden = false;


    const newPlayer: Player = {
        id: newPlayerSeatIndex,
        playerId: playerInfo.playerId,
        name: playerInfo.name,
        color: newPlayerColor,
        armies: [newArmy],
        resources: { gems: 0, iron: 0, food: 0 },
        armyCount: 1,
        attackPower: 0,
        nextArmyCost: 5,
        victoryPoints: 0,
        lastAction: null,
        specialCards: ['Extra Move', 'Steal Resource', 'Decide Dice Roll'],
        positions: [],
        hasExtraMove: false,
        actionsThisTurn: [],
    };

    newGameState.players.push(newPlayer);
    newGameState.log.push(`${playerInfo.name} has joined the game!`);

    // If the game is now full, start it
    if (newGameState.players.length === newGameState.maxPlayers) {
        newGameState.log.push(`The game is full! Starting now.`);
        newGameState.turn = 1;
        newGameState.status = 'playing';
    }

    return newGameState;
}
