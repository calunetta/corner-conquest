

import type { GameState, Army, ResourceType } from './types';
import { GameAction, AbilityName, CardName } from './types';
import { handleAttackAction, handleMonsterCombatRoll, handleCloseMonsterCombat } from './actions/attack';
import { handleBuyAbility, handleBuyCardAction } from './actions/card';
import { getPossibleMoves, handleTileClick } from './actions/movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn } from './actions/player';
import { handleCollectAction, handleConfirmCollection, handleSelectResourceForPosition } from './actions/resource';
import { MAP_COLS } from './game-logic';


function selectRandom<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

function canAfford(player: GameState['players'][0], cost: number, resource: ResourceType = 'wheat' as ResourceType): boolean {
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
    const unownedAbilities = state.settings.availableAbilities.filter(a => !botPlayer.passiveAbilities[a as AbilityName]);
    if (canAfford(botPlayer, abilityCost, 'gems' as ResourceType) && unownedAbilities.length > 0) {
        possibleActions.push({
            name: 'buy-ability',
            priority: 8, // High priority if affordable
            execute: (s) => {
                try {
                    return handleBuyAbility(s, unownedAbilities[0] as AbilityName);
                } catch { return null; }
            }
        });
    }
    
    // Upgrade Attack
    const upgradeCost = botPlayer.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
    if (canAfford(botPlayer, upgradeCost, 'iron' as ResourceType) && botPlayer.attackPower < 4 && !botPlayer.actionsThisTurn.includes(GameAction.Upgrade)) {
        possibleActions.push({
            name: 'upgrade-attack',
            priority: 7 - botPlayer.attackPower, // Lower priority as power increases
            execute: (s) => {
                try {
                    return handleUpgradeAction(s);
                } catch { return null; }
            }
        });
    }

    // Deploy Army
    const deployCost = botPlayer.efficientActive ? Math.ceil(botPlayer.nextArmyCost / 2) : botPlayer.nextArmyCost;
    if ((canAfford(botPlayer, deployCost, 'wheat' as ResourceType) || botPlayer.reinforceActive) && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes(GameAction.Deploy)) {
        possibleActions.push({
            name: 'deploy-army',
            priority: 6 - botPlayer.armyCount, // Lower priority as army grows
            execute: (s) => {
                try {
                    return handleDeployAction(s);
                } catch { return null; }
            }
        });
    }

    // Buy Card
    if (canAfford(botPlayer, 10, 'gems' as ResourceType) && !botPlayer.actionsThisTurn.includes(GameAction.BuyCard)) {
        possibleActions.push({
            name: 'buy-card',
            priority: botPlayer.resources.gems > 20 ? 4 : 1, // Only if gems are plentiful
            execute: (s) => {
                try {
                    return handleBuyCardAction(s);
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
            return handleEndTurn(nextState);
        }
    }


    // --- Army-Specific Actions (iterate through armies) ---
    const unactedArmies = botPlayer.armies.filter((a: Army) => !a.hasActed);
    for (const army of unactedArmies) {
        // This is a simulation, so we use a copy of the state
        let simState = JSON.parse(JSON.stringify(state));
        const currentTile = simState.map[army.position.y * MAP_COLS + army.position.x];

        // 1. Collect from a positioned spot
        const position = botPlayer.positions.find((p: any) => p.armyId === army.id);
        if (position) {
            console.log(`Bot: Army ${army.id} collecting resources.`);
            try {
                let tempState = handleCollectAction(simState, army);
                if (tempState.collectDialogState) {
                    tempState = handleConfirmCollection(tempState, false, army);
                }
                return handleEndTurn(tempState);
            } catch (e) { console.warn("Bot: Collect failed.", e); }
        }

        // 2. Attack monsters if present
        if (currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0) {
             console.log(`Bot: Army ${army.id} attacking monster.`);
             try {
                 const { newState: attackState } = handleAttackAction(simState, army);
                 const { monsterCombatState } = attackState;
                 if (monsterCombatState) {
                    const combatResultState = handleMonsterCombatRoll(attackState, {
                        monster: monsterCombatState.monster,
                        useDecideCard: botPlayer.specialCards.includes(CardName.DecideDiceRoll),
                        decidedValue: 6,
                        useOvercomeCard: botPlayer.specialCards.includes(CardName.Overcome),
                        useWarChief: botPlayer.specialCards.includes(CardName.WarChief),
                    }, army);
                    const finalState = handleCloseMonsterCombat(combatResultState, army);
                    return handleEndTurn(finalState);
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
                    const posState = handleSelectResourceForPosition(simState, availableResource.type, army);
                    return handleEndTurn(posState);
                } catch (e) { console.warn("Bot: Position failed.", e); }
            }
        }
        
        // 4. Move to a promising new tile
        const validMoves = getPossibleMoves(simState, army);
        const unrevealedTiles = validMoves.filter(move => {
            const tile = simState.map[move.y * MAP_COLS + move.x];
            return !botPlayer.revealedTiles.includes(tile.id);
        });

        if (unrevealedTiles.length > 0) {
            const target = selectRandom(unrevealedTiles);
            if (target) {
                console.log(`Bot: Army ${army.id} moving to explore unrevealed tile.`);
                try {
                    const { newState: moveState } = handleTileClick(simState, target.x, target.y, army, getPossibleMoves(simState, army));
                    return handleEndTurn(moveState);
                } catch (e) { console.warn("Bot: Explore move failed.", e); }
            }
        }

        const resourceTiles = validMoves.filter(move => {
             const tile = simState.map[move.y * MAP_COLS + move.x];
             return (tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0 && tile.occupants.length === 0;
        });
        if (resourceTiles.length > 0) {
            const target = selectRandom(resourceTiles);
            if (target) {
                 console.log(`Bot: Army ${army.id} moving to resource tile.`);
                 try {
                    const { newState: moveState } = handleTileClick(simState, target.x, target.y, army, getPossibleMoves(simState, army));
                    return handleEndTurn(moveState);
                } catch (e) { console.warn("Bot: Resource move failed.", e); }
            }
        }
    }


    // --- Fallback: If no other action taken, just move a random army to a random valid spot ---
    const armyToMove = selectRandom(unactedArmies);
    if(armyToMove) {
        const validMoves = getPossibleMoves(state, armyToMove);
        const target = selectRandom(validMoves);
        if (target) {
             console.log(`Bot: Army ${armyToMove.id} making a random fallback move.`);
             try {
                const { newState: moveState } = handleTileClick(state, target.x, target.y, armyToMove, getPossibleMoves(state, armyToMove));
                return handleEndTurn(moveState);
            } catch (e) { console.warn('Bot: Fallback move failed:', e); }
        }
    }

    // --- Final Fallback ---
    console.log(`Bot: No valid actions found. Ending turn.`);
    return handleEndTurn(state);
}
