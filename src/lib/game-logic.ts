import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor, IslandResource } from './types';

const MAP_SIZE = 7;
const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow'];
const SPECIAL_CARDS = [
  'Extra Move', 'Steal Resource', 'Extra VP', 'Sabatoge', 'Reinforce', 
  'Scout', 'Overcome', 'Wealthy', 'Productive', 'Efficient',
  'Master Builder', 'War Chief', 'Diplomat', 'Explorer', 'Collector'
];


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
      specialCards: [],
      positions: [],
    });
  });

  // Assign types to all non-base islands
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === 'base') continue;
      
      let islandType: IslandType = 'resource';
      const rand = Math.random();
      // ~57% resource, ~28.5% monster, ~14.5% special
      if (rand < 0.285) { 
        islandType = 'monster';
      } else if (rand < 0.285 + 0.145) {
        islandType = 'special';
      }
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gems', 'iron', 'food'];
        const availableResources = [...resourceTypes];
        
        const numResourceTypes = Math.random() < 0.7 ? 1 : 2;
        
        const islandResources: IslandResource[] = [];
        for(let i = 0; i < numResourceTypes; i++) {
          if (availableResources.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
            const amount = Math.random() < 0.7 ? 1 : 2; // 70% chance of 1 spot, 30% for 2
            islandResources.push({ type: selectedResourceType, amount });
          }
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
    selectedArmyId: null,
    possibleMoves: [],
    currentAction: null,
    specialCardsDeck: [...SPECIAL_CARDS],
    combatState: null,
    monsterCombatState: null,
    positionDialogState: null,
  };
}
