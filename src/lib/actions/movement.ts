


import type { GameState, Player, Army, ActionHandlerResult, CardName } from '@/lib/types';
import { handleAttackAction } from './attack';
import { checkAndEndTurnIfNoActions, canArmyPerformAnyAction } from './player';
import { GameAction, IslandType, MAP_COLS, MAP_ROWS } from '../types';


export function getPossibleMoves(state: GameState, army: Army): { x: number; y: number }[] {
    const { x, y } = army.position;
    const { map } = state;
    
    const currentPlayer = state.players[state.currentPlayerIndex];
    
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

export function handleMoveAction(state: GameState, x: number, y: number, army: Army): ActionHandlerResult {
    let newState = { ...state };
    const { players, currentPlayerIndex, map, discardPile } = newState;
    const player = players[currentPlayerIndex];

    if (army.position.x === x && army.position.y === y) {
        throw new Error("Cannot move to the same tile.");
    }
    
    const oldTile = map[army.position.y * MAP_COLS + army.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== army.id);
    
    const positionIndex = player.positions.findIndex(p => p.armyId === army.id);
    if (positionIndex > -1) {
        const removedPosition = player.positions.splice(positionIndex, 1)[0];
        if(oldTile.positionedBy) {
            oldTile.positionedBy = oldTile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === removedPosition.resource));
        }
        newState.log.push(`${player.name}'s army moved and is no longer positioned on ${removedPosition.resource}.`);
    }

    army.position = { x, y };
    const targetTile = newState.map[y * MAP_COLS + x];
    targetTile.occupants.push({ playerId: player.id, armyId: army.id });
    
    const isFirstDiscovery = !player.revealedTiles.includes(targetTile.id);
    if (isFirstDiscovery) {
        newState = revealIsland(newState, x, y);
    }
    
    if (player.hasExtraMove) {
        player.hasExtraMove = false; 
        newState.log.push(`${player.name} used their Extra Move!`);
        
        if (!player.actionsThisTurn.includes(GameAction.UseCard)) {
            player.actionsThisTurn.push(GameAction.UseCard);
        }
    } else {
        army.hasActed = true;
    }

    const canStillAct = canArmyPerformAnyAction(newState, army);
    if (!canStillAct) {
        newState = checkAndEndTurnIfNoActions(newState);
        return { newState, selectedArmyId: null };
    }

    return { newState, selectedArmyId: army.id };
}

export function handleTileClick(
    state: GameState, 
    x: number, 
    y: number, 
    currentSelectedArmy: Army | null,
    currentPossibleMoves: {x: number, y: number}[]
): ActionHandlerResult {
    let newState = { ...state };
    const { players, currentPlayerIndex, teleportState, scoutingState, settings } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const clickedTile = newState.map[y * MAP_COLS + x];
    
    if (!currentPlayer || !clickedTile) {
        // Early exit if essential data is missing
        return { newState: state };
    }

    let isTileRevealed = true;
    if (settings.fogOfWar) {
        isTileRevealed = currentPlayer.revealedTiles.includes(clickedTile.id);
    }
    
    let selectedArmyId: number | null = currentSelectedArmy?.id ?? null;
    let selectedTile: {x: number, y: number} | null = {x, y};
    let possibleMoves: {x: number, y: number}[] = currentPossibleMoves;
    let currentAction: GameAction | null = null;
    
    const armiesOnTile = clickedTile.occupants
        .filter(o => o.playerId === currentPlayer.id)
        .map(o => currentPlayer.armies.find(a => a.id === o.armyId))
        .filter((army): army is Army => !!army);
    
    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);

    if (currentSelectedArmy && isPossibleMove) {
        const moveResult = handleMoveAction(newState, x, y, currentSelectedArmy);
        if (moveResult.selectedArmyId === null) {
            return { newState: moveResult.newState, selectedArmyId: null, selectedTile: null, possibleMoves: [], currentAction: null };
        }
        return moveResult;
    }
    
    if (scoutingState && scoutingState.count > 0 && !isTileRevealed) {
        newState = handleScout(newState, x, y);
        return { newState, selectedArmyId, selectedTile: null, possibleMoves, currentAction: null };
    }
    
    if (teleportState) {
        if (teleportState.armyId === null) {
            if (armiesOnTile.length === 0) throw new Error("You must select a tile with one of your own armies.");

            if (armiesOnTile.length === 1) {
                newState.teleportState.armyId = armiesOnTile[0]!.id;
            } else {
                 newState.armySelectionDialogState = { isOpen: true, x, y, armies: armiesOnTile };
            }
        } else {
            const { newState: teleportedState, selectedArmyId: deselectedArmy } = handleTeleport(newState, x, y);
            newState = teleportedState;
            return { newState, selectedArmyId: deselectedArmy, selectedTile: null, possibleMoves: [], currentAction: null };
        }
        return { newState, selectedArmyId: null, selectedTile: null, possibleMoves: [], currentAction: null };
    }
    
    if (armiesOnTile.length > 0) {
        if (armiesOnTile.length === 1) {
            const army = armiesOnTile[0];
            selectedArmyId = army.id;
            possibleMoves = getPossibleMoves(newState, army);
            currentAction = GameAction.Move;
        } else {
            newState.armySelectionDialogState = { isOpen: true, x, y, armies: armiesOnTile };
            selectedArmyId = null;
            possibleMoves = [];
            currentAction = null;
        }
    } else {
        selectedArmyId = null;
        possibleMoves = [];
        currentAction = null;
        selectedTile = null;
    }

    return { newState, selectedArmyId, selectedTile, possibleMoves, currentAction };
}

