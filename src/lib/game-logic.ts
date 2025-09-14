import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor } from './types';

const MAP_SIZE = 8;
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
    map[pos.y][pos.x] = {
      ...map[pos.y][pos.x],
      type: 'base',
      isHidden: false,
      occupants: [i],
    };
    players.push({
      id: i,
      name: `Player ${i + 1}`,
      color: PLAYER_COLORS[i],
      position: pos,
      resources: { gems: 0, iron: 0, food: 0 },
      armySize: 1,
      nextArmyCost: 5,
      victoryPoints: 0,
      lastAction: null,
      specialCards: [],
      farmPosition: null,
      occupiedResourceTiles: [],
    });
  });

  // Assign types to all non-base islands
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === 'base') continue;

      const islandType: IslandType = Math.random() < 0.2 ? 'monster' : (Math.random() < 0.1 ? 'special' : 'resource');
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gems', 'iron', 'food'];
        const numResources = Math.random() < 0.2 ? 1 : (Math.random() < 0.8 ? 2 : 3); // 20% for 1, 64% for 2, 16% for 3
        for(let i = 0; i < numResources; i++) {
          map[y][x].resources.push(resourceTypes[Math.floor(Math.random() * resourceTypes.length)]);
        }
      }
    }
  }
  
  // Reveal bases
  players.forEach(p => {
    map[p.position.y][p.position.x].isHidden = false;
  });

  return {
    map,
    players,
    currentPlayerIndex: 0,
    turn: 1,
    log: ['Game started!'],
    winner: null,
    selectedTile: null,
    possibleMoves: [],
    currentAction: null,
    specialCardsDeck: [...SPECIAL_CARDS],
  };
}
