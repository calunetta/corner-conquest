
import type { GameState, Player, Army, ActionHandlerResult, CardName } from '@/lib/types';
import { GameAction, IslandType, GameStatus, HAND_LIMIT } from '../types';

export function getPossibleMoves(state: GameState, army: Army): { x: number; y: number }[] {
    const { map, players, currentPlayerIndex, settings } = state;
    const currentPlayer = players[currentPlayerIndex];

    if (army.hasActed && !currentPlayer.hasExtraMove) {
        return [];
    }
    
    const { x, y } = army.position;
    const cols = settings.gridSize.cols;
    const rows = settings.gridSize.rows;

    let moves = [];
    const moveRadius = 2;
    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
                    const targetTile = map[newY * cols + newX];
                    if (targetTile.type === IslandType.Empty) {
                        continue;
                    }
                    moves.push({ x: newX, y: newY });
                }
            }
        }
    }
    return moves.filter(move => {
        const tile = map[move.y * cols + move.x];
        const baseTileInfo = state.baseTiles.find(b => b.x === tile.x && b.y === tile.y);
        return !baseTileInfo || baseTileInfo.owner === currentPlayer.id;
    });
}

export function revealIsland(state: GameState, x: number, y: number, isScout: boolean = false): GameState {
    const player = state.players[state.currentPlayerIndex];
    const tile = state.map[y * state.settings.gridSize.cols + x];
    const tileId = tile.id;

    if (player.revealedTiles.includes(tileId)) {
        return state;
    }

    player.revealedTiles.push(tileId);

    const isFirstEverDiscovery = !state.players.some(p => p.id !== player.id && p.revealedTiles.includes(tileId));
    if (isFirstEverDiscovery && state.settings.vpPerIslandDiscovery > 0 && !isScout) {
        player.victoryPoints += state.settings.vpPerIslandDiscovery;
        state.log.push(`${player.name} discovered a new island and gains ${state.settings.vpPerIslandDiscovery} VP!`);
        
        if (player.victoryPoints >= state.settings.victoryPointGoal && !state.winner) {
            state.winner = player;
            state.status = GameStatus.Finished;
            state.log.push(`🎉 ${player.name} has reached ${player.victoryPoints} Victory Points and won the game!`);
        }
    }

    if (tile.type === IslandType.Special && !isScout) {
        if (player.specialCards.length >= HAND_LIMIT && !state.debugMode) {
             state.log.push(`${player.name} discovered a special island, but their hand is full!`);
        } else if (state.specialCardsDeck.length > 0 || state.discardPile.length > 0) {
            if (state.specialCardsDeck.length === 0) {
                 state.log.push("The deck is empty. Reshuffling the discard pile...");
                 const newDeck = [...state.discardPile];
                 for (let i = newDeck.length - 1; i > 0; i--) {
                     const j = Math.floor(Math.random() * (i + 1));
                     [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
                 }
                 state.specialCardsDeck = newDeck;
                 state.discardPile = [];
            }
            if (state.specialCardsDeck.length > 0) {
                const cardIndex = Math.floor(Math.random() * state.specialCardsDeck.length);
                const drawnCardResult = state.specialCardsDeck.splice(cardIndex, 1)[0];
                player.specialCards.push(drawnCardResult);
                state.log.push(`${player.name} discovered a special island and found a card: "${drawnCardResult}"!`);
            }
        } else {
            state.log.push(`${player.name} discovered a special island, but the deck is empty!`);
        }
    }
    
    return state;
}

export function handleMoveAction(state: GameState, x: number, y: number, army: Army, isTeleport: boolean = false): GameState {
    const { players, currentPlayerIndex, map, discardPile, settings } = state;
    const player = players[currentPlayerIndex];

    const armyInState = player.armies.find(a => a.id === army.id);
    if (!armyInState) throw new Error("Army not found for move action.");
    
    if (isTeleport) {
        const targetBase = state.baseTiles.find(b => b.x === x && b.y === y);
        if (targetBase && targetBase.owner !== player.id) {
            throw new Error("Cannot teleport onto an opponent's base island.");
        }

        const cardIndex = player.specialCards.indexOf('Teleport');
        if (cardIndex > -1) {
            discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
            player.actionsThisTurn.push(GameAction.UseCard);
            state.log.push(`${player.name} teleported an army!`);
        } else {
             throw new Error("Teleport card not found, but was attempted to be used.");
        }
    } else {
        if (armyInState.hasActed && !player.hasExtraMove) {
            throw new Error(`Invalid move: Army ${armyInState.id} has already acted.`);
        }
        const possibleMoves = getPossibleMoves(state, armyInState);
        if (!possibleMoves.some(m => m.x === x && m.y === y)) {
            throw new Error(`Invalid move for army ${armyInState.id} to (${x}, ${y}).`);
        }
    }
    
    const oldTile = map[armyInState.position.y * settings.gridSize.cols + armyInState.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== armyInState.id);
    
    const positionIndex = player.positions.findIndex(p => p.armyId === armyInState.id);
    if (positionIndex > -1) {
        const removedPosition = player.positions.splice(positionIndex, 1)[0];
        if (oldTile.positionedBy) {
            oldTile.positionedBy = oldTile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === removedPosition.resource));
        }
        state.log.push(`${player.name}'s army moved and is no longer positioned on ${removedPosition.resource}.`);
    }

    armyInState.position = { x, y };
    const targetTile = state.map[y * settings.gridSize.cols + x];
    targetTile.occupants.push({ playerId: player.id, armyId: armyInState.id });
    
    if (isTeleport) {
        armyInState.hasActed = true;
    } else if (player.hasExtraMove) {
        player.hasExtraMove = false; 
        state.log.push(`${player.name} used their Extra Move on an army.`);
    } else {
        armyInState.hasActed = true;
    }
    
    const isFirstDiscovery = !player.revealedTiles.includes(targetTile.id);
    if (isFirstDiscovery) {
        state = revealIsland(state, x, y, isTeleport);
    }
    
    return state;
}
