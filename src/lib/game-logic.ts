import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor } from './types';

const MAP_SIZE = 8;
const NUM_CENTRAL_ISLANDS = 10;
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
      resources: { gold: 5, gems: 5, iron: 5 },
      armySize: 1,
      victoryPoints: 0,
      lastAction: null,
      specialCards: [],
      farmPosition: null,
    });
  });

  // Assign types to all non-base islands
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === 'base') continue;

      const islandType: IslandType = Math.random() < 0.2 ? 'monster' : (Math.random() < 0.1 ? 'special' : 'resource');
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gold', 'gems', 'iron'];
        map[y][x].resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
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
  };
}
