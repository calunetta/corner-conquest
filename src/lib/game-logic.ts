

import type { GameState, Island, Player, PlayerColor, FirestoreGameState, BaseTileInfo } from './types';
import { PLAYER_COLORS } from './player-data';
import { createPlayer } from './game-initializer';

export const TILE_SIZE = 75;
export const BASE_TILE_SIZE = 150;
export const TILE_GAP = 16;
export const MAP_ROWS = 6;
export const MAP_COLS = 5;

function reconstructMap(flatMap: Island[]): Island[][] {
    const map: Island[][] = Array.from({ length: MAP_ROWS }, () => []);
    flatMap.forEach(island => {
        if (!map[island.y]) {
            map[island.y] = [];
        }
        map[island.y][island.x] = island;
    });
    return map;
}

export function addPlayerToGame(
    firestoreState: Omit<FirestoreGameState, 'id' | 'name'>,
    mapData: Island[],
    playerInfo: { playerId: string, name: string }
): { newGameState: Omit<FirestoreGameState, 'id' | 'name'> | null, updatedMap: Island[] | null, newBaseTile: BaseTileInfo | null } {
    
    if (firestoreState.status !== 'waiting') {
        return { newGameState: null, updatedMap: null, newBaseTile: null }; // Game has started
    }
    if (firestoreState.players.length >= firestoreState.maxPlayers) {
        return { newGameState: null, updatedMap: null, newBaseTile: null }; // Game is full
    }
    if (firestoreState.players.some(p => p.playerId === playerInfo.playerId)) {
        return { newGameState: firestoreState, updatedMap: mapData, newBaseTile: null }; // Player is already in the game
    }

    let newGameState = JSON.parse(JSON.stringify(firestoreState));
    let newMap = reconstructMap(mapData);

    const usedColors = newGameState.players.map((p: Player) => p.color);
    const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));

    if (availableColors.length === 0) return { newGameState: null, updatedMap: null, newBaseTile: null };

    const newPlayerColor = availableColors[0];
    const newPlayerSeatIndex = newGameState.players.length;
    
    const basePositions = [
        { x: 0, y: 0 },
        { x: MAP_COLS - 1, y: MAP_ROWS - 1 },
        { x: 0, y: MAP_ROWS - 1 },
        { x: MAP_COLS - 1, y: 0 },
    ];
    const newPlayerPos = basePositions[newPlayerSeatIndex];

    const newPlayer = createPlayer(
        newPlayerSeatIndex,
        playerInfo.playerId,
        playerInfo.name,
        newPlayerColor,
        false,
        newPlayerPos,
        newGameState.settings,
        newGameState.debugMode
    );
    
    newGameState.players.push(newPlayer);
    newGameState.log.push(`${playerInfo.name} has joined the game!`);
    
    const baseTile = newMap[newPlayerPos.y][newPlayerPos.x];
    baseTile.type = 'base';
    baseTile.owner = newPlayerSeatIndex;
    baseTile.occupants.push({ playerId: newPlayerSeatIndex, armyId: newPlayer.armies[0].id });
    baseTile.resources = [
        { type: 'gems', amount: newGameState.settings.baseResourceAmount }, 
        { type: 'iron', amount: newGameState.settings.baseResourceAmount }, 
        { type: 'food', amount: newGameState.settings.baseResourceAmount }
    ];
    
    // Add the new base to the revealed tiles for all players if not in fog of war mode
    if (newGameState.settings.fogOfWar) {
        newPlayer.revealedTiles.push(baseTile.id);
    }
    
    const newBaseTile: BaseTileInfo = { owner: newPlayerSeatIndex, x: newPlayerPos.x, y: newPlayerPos.y };

    if (newGameState.players.length === newGameState.maxPlayers) {
        newGameState.log.push(`The game is full! Starting now.`);
        newGameState.status = 'playing';
        newGameState.turn = 1;
    }
    
    return { newGameState, updatedMap: newMap.flat(), newBaseTile };
}
