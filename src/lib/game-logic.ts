


import type { GameState, Player, PlayerColor, BaseTileInfo } from './types';
import { PLAYER_COLORS } from './player-data';
import { createPlayer } from './game-initializer';
import { GameStatus, IslandType, MAP_COLS, MAP_ROWS } from './types';

export const BASE_TILE_SIZE = 150;


export function addPlayerToGame(
    gameState: GameState,
    playerInfo: { playerId: string, name: string }
): { newGameState: GameState | null, newBaseTile: BaseTileInfo | null } {
    
    if (gameState.status !== GameStatus.Waiting) {
        return { newGameState: null, newBaseTile: null }; // Game has started
    }
    if (gameState.players.length >= gameState.maxPlayers) {
        return { newGameState: null, newBaseTile: null }; // Game is full
    }
    if (gameState.players.some(p => p.playerId === playerInfo.playerId)) {
        return { newGameState: gameState, newBaseTile: null }; // Player is already in the game
    }

    let newGameState = JSON.parse(JSON.stringify(gameState));

    const usedColors = newGameState.players.map((p: Player) => p.color);
    const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));

    if (availableColors.length === 0) return { newGameState: null, newBaseTile: null };

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
    
    const baseTile = newGameState.map[newPlayerPos.y * MAP_COLS + newPlayerPos.x];
    baseTile.type = IslandType.Base;
    baseTile.owner = newPlayerSeatIndex;
    baseTile.occupants.push({ playerId: newPlayerSeatIndex, armyId: newPlayer.armies[0].id });
    baseTile.resources = [
        { type: 'gems', amount: newGameState.settings.baseResourceAmount }, 
        { type: 'iron', amount: newGameState.settings.baseResourceAmount }, 
        { type: 'wheat', amount: newGameState.settings.baseResourceAmount }
    ];
    
    // Add the new base to the revealed tiles for the new player if fog of war is on
    if (newGameState.settings.fogOfWar) {
        newPlayer.revealedTiles.push(baseTile.id);
    }
    
    const newBaseTile: BaseTileInfo = { owner: newPlayerSeatIndex, x: newPlayerPos.x, y: newPlayerPos.y };
    newGameState.baseTiles.push(newBaseTile);

    if (newGameState.players.length === newGameState.maxPlayers) {
        newGameState.log.push(`The game is full! Starting now.`);
        newGameState.status = GameStatus.Playing;
        newGameState.turn = 1;
    } else {
        newGameState.log.push(`${playerInfo.name} has joined the game!`);
    }
    
    return { newGameState, newBaseTile };
}