export function handleSelectArmy(state: GameState, armyId: number): ActionHandlerResult {
    let newState = { ...state };
    newState.armySelectionDialogState = null; 

    const player = newState.players[newState.currentPlayerIndex];
    const army = player.armies.find(a => a.id === armyId);

    if (!army) {
        return { newState, selectedArmyId: null, possibleMoves: [], currentAction: null };
    }
    
    if (newState.teleportState) {
        newState.teleportState.armyId = armyId;
        return { newState, selectedArmyId: armyId, possibleMoves: [], currentAction: GameAction.Teleport };
    }

    const possibleMoves = getPossibleMoves(newState, army);
    const tile = newState.map[army.position.y * MAP_COLS + army.position.x];
    const canAttack = tile.occupants.some(o => o.playerId !== player.id) || (tile.type === IslandType.Monster && !!tile.monsters && tile.monsters.length > 0);
    
    if (possibleMoves.length > 0) {
        return { newState, selectedArmyId: armyId, possibleMoves, currentAction: GameAction.Move, selectedTile: {x: army.position.x, y: army.position.y} };
    } else if (canAttack && !army.hasActed) {
        const attackResult = handleAttackAction(newState, army);
        return { ...attackResult, currentAction: GameAction.Attack };
    }

    return { newState, selectedArmyId: armyId, possibleMoves: [], currentAction: null };
}

export const handleTeleport = (state: GameState, x: number, y: number): ActionHandlerResult => {
    let newState = { ...state };
    const { players, currentPlayerIndex, teleportState, map, discardPile } = newState;
    const player = players[currentPlayerIndex];

    if (!teleportState || teleportState.armyId === null) return { newState };
    
    const armyToMove = player.armies.find(a => a.id === teleportState.armyId);
    if (!armyToMove) return { newState };
    
    const oldTile = map[armyToMove.position.y * MAP_COLS + armyToMove.position.x];
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== armyToMove.id);

    armyToMove.position = { x, y };
    const targetTile = map[y * MAP_COLS + x];
    targetTile.occupants.push({ playerId: player.id, armyId: armyToMove.id });
    
    const isFirstDiscovery = !player.revealedTiles.includes(targetTile.id);
    if (isFirstDiscovery) {
        newState = revealIsland(newState, x, y);
    }
    
    if (!player.actionsThisTurn.includes(GameAction.UseCard)) {
        player.actionsThisTurn.push(GameAction.UseCard);
    }
    
    newState.log.push(`${player.name} used 'Teleport' to move an army!`);
    
    newState.teleportState = null;
    return { newState: checkAndEndTurnIfNoActions(newState), selectedArmyId: null };
}

export function handleScout(state: GameState, x: number, y: number): GameState {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    if (!newState.scoutingState) return newState;

    newState = revealIsland(newState, x, y);
    newState.scoutingState!.count--;
    newState.log.push(`${player.name} revealed a tile at (${x},${y}) with Scout. ${newState.scoutingState.count} reveals left.`);
    
    if (newState.scoutingState!.count === 0) {
        newState.log.push(`Scouting complete.`);
        if (!player.actionsThisTurn.includes(GameAction.UseCard)) {
            player.actionsThisTurn.push(GameAction.UseCard);
        }
        newState.scoutingState = null;
        newState = checkAndEndTurnIfNoActions(newState);
    }
    return newState;
}
