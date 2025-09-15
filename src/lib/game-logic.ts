import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor, IslandResource, FirestoreGameState } from './types';
import { SPECIAL_CARDS } from './card-data';

const MAP_SIZE = 7;
const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow'];

// Helper to convert 2D map to a flat array for Firestore
export function flattenMap(map: Island[][]): Island[] {
  return map.flat();
}

// Helper to convert flat array back to 2D map
export function unflattenMap(flatMap: Island[], size: number): Island[][] {
  const map: Island[][] = [];
  for (let i = 0; i < size; i++) {
    map.push(flatMap.slice(i * size, (i + 1) * size));
  }
  return map;
}

export function initializeGame(): GameState {
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
    { x: MAP_SIZE - 1, y: 0 },
    { x: 0, y: MAP_SIZE - 1 },
    { x: MAP_SIZE - 1, y: MAP_SIZE - 1 },
  ];

  basePositions.forEach((pos, i) => {
    const initialArmy = { id: 0, position: pos };
    map[pos.y][pos.x] = {
      ...map[pos.y][pos.x],
      type: 'base',
      owner: i,
      isHidden: false,
      occupants: [{playerId: i, armyId: initialArmy.id}],
      resources: [
        { type: 'gems', amount: 1 }, 
        { type: 'iron', amount: 1 }, 
        { type: 'food', amount: 1 }
      ], 
    };
    players.push({
      id: i,
      name: `Player ${i + 1}`,
      color: PLAYER_COLORS[i],
      armies: [initialArmy],
      resources: { gems: 0, iron: 0, food: 0 },
      armyCount: 1,
      attackPower: 0,
      nextArmyCost: 5,
      victoryPoints: 0,
      lastAction: null,
      specialCards: ['Extra Move', 'Steal Resource', 'Decide Dice Roll'], // Mock cards
      positions: [],
      hasExtraMove: false,
      actionsThisTurn: [],
    });
  });

  // --- New Distance-Based Island Generation ---
  const center = { x: Math.floor(MAP_SIZE / 2), y: Math.floor(MAP_SIZE / 2) };

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === 'base') continue;

      const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
      let islandType: IslandType;
      
      let rand = Math.random();
      // Adjust probabilities based on distance
      if (distance <= 1) { // Center
        if (rand < 0.5) islandType = 'monster';    // 50% chance
        else if (rand < 0.8) islandType = 'special';  // 30% chance
        else islandType = 'resource'; // 20% chance
      } else if (distance <= 3) { // Mid-ring
        if (rand < 0.6) islandType = 'resource'; // 60% chance
        else if (rand < 0.9) islandType = 'monster'; // 30% chance
        else islandType = 'special';  // 10% chance
      } else { // Outer ring
        if (rand < 0.85) islandType = 'resource'; // 85% chance
        else if (rand < 0.95) islandType = 'monster'; // 10% chance
        else islandType = 'special';  // 5% chance
      }

      if (x === center.x && y === center.y) {
          islandType = 'monster'; // The very center is always a monster
      }
      
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gems', 'iron', 'food'];
        const availableResources = [...resourceTypes];
        
        let numResourceTypes: number;
        if (distance <= 1) { 
            numResourceTypes = Math.random() < 0.7 ? 2 : 1; // 70% chance of 2 types
        } else if (distance <= 3) {
            numResourceTypes = Math.random() < 0.5 ? 2 : 1; // 50% chance of 2 types
        } else { 
            numResourceTypes = Math.random() < 0.3 ? 2 : 1; // 30% chance of 2 types
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

            if (distance <= 3) { // Higher chance for more spots closer to center
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
    map,
    players,
    currentPlayerIndex: 0,
    turn: 1,
    log: ['Game started!'],
    winner: null,
    selectedTile: null,
    selectedArmyId: 0, // Pre-select the first army
    possibleMoves: [],
    currentAction: null,
    specialCardsDeck: [...SPECIAL_CARDS],
    combatState: null,
    monsterCombatState: null,
    positionDialogState: null,
    showCardsDialog: false,
    stealResourceDialogState: null,
    useCardDialogState: null,
  };
}
