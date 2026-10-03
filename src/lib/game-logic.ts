
import type { GameState, Player, PlayerColor, BaseTileInfo } from './types';
import { PLAYER_COLORS, createPlayer } from '@/modules/game-rules';
import { GameStatus, IslandType, ResourceType, MAP_COLS, MAP_ROWS } from './types';

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
    
    const cols = newGameState.settings?.gridSize?.cols || MAP_COLS;
    const rows = newGameState.settings?.gridSize?.rows || MAP_ROWS;

    const basePositions = [
        { x: 0, y: 0 },
        { x: cols - 1, y: rows - 1 },
        { x: 0, y: rows - 1 },
        { x: cols - 1, y: 0 },
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
    
    const baseTile = newGameState.map[newPlayerPos.y * cols + newPlayerPos.x];
    baseTile.type = IslandType.Base;
    baseTile.owner = newPlayerSeatIndex;
    baseTile.occupants.push({ playerId: newPlayerSeatIndex, armyId: newPlayer.armies[0].id });
    baseTile.resources = [
        { type: ResourceType.Food, amount: newGameState.settings.baseResourceAmount }, 
        { type: ResourceType.Wood, amount: newGameState.settings.baseResourceAmount }, 
        { type: ResourceType.Gold, amount: newGameState.settings.baseResourceAmount }
    ];
    
    if (newGameState.settings.fogOfWar && !newPlayer.revealedTiles.includes(baseTile.id)) {
        newPlayer.revealedTiles.push(baseTile.id);
    }
    
    const newBaseTile: BaseTileInfo = { owner: newPlayerSeatIndex, x: newPlayerPos.x, y: newPlayerPos.y };
    newGameState.baseTiles.push(newBaseTile);

    if (newGameState.players.length === newGameState.maxPlayers) {
        newGameState.log.push(`The game is full! Starting now.`);
        newGameState.status = GameStatus.Playing;
        newGameState.turn = 1;
        newGameState.log.push(`It's now ${newGameState.players[0].name}'s turn.`)
    } else {
        newGameState.log.push(`${playerInfo.name} has joined the game!`);
    }
    
    return { newGameState, newBaseTile };
}
