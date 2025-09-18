
import type { GameState, Island, Player, PlayerColor, FirestoreGameState } from './types';
import { PLAYER_COLORS } from './player-data';

export const TILE_SIZE = 150;
export const BASE_TILE_SIZE = 150;
export const TILE_GAP = 32;
export const MAP_ROWS = 6;
export const MAP_COLS = 5;


export function flattenMap(map: Island[][]): Island[] {
  return map.flat();
}

export function unflattenMap(flatMap: Island[], rows: number, cols: number): Island[][] {
  const map: Island[][] = [];
  if (!flatMap || flatMap.length === 0) {
    // Return an empty map of the correct dimensions if flatMap is empty
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }
  for (let i = 0; i < rows; i++) {
    map.push(flatMap.slice(i * cols, (i + 1) * cols));
  }
  return map;
}

export function addPlayerToGame(gameState: GameState, playerInfo: { playerId: string, name: string }): GameState | null {
    if (gameState.status !== 'waiting') {
        return null; // Game has started
    }
    if (gameState.players.length >= gameState.maxPlayers) {
        return null; // Game is full
    }
    if (gameState.players.some(p => p.playerId === playerInfo.playerId)) {
        return gameState; // Player is already in the game
    }

    const newGameState = JSON.parse(JSON.stringify(gameState));

    const usedColors = newGameState.players.map((p: Player) => p.color);
    const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));

    if (availableColors.length === 0) return null; // Should not happen if maxPlayers is 4

    const newPlayerColor = availableColors[0];
    const newPlayerSeatIndex = newGameState.players.length;
    
    const basePositions = [
        { x: 0, y: 0 },
        { x: MAP_COLS - 1, y: MAP_ROWS - 1 },
        { x: 0, y: MAP_ROWS - 1 },
        { x: MAP_COLS - 1, y: 0 },
    ];
    const newPlayerPos = basePositions[newPlayerSeatIndex];

    const newArmy = { id: 0, position: newPlayerPos, hasActed: false };
    
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
        isBot: false,
        armies: [newArmy],
        resources: { gems: 0, iron: 0, food: 0 },
        armyCount: 1,
        attackPower: 0,
        nextArmyCost: newGameState.settings.initialDeployCost,
        victoryPoints: 0,
        specialCards: ['Extra Move', 'Steal Resource', 'Decide Dice Roll'],
        positions: [],
        hasExtraMove: false,
        actionsThisTurn: [],
        passiveAbilities: { explorer: false, collector: false },
        isSabotaged: false,
        reinforceActive: false,
        scoutActive: false,
        wealthyActive: false,
        efficientActive: false,
        masterBuilderActive: false,
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
