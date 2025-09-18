
import type { GameState, Army, Island, ResourceType } from './types';
import * as GameActions from './game-actions';

function getValidMoves(army: Army, gameState: GameState): { x: number; y: number }[] {
    const { x, y } = army.position;
    const player = gameState.players[gameState.currentPlayerIndex];
    const potentialMoves: { x: number; y: number }[] = [];
    const moveRadius = 2;
    const { map } = gameState;
    const mapRows = map.length;
    const mapCols = map[0].length;

    for (let i = -moveRadius; i <= moveRadius; i++) {
        for (let j = -moveRadius; j <= moveRadius; j++) {
            if (Math.abs(i) + Math.abs(j) <= moveRadius && (i !== 0 || j !== 0)) {
                const newX = x + i;
                const newY = y + j;
                if (newX >= 0 && newX < mapCols && newY >= 0 && newY < mapRows) {
                    potentialMoves.push({ x: newX, y: newY });
                }
            }
        }
    }

    return potentialMoves.filter(move => {
        const tile = map[move.y][move.x];
        return !(tile.type === 'base' && tile.owner !== player.id);
    });
}

function selectRandom<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

function canAfford(player: GameState['players'][0], cost: number, resource: ResourceType = 'food'): boolean {
    return player.resources[resource] >= cost;
}


// --- Main Decision Logic ---
export function takeBotTurn(initialState: GameState): GameState {
    let state = JSON.parse(JSON.stringify(initialState));
    const botPlayer = state.players[state.currentPlayerIndex];
    console.log(`--- Bot Turn Start: ${botPlayer.name} ---`);
    
    // --- Strategic Actions (once per turn) ---

    // 1. Upgrade attack power if affordable and needed
    const upgradeCost = botPlayer.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
    if (canAfford(botPlayer, upgradeCost, 'iron') && botPlayer.attackPower < 4) {
        try {
            console.log("Bot: Attempting to upgrade attack power.");
            state = GameActions.handleUpgradeAction(state);
            return GameActions.handleEndTurn(state);
        } catch (e) { console.warn("Bot: Upgrade failed.", e); }
    }
    
    // 2. Deploy a new army if affordable and under the cap
    const deployCost = botPlayer.efficientActive ? Math.ceil(botPlayer.nextArmyCost / 2) : botPlayer.nextArmyCost;
    if (canAfford(botPlayer, deployCost, 'food') && botPlayer.armyCount < 5) {
        try {
            console.log("Bot: Attempting to deploy a new army.");
            state = GameActions.handleDeployAction(state);
            return GameActions.handleEndTurn(state);
        } catch (e) { console.warn("Bot: Deploy failed.", e); }
    }
    
    // 3. Buy a card if gems are plentiful
    if (canAfford(botPlayer, 10, 'gems')) {
        try {
            console.log("Bot: Attempting to buy a card.");
            state = GameActions.handleBuyCardAction(state);
            return GameActions.handleEndTurn(state);
        } catch (e) { console.warn("Bot: Buy card failed.", e); }
    }


    // --- Army-Specific Actions (iterate through armies) ---
    const unactedArmies = botPlayer.armies.filter((a: Army) => !a.hasActed);
    for (const army of unactedArmies) {
        state.selectedArmyId = army.id;
        const currentTile = state.map[army.position.y][army.position.x];

        // 1. Collect from a positioned spot
        const position = botPlayer.positions.find((p: any) => p.armyId === army.id);
        if (position) {
            try {
                console.log(`Bot: Army ${army.id} collecting resources.`);
                state = GameActions.handleCollectAction(state);
                // The dialog state will be set, so we confirm with no productive card
                if (state.collectDialogState) {
                    state = GameActions.handleConfirmCollection(state, false);
                }
                return GameActions.handleEndTurn(state);
            } catch (e) { console.warn("Bot: Collect failed.", e); }
        }

        // 2. Position on an un-claimed resource on the current tile
        const isAlreadyPositioned = botPlayer.positions.some((p: any) => p.armyId === army.id);
        if (!isAlreadyPositioned && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0) {
            const availableResource = currentTile.resources.find((res: any) => !(currentTile.positionedBy || []).some((p: any) => p.resource === res.type));
            if (availableResource) {
                try {
                    console.log(`Bot: Army ${army.id} positioning on ${availableResource.type}.`);
                    state = GameActions.handleSelectResourceForPosition(state, availableResource.type);
                    return GameActions.handleEndTurn(state);
                } catch (e) { console.warn("Bot: Position failed.", e); }
            }
        }
        
        // 3. Move to a promising new tile
        const validMoves = getValidMoves(army, state);
        
        // Prioritize hidden tiles for VP
        const hiddenTiles = validMoves.filter(move => state.map[move.y][move.x].isHidden);
        if (hiddenTiles.length > 0) {
            const target = selectRandom(hiddenTiles);
            if (target) {
                try {
                    console.log(`Bot: Army ${army.id} moving to explore hidden tile.`);
                    state = GameActions.handleTileClick(state, army.position.x, army.position.y, botPlayer.id);
                    state = GameActions.handleTileClick(state, target.x, target.y, botPlayer.id);
                    return GameActions.handleEndTurn(state);
                } catch (e) { console.warn("Bot: Explore move failed.", e); }
            }
        }

        // Prioritize un-occupied resource tiles
        const resourceTiles = validMoves.filter(move => {
             const tile = state.map[move.y][move.x];
             return (tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0 && tile.occupants.length === 0;
        });
        if (resourceTiles.length > 0) {
            const target = selectRandom(resourceTiles);
            if (target) {
                try {
                    console.log(`Bot: Army ${army.id} moving to resource tile.`);
                    state = GameActions.handleTileClick(state, army.position.x, army.position.y, botPlayer.id);
                    state = GameActions.handleTileClick(state, target.x, target.y, botPlayer.id);
                    return GameActions.handleEndTurn(state);
                } catch (e) { console.warn("Bot: Resource move failed.", e); }
            }
        }
    }


    // --- Fallback: If no other action taken, just move a random army to a random valid spot ---
    const armyToMove = selectRandom(unactedArmies);
    if(armyToMove) {
        state.selectedArmyId = armyToMove.id;
        const validMoves = getValidMoves(armyToMove, state);
        const target = selectRandom(validMoves);
        if (target) {
             try {
                console.log(`Bot: Army ${armyToMove.id} making a random fallback move.`);
                state = GameActions.handleTileClick(state, armyToMove.position.x, armyToMove.position.y, botPlayer.id);
                state = GameActions.handleTileClick(state, target.x, target.y, botPlayer.id);
                return GameActions.handleEndTurn(state);
            } catch (e) { console.warn('Bot: Fallback move failed:', e); }
        }
    }

    // --- Final Fallback ---
    console.log(`Bot: No valid actions found. Ending turn.`);
    return GameActions.handleEndTurn(state);
}
