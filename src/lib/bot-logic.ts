
import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';

function getValidMoves(army: Army, gameState: GameState): { x: number; y: number }[] {
    const { x, y } = army.position;
    const player = gameState.players[gameState.currentPlayerIndex];
    const potentialMoves: { x: number; y: number }[] = [];
    const moveRadius = 2;
    const mapSize = gameState.settings.mapSize;

    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < mapSize && newY >= 0 && newY < mapSize) {
                    potentialMoves.push({ x: newX, y: newY });
                }
            }
        }
    }

    return potentialMoves.filter(move => {
        const tile = gameState.map[move.y][move.x];
        return !(tile.type === 'base' && tile.owner !== player.id);
    });
}

function selectRandom<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

export function takeBotTurn(gameState: GameState): GameState {
    let newState = JSON.parse(JSON.stringify(gameState));
    const botPlayer = newState.players[newState.currentPlayerIndex];
    console.log(`--- Bot Turn Start: ${botPlayer.name} ---`);

    // --- Action Prioritization ---
    // The bot will iterate through its armies and attempt the highest-priority action available.
    
    for (const army of botPlayer.armies) {
        newState.selectedArmyId = army.id;
        const currentTile = newState.map[army.position.y][army.position.x];

        // Priority 1: Attack Monsters for VP
        const canAttackMonster = currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0;
        if (canAttackMonster && botPlayer.lastAction !== 'move') {
            try {
                console.log(`Bot Action: Army ${army.id} attacking monster at ${army.position.x},${army.position.y}.`);
                newState = GameActions.handleAttackAction(newState);
                // Monster combat is multi-step, so we initiate and let the engine handle the rest.
                // The actual end of turn will happen after combat resolves.
                // For simplicity, we assume the bot commits to this.
                const monster = newState.monsterCombatState.monster;
                newState = GameActions.handleMonsterCombatRoll(newState, monster, false, 0, false, false);
                newState = GameActions.handleCloseMonsterCombat(newState);
                return GameActions.handleEndTurn(newState);
            } catch (e) { console.warn('Bot failed to attack monster:', e); }
        }
    }
    
    // Priority 2: Explore a hidden tile for VP
    for (const army of botPlayer.armies) {
        newState.selectedArmyId = army.id;
        const validMoves = getValidMoves(army, newState);
        const hiddenTiles = validMoves.filter(move => newState.map[move.y][move.x].isHidden);

        if (hiddenTiles.length > 0) {
            const target = selectRandom(hiddenTiles);
            if (target) {
                try {
                    console.log(`Bot Action: Army ${army.id} moving to hidden tile at ${target.x},${target.y}.`);
                    newState = GameActions.handleTileClick(newState, army.position.x, army.position.y, botPlayer.id);
                    newState = GameActions.handleTileClick(newState, target.x, target.y, botPlayer.id);
                    return GameActions.handleEndTurn(newState);
                } catch (e) { console.warn('Bot failed to explore:', e); }
            }
        }
    }

    // Priority 3: Collect positioned resources
    for (const army of botPlayer.armies) {
        newState.selectedArmyId = army.id;
        const isPositioned = botPlayer.positions.some((p: any) => p.x === army.position.x && p.y === army.position.y);
        if (isPositioned && botPlayer.lastAction !== 'move') {
            try {
                console.log(`Bot Action: Army ${army.id} collecting resources.`);
                newState = GameActions.handleCollectAction(newState);
                return GameActions.handleEndTurn(newState);
            } catch (e) { console.warn('Bot failed to collect:', e); }
        }
    }
    
    // Priority 4: Position on a new resource tile
    for (const army of botPlayer.armies) {
        newState.selectedArmyId = army.id;
        const tile = newState.map[army.position.y][army.position.x];
        const isAlreadyPositioned = botPlayer.positions.some((p: any) => p.x === army.position.x && p.y === army.position.y);
        const canPosition = (tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0 && !isAlreadyPositioned;
        
        if (canPosition && botPlayer.lastAction !== 'move') {
            const availableResources = tile.resources.filter(res => !(tile.positionedBy || []).some(p => p.resource === res.type));
            if (availableResources.length > 0) {
                 try {
                    console.log(`Bot Action: Army ${army.id} positioning on ${availableResources[0].type}.`);
                    newState = GameActions.handleSelectResourceForPosition(newState, availableResources[0].type);
                    return GameActions.handleEndTurn(newState);
                } catch (e) { console.warn('Bot failed to position:', e); }
            }
        }
    }

    // Priority 5: Move to a random tile if no other action was taken
    const armyToMove = selectRandom(botPlayer.armies);
    if(armyToMove) {
        newState.selectedArmyId = armyToMove.id;
        const validMoves = getValidMoves(armyToMove, newState);
        const target = selectRandom(validMoves);
        if (target) {
             try {
                console.log(`Bot Action: Army ${armyToMove.id} moving to random tile ${target.x},${target.y}.`);
                newState = GameActions.handleTileClick(newState, armyToMove.position.x, armyToMove.position.y, botPlayer.id);
                newState = GameActions.handleTileClick(newState, target.x, target.y, botPlayer.id);
                return GameActions.handleEndTurn(newState);
            } catch (e) { console.warn('Bot failed to move:', e); }
        }
    }

    // Fallback: If no action can be taken, end the turn.
    console.log(`Bot Action: No valid actions found. Ending turn.`);
    return GameActions.handleEndTurn(newState);
}
