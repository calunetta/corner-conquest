

import type { GameState, Army, Island, ResourceType, PassiveAbilities } from './types';
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

type BotAction = {
    name: string;
    priority: number; // Higher is better
    execute: (state: GameState) => GameState | null;
}


// --- Main Decision Logic ---
export async function takeBotTurn(initialState: GameState): Promise<GameState> {
    let state = JSON.parse(JSON.stringify(initialState));
    const botPlayer = state.players[state.currentPlayerIndex];
    console.log(`--- Bot Turn Start: ${botPlayer.name} ---`);
    
    // --- Evaluate all possible strategic actions ---
    const possibleActions: BotAction[] = [];

    // Buy Ability
    const abilityCost = state.settings.abilityCost;
    const unownedAbilities = state.settings.availableAbilities.filter(a => !botPlayer.passiveAbilities[a as keyof PassiveAbilities]);
    if (canAfford(botPlayer, abilityCost, 'gems') && unownedAbilities.length > 0) {
        possibleActions.push({
            name: 'buy-ability',
            priority: 8, // High priority if affordable
            execute: (s) => {
                try {
                    return GameActions.handleBuyAbility(s, unownedAbilities[0] as keyof PassiveAbilities);
                } catch { return null; }
            }
        });
    }
    
    // Upgrade Attack
    const upgradeCost = botPlayer.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
    if (canAfford(botPlayer, upgradeCost, 'iron') && botPlayer.attackPower < 4 && !botPlayer.actionsThisTurn.includes('upgrade')) {
        possibleActions.push({
            name: 'upgrade-attack',
            priority: 7 - botPlayer.attackPower, // Lower priority as power increases
            execute: (s) => {
                try {
                    return GameActions.handleUpgradeAction(s);
                } catch { return null; }
            }
        });
    }

    // Deploy Army
    const deployCost = botPlayer.efficientActive ? Math.ceil(botPlayer.nextArmyCost / 2) : botPlayer.nextArmyCost;
    if (canAfford(botPlayer, deployCost, 'food') && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes('deploy')) {
        possibleActions.push({
            name: 'deploy-army',
            priority: 6 - botPlayer.armyCount, // Lower priority as army grows
            execute: (s) => {
                try {
                    return GameActions.handleDeployAction(s);
                } catch { return null; }
            }
        });
    }

    // Buy Card
    if (canAfford(botPlayer, 10, 'gems') && !botPlayer.actionsThisTurn.includes('buy-card')) {
        possibleActions.push({
            name: 'buy-card',
            priority: botPlayer.resources.gems > 20 ? 4 : 1, // Only if gems are plentiful
            execute: (s) => {
                try {
                    return GameActions.handleBuyCardAction(s);
                } catch { return null; }
            }
        });
    }

    // --- Execute best strategic action if any ---
    if (possibleActions.length > 0) {
        possibleActions.sort((a, b) => b.priority - a.priority);
        const bestAction = possibleActions[0];
        console.log(`Bot: Choosing strategic action '${bestAction.name}' with priority ${bestAction.priority}`);
        const nextState = bestAction.execute(state);
        if (nextState) {
            return GameActions.handleEndTurn(nextState);
        }
    }


    // --- Army-Specific Actions (iterate through armies) ---
    const unactedArmies = botPlayer.armies.filter((a: Army) => !a.hasActed);
    for (const army of unactedArmies) {
        // This is a simulation, so we use a copy of the state
        let simState = JSON.parse(JSON.stringify(state));
        const currentTile = simState.map[army.position.y][army.position.x];

        // 1. Collect from a positioned spot
        const position = botPlayer.positions.find((p: any) => p.armyId === army.id);
        if (position) {
            console.log(`Bot: Army ${army.id} collecting resources.`);
            try {
                let tempState = GameActions.handleCollectAction(simState, army);
                if (tempState.collectDialogState) {
                    tempState = GameActions.handleConfirmCollection(tempState, false, army);
                }
                return GameActions.handleEndTurn(tempState);
            } catch (e) { console.warn("Bot: Collect failed.", e); }
        }

        // 2. Attack monsters if present
        if (currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0) {
             console.log(`Bot: Army ${army.id} attacking monster.`);
             try {
                 const { newState: attackState } = GameActions.handleAttackAction(simState, army);
                 const { monsterCombatState } = attackState;
                 if (monsterCombatState) {
                    const combatResultState = GameActions.handleMonsterCombatRoll(attackState, {
                        monster: monsterCombatState.monster,
                        useDecideCard: botPlayer.specialCards.includes('Decide Dice Roll'),
                        decidedValue: 6,
                        useOvercomeCard: botPlayer.specialCards.includes('Overcome'),
                        useWarChief: botPlayer.specialCards.includes('War Chief'),
                    }, army);
                    const finalState = GameActions.handleCloseMonsterCombat(combatResultState, army);
                    return GameActions.handleEndTurn(finalState);
                 }
             } catch (e) { console.warn("Bot: Monster attack failed.", e); }
        }

        // 3. Position on an un-claimed resource on the current tile
        const isAlreadyPositioned = botPlayer.positions.some((p: any) => p.armyId === army.id);
        if (!isAlreadyPositioned && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0) {
            const availableResource = currentTile.resources.find((res: any) => !(currentTile.positionedBy || []).some((p: any) => p.resource === res.type));
            if (availableResource) {
                console.log(`Bot: Army ${army.id} positioning on ${availableResource.type}.`);
                try {
                    const posState = GameActions.handleSelectResourceForPosition(simState, availableResource.type, army);
                    return GameActions.handleEndTurn(posState);
                } catch (e) { console.warn("Bot: Position failed.", e); }
            }
        }
        
        // 4. Move to a promising new tile
        const validMoves = getValidMoves(army, simState);
        const unrevealedTiles = validMoves.filter(move => {
            const tile = simState.map[move.y][move.x];
            return !botPlayer.revealedTiles.includes(tile.id);
        });

        if (unrevealedTiles.length > 0) {
            const target = selectRandom(unrevealedTiles);
            if (target) {
                console.log(`Bot: Army ${army.id} moving to explore unrevealed tile.`);
                try {
                    const moveState = GameActions.handleTileClick(simState, target.x, target.y, botPlayer.id, army, getValidMoves(army, simState)).newState;
                    return GameActions.handleEndTurn(moveState);
                } catch (e) { console.warn("Bot: Explore move failed.", e); }
            }
        }

        const resourceTiles = validMoves.filter(move => {
             const tile = simState.map[move.y][move.x];
             return (tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0 && tile.occupants.length === 0;
        });
        if (resourceTiles.length > 0) {
            const target = selectRandom(resourceTiles);
            if (target) {
                 console.log(`Bot: Army ${army.id} moving to resource tile.`);
                 try {
                    const moveState = GameActions.handleTileClick(simState, target.x, target.y, botPlayer.id, army, getValidMoves(army, simState)).newState;
                    return GameActions.handleEndTurn(moveState);
                } catch (e) { console.warn("Bot: Resource move failed.", e); }
            }
        }
    }


    // --- Fallback: If no other action taken, just move a random army to a random valid spot ---
    const armyToMove = selectRandom(unactedArmies);
    if(armyToMove) {
        const validMoves = getValidMoves(armyToMove, state);
        const target = selectRandom(validMoves);
        if (target) {
             console.log(`Bot: Army ${armyToMove.id} making a random fallback move.`);
             try {
                const moveState = GameActions.handleTileClick(state, target.x, target.y, botPlayer.id, armyToMove, getValidMoves(armyToMove, state)).newState;
                return GameActions.handleEndTurn(moveState);
            } catch (e) { console.warn('Bot: Fallback move failed:', e); }
        }
    }

    // --- Final Fallback ---
    console.log(`Bot: No valid actions found. Ending turn.`);
    return GameActions.handleEndTurn(state);
}
