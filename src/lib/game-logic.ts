
import type { GameState, Island, Player, PlayerColor, FirestoreGameState } from './types';
import { PLAYER_COLORS } from './player-data';
import { createPlayer } from './game-initializer';

export const TILE_SIZE = 75;
export const BASE_TILE_SIZE = 150;
export const TILE_GAP = 16;
export const MAP_ROWS = 6;
export const MAP_COLS = 5;

export function addPlayerToGame(gameState: GameState, playerInfo: { playerId: string, name: string }): { newGameState: FirestoreGameState | null, updatedMap: Island[][] | null } {
    if (gameState.status !== 'waiting') {
        return { newGameState: null, updatedMap: null }; // Game has started
    }
    if (gameState.players.length >= gameState.maxPlayers) {
        return { newGameState: null, updatedMap: null }; // Game is full
    }
    if (gameState.players.some(p => p.playerId === playerInfo.playerId)) {
        const { map, ...dynamicState } = gameState;
        return { newGameState: dynamicState, updatedMap: map }; // Player is already in the game
    }

    let newGameState = JSON.parse(JSON.stringify(gameState));

    const usedColors = newGameState.players.map((p: Player) => p.color);
    const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));

    if (availableColors.length === 0) return { newGameState: null, updatedMap: null };

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
    
    newGameState.map[newPlayerPos.y][newPlayerPos.x] = {
        ...newGameState.map[newPlayerPos.y][newPlayerPos.x],
        type: 'base',
        owner: newPlayerSeatIndex,
        isHidden: false,
        occupants: [{ playerId: newPlayerSeatIndex, armyId: newPlayer.armies[0].id }],
        resources: [
            { type: 'gems', amount: 1 }, 
            { type: 'iron', amount: 1 }, 
            { type: 'food', amount: 1 }
        ],
    };
    newGameState.map[newPlayerPos.y][newPlayerPos.x].isHidden = false;

    newGameState.players.push(newPlayer);
    newGameState.log.push(`${playerInfo.name} has joined the game!`);

    if (newGameState.players.length === newGameState.maxPlayers) {
        newGameState.log.push(`The game is full! Starting now.`);
        newGameState.turn = 1;
        newGameState.status = 'playing';
    }
    
    const { map, ...dynamicState } = newGameState;
    return { newGameState: dynamicState, updatedMap: map };
}

    