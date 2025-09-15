import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor, IslandResource } from './types';
import { SPECIAL_CARDS } from './card-data';

const MAP_SIZE = 7;
const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow'];

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
      specialCards: ['Extra Move', 'Steal Resource', 'Extra Move'], // Mock cards
      positions: [],
    });
  });

  // Assign types to all non-base islands
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === 'base') continue;
      
      let islandType: IslandType = 'resource';
      const rand = Math.random();
      // ~62.5% resource, ~25% monster, ~12.5% special (5:2:1 ratio)
      if (rand < 0.25) { 
        islandType = 'monster';
      } else if (rand < 0.25 + 0.125) {
        islandType = 'special';
      }
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gems', 'iron', 'food'];
        const availableResources = [...resourceTypes];
        
        const numResourceTypes = Math.random() < 0.7 ? 1 : 2;
        const islandResources: IslandResource[] = [];

        if (numResourceTypes === 1) {
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
            islandResources.push({ type: selectedResourceType, amount: 2 });
        } else { // numResourceTypes === 2
            // Select two different resources
            const firstRandomIndex = Math.floor(Math.random() * availableResources.length);
            const firstResourceType = availableResources.splice(firstRandomIndex, 1)[0];
            
            const secondRandomIndex = Math.floor(Math.random() * availableResources.length);
            const secondResourceType = availableResources.splice(secondRandomIndex, 1)[0];

            // For each resource, decide between 1 or 2 spots
            const firstResourceAmount = Math.random() < 0.5 ? 1 : 2;
            const secondResourceAmount = Math.random() < 0.5 ? 1 : 2;

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
  };
}
