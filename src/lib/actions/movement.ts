
import type { GameState, Player, Army, ActionHandlerResult, CardName } from '@/lib/types';
import { handleAttackAction } from './attack';
import { checkAndEndTurnIfNoActions, canArmyPerformAnyAction } from './player';
import { GameAction, IslandType, MAP_COLS, MAP_ROWS } from '../types';


export function getPossibleMoves(state: GameState, army: Army): { x: number; y: number }[] {
    const { x, y } = army.position;
    const { map } = state;
    
    const currentPlayer = state.players[state.currentPlayerIndex];
    
    // An army that has acted can only move if the player has an Extra Move available.
    if (army.hasActed && !currentPlayer.hasExtraMove) {
        return [];
    }

    let moves = [];
    const moveRadius = 2;
    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < MAP_COLS && newY >= 0 && newY < MAP_ROWS) {
                    const targetTile = map[newY * MAP_COLS + newX];
                    if (targetTile.type === IslandType.Resource && targetTile.resources.length === 0 && (!targetTile.monsters || targetTile.monsters.length === 0)) {
                        continue;
                    }
                    moves.push({ x: newX, y: newY });
                }
            }
        }
    }
    return moves.filter(move => {
        const tile = map[move.y * MAP_COLS + move.x];
        const baseTileInfo = state.baseTiles.find(b => b.x === tile.x && b.y === tile.y);
        return !baseTileInfo || baseTileInfo.owner === currentPlayer.id;
    });
}

export function revealIsland(state: GameState, x: number, y: number): GameState {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    const tile = newState.map[y * MAP_COLS + x];
    const tileId = tile.id;
    const HAND_LIMIT = 7;

    if (player.revealedTiles.includes(tileId)) {
        return newState; // Already revealed for this player
    }

    player.revealedTiles.push(tileId);

    // Only grant VP if the player is the first to discover it among all players
    const isFirstEverDiscovery = !newState.players.some(p => p.id !== player.id && p.revealedTiles.includes(tileId));
    if (isFirstEverDiscovery && newState.settings.vpPerIslandDiscovery > 0) {
        player.victoryPoints += newState.settings.vpPerIslandDiscovery;
        newState.log.push(`${player.name} discovered a new island and gains ${newState.settings.vpPerIslandDiscovery} VP!`);
    }

    if (tile.type === IslandType.Special) {
        if (player.specialCards.length >= HAND_LIMIT && !newState.debugMode) {
             newState.log.push(`${player.name} discovered a special island, but their hand is full!`);
        } else if (newState.specialCardsDeck.length > 0 || newState.discardPile.length > 0) {
            if (newState.specialCardsDeck.length === 0) {
                 newState.log.push("The deck is empty. Reshuffling the discard pile...");
                 newState.specialCardsDeck = [...newState.discardPile];
                 newState.discardPile = [];
            }
            const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
            const drawnCard = newState.specialCardsDeck.splice(cardIndex, 1)[0];
            player.specialCards.push(drawnCard);
            newState.log.push(`${player.name} discovered a special island and found a card: "${drawnCard}"!`);
        }
    }
    
    return newState;
}

export function handleMoveAction(state: GameState, x: number, y: number, army: Army, isTeleport: boolean = false): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, discardPile } = newState;
    const player = players[currentPlayerIndex];

    const armyInState = player.armies.find(a => a.id === army.id);
    if (!armyInState) throw new Error("Army not found for move action.");

    if (armyInState.position.x === x && armyInState.position.y === y) {
        throw new Error("Cannot move to the same tile.");
    }
    
    const oldTile = map[armyInState.position.y * MAP_COLS + armyInState.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== armyInState.id);
    
    const positionIndex = player.positions.findIndex(p => p.armyId === armyInState.id);
    if (positionIndex > -1) {
        const removedPosition = player.positions.splice(positionIndex, 1)[0];
        if(oldTile.positionedBy) {
            oldTile.positionedBy = oldTile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === removedPosition.resource));
        }
        newState.log.push(`${player.name}'s army moved and is no longer positioned on ${removedPosition.resource}.`);
    }

    armyInState.position = { x, y };
    const targetTile = newState.map[y * MAP_COLS + x];
    targetTile.occupants.push({ playerId: player.id, armyId: armyInState.id });
    
    // Consume Teleport card after successful move
    if (isTeleport) {
        const cardIndex = player.specialCards.indexOf('Teleport');
        if (cardIndex > -1) {
            discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
            newState.log.push(`${player.name} teleported an army!`);
        }
        armyInState.hasActed = true; // Teleporting ends the army's turn
        return checkAndEndTurnIfNoActions(newState);
    }
    
    const isFirstDiscovery = !player.revealedTiles.includes(targetTile.id);
    if (isFirstDiscovery) {
        newState = revealIsland(newState, x, y);
    } else if (targetTile.type === IslandType.Special) {
        // Subsequent landing on a special island triggers the dice roll dialog
        newState.specialIslandRollDialogState = { isOpen: true, roll: null, cardDrawn: null };
        armyInState.hasActed = true;
        return newState;
    }
    
    if (armyInState.hasActed && player.hasExtraMove) {
        player.hasExtraMove = false; // Consume the extra move
        newState.log.push(`${player.name} used their Extra Move on an army.`);
    } else {
        armyInState.hasActed = true;
    }

    return checkAndEndTurnIfNoActions(newState);
}
