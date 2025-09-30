
import type { GameState, Player, Army, ActionHandlerResult, CardName } from '@/lib/types';
import { handleAttackAction } from './attack';
import { checkAndEndTurnIfNoActions, canArmyPerformAnyAction } from './player';
import { GameAction, IslandType, MAP_COLS, MAP_ROWS, HAND_LIMIT } from '../types';

export function getPossibleMoves(state: GameState, army: Army): { x: number; y: number }[] {
    const { map, players, currentPlayerIndex } = state;
    const currentPlayer = players[currentPlayerIndex];

    if (army.hasActed && !currentPlayer.hasExtraMove) {
        return [];
    }
    
    const { x, y } = army.position;

    let moves = [];
    const moveRadius = 2;
    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < MAP_COLS && newY >= 0 && newY < MAP_ROWS) {
                    const targetTile = map[newY * MAP_COLS + newX];
                    if (targetTile.type === IslandType.Empty) {
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

export function revealIsland(state: GameState, x: number, y: number, isScout: boolean = false): { newState: GameState, cardDrawn: CardName | null } {
    let newState = state;
    const player = newState.players[newState.currentPlayerIndex];
    const tile = newState.map[y * MAP_COLS + x];
    const tileId = tile.id;
    let cardDrawn: CardName | null = null;

    if (player.revealedTiles.includes(tileId)) {
        return { newState, cardDrawn: null };
    }

    player.revealedTiles.push(tileId);

    const isFirstEverDiscovery = !newState.players.some(p => p.id !== player.id && p.revealedTiles.includes(tileId));
    if (isFirstEverDiscovery && newState.settings.vpPerIslandDiscovery > 0 && !isScout) {
        player.victoryPoints += newState.settings.vpPerIslandDiscovery;
        newState.log.push(`${player.name} discovered a new island and gains ${newState.settings.vpPerIslandDiscovery} VP!`);
    }

    if (tile.type === IslandType.Special && !isScout) {
        if (player.specialCards.length >= HAND_LIMIT && !newState.debugMode) {
             newState.log.push(`${player.name} discovered a special island, but their hand is full!`);
        } else if (newState.specialCardsDeck.length > 0 || newState.discardPile.length > 0) {
            if (newState.specialCardsDeck.length === 0) {
                 newState.log.push("The deck is empty. Reshuffling the discard pile...");
                 newState.specialCardsDeck = [...newState.discardPile];
                 newState.discardPile = [];
            }
            if (newState.specialCardsDeck.length > 0) {
                const cardIndex = Math.floor(Math.random() * newState.specialCardsDeck.length);
                const drawnCardResult = newState.specialCardsDeck.splice(cardIndex, 1)[0];
                player.specialCards.push(drawnCardResult);
                cardDrawn = drawnCardResult;
                newState.log.push(`${player.name} discovered a special island and found a card: "${cardDrawn}"!`);
            }
        }
    }
    
    return { newState, cardDrawn };
}

export function handleMoveAction(state: GameState, x: number, y: number, army: Army, isTeleport: boolean = false): ActionHandlerResult {
    let newState = state;
    const { players, currentPlayerIndex, map, discardPile } = newState;
    const player = players[currentPlayerIndex];

    const armyInState = player.armies.find(a => a.id === army.id);
    if (!armyInState) throw new Error("Army not found for move action.");
    
    if (armyInState.hasActed && !player.hasExtraMove && !isTeleport) {
        throw new Error(`Invalid move: Army ${armyInState.id} has already acted.`);
    }

    if (isTeleport && armyInState.hasActed) {
        throw new Error(`Invalid move: Army ${armyInState.id} has already acted and cannot be teleported.`);
    }

    if (!isTeleport) {
        const possibleMoves = getPossibleMoves(newState, armyInState);
        if (!possibleMoves.some(m => m.x === x && m.y === y)) {
            throw new Error(`Invalid move for army ${armyInState.id} to (${x}, ${y}).`);
        }
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
    
    if (isTeleport) {
        const cardIndex = player.specialCards.indexOf('Teleport');
        if (cardIndex > -1) {
            player.actionsThisTurn.push(GameAction.UseCard);
            discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
            newState.log.push(`${player.name} teleported an army!`);
        } else {
             throw new Error("Teleport card not found, but was attempted to be used.");
        }
        armyInState.hasActed = true;
        return { state: newState, ui: null };
    }
    
    // Handle "Extra Move" consumption logic
    if (player.hasExtraMove && !armyInState.hasActed) {
        player.hasExtraMove = false; // Consume the extra move
        const cardIndex = player.specialCards.indexOf('Extra Move');
        if (cardIndex > -1) {
            // Note: UseCard action was already consumed when the card was activated.
            // Here we just discard the card itself.
            discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
        }
        newState.log.push(`${player.name} used their Extra Move on an army.`);
        // Per README, if used on an un-acted army, it does NOT get hasActed = true.
    } else {
        armyInState.hasActed = true;
    }
    
    const isFirstDiscovery = !player.revealedTiles.includes(targetTile.id);
    if (isFirstDiscovery) {
        const revealResult = revealIsland(newState, x, y, isTeleport);
        newState = revealResult.newState;
    } else if (targetTile.type === IslandType.Special) {
        armyInState.hasActed = true;
        
        if (player.dialogState) {
            player.dialogState.specialIslandRoll = { isOpen: true, roll: null, cardDrawn: null };
        } else {
            player.dialogState = { specialIslandRoll: { isOpen: true, roll: null, cardDrawn: null } };
        }
        return { state: newState, ui: null };
    }
    
    return { state: newState, ui: null };
}
