

import type { GameState, Army, ResourceType } from './types';
import { GameAction, AbilityName, CardName, IslandType, MAP_COLS } from './types';
import { handleAttackAction, handleMonsterCombatRoll, handleCloseMonsterCombat } from './actions/attack';
import { handleBuyAbility, handleBuyCardAction, handleGainWealth } from './actions/card';
import { getPossibleMoves, handleMoveAction } from './actions/movement';
import { handleDeployAction, handleUpgradeAction, handleEndTurn } from './actions/player';
import { handleSelectResourceForPosition } from './actions/resource';


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
    
    // Check for useful cards and activate them pre-turn
    if (botPlayer.specialCards.includes(CardName.Reinforce)) {
        botPlayer.reinforceActive = true;
    }
    if (botPlayer.specialCards.includes(CardName.Efficient)) {
        botPlayer.efficientActive = true;
    }
    if (botPlayer.specialCards.includes(CardName.MasterBuilder)) {
        botPlayer.masterBuilderActive = true;
    }


    const possibleActions: BotAction[] = [];

    // --- Strategic (non-army) Actions ---
    // Buy Ability
    const abilityCost = state.settings.abilityCost;
    const unownedAbilities = state.settings.availableAbilities.filter(a => !botPlayer.passiveAbilities[a as AbilityName]);
    if (canAfford(botPlayer, abilityCost, 'gems' as ResourceType) && unownedAbilities.length > 0) {
        possibleActions.push({
            name: 'buy-ability',
            priority: 8,
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
            priority: 7 - botPlayer.attackPower,
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
            priority: 6 - botPlayer.armyCount,
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
            priority: botPlayer.resources.gems > 20 ? 4 : 1,
            execute: (s) => {
                try {
                    return handleBuyCardAction(s);
                } catch { return null; }
            }
        });
    }
    
    // Use Wealthy card if low on resources needed for high-priority actions
    if (botPlayer.specialCards.includes(CardName.Wealthy)) {
        let neededResource: ResourceType | null = null;
        if (!canAfford(botPlayer, deployCost, 'wheat' as ResourceType) && botPlayer.armyCount < 5) {
            neededResource = 'wheat' as ResourceType;
        } else if (!canAfford(botPlayer, upgradeCost, 'iron' as ResourceType) && botPlayer.attackPower < 4) {
            neededResource = 'iron' as ResourceType;
        }
        
        if (neededResource) {
            const resourceToGain = neededResource;
            possibleActions.push({
                name: 'use-wealthy',
                priority: 8, // Very high priority to unblock other actions
                execute: (s) => {
                    try {
                        return handleGainWealth(s, resourceToGain);
                    } catch { return null; }
                }
            })
        }
    }


    // --- Army-Specific Actions (Evaluate all possibilities) ---
    const unactedArmies = botPlayer.armies.filter((a: Army) => !a.hasActed);
    for (const army of unactedArmies) {
        const currentTile = state.map[army.position.y * MAP_COLS + army.position.x];
        
        // --- High Priority: Attack ---
        const enemyOnTile = currentTile.occupants.find(o => o.playerId !== botPlayer.id);
        const monsterOnTile = currentTile.monsters && currentTile.monsters.length > 0;
        
        if(enemyOnTile) {
             const enemyPlayer = state.players.find(p => p.id === enemyOnTile.playerId);
             if (enemyPlayer) {
                 possibleActions.push({
                     name: `attack-player-${army.id}`,
                     priority: 8 + (botPlayer.attackPower - enemyPlayer.attackPower), // Higher priority if bot is stronger
                     execute: (s) => handleAttackAction(s, army).newState,
                 });
             }
        }
        
        if(monsterOnTile) {
             possibleActions.push({
                name: `attack-monster-${army.id}`,
                priority: 7, // High priority to clear islands
                execute: (s) => handleAttackAction(s, army).newState,
             });
        }


        // Action: Position on current tile
        const isAlreadyPositioned = botPlayer.positions.some((p: any) => p.armyId === army.id);
        if (!isAlreadyPositioned && (currentTile.type === IslandType.Resource || currentTile.type === IslandType.Base) && currentTile.resources.length > 0 && !monsterOnTile) {
            const availableResource = currentTile.resources.find((res: any) => !(currentTile.positionedBy || []).some((p: any) => p.resource === res.type));
            if (availableResource) {
                possibleActions.push({
                    name: `position-${army.id}`,
                    priority: 9, // Positioning is very important
                    execute: (s) => {
                        try {
                            return handleSelectResourceForPosition(s, availableResource.type, army).newState;
                        } catch { return null; }
                    }
                });
            }
        }

        // Action: Move
        const validMoves = getPossibleMoves(state, army);
        for (const move of validMoves) {
            const targetTile = state.map[move.y * MAP_COLS + move.x];
            let priority = 1; // Base priority for any move
            
            // Prioritize exploring unrevealed tiles
            if (state.settings.fogOfWar && !botPlayer.revealedTiles.includes(targetTile.id)) {
                priority = 5;
            } 
            // Prioritize moving to unoccupied resource islands
            else if ((targetTile.type === IslandType.Resource || targetTile.type === IslandType.Base) && targetTile.resources.length > 0 && targetTile.occupants.length === 0 && !targetTile.monsters) {
                priority = 4;
            }
            // Prioritize special tiles
            else if (targetTile.type === IslandType.Special) {
                priority = 3;
            }

            possibleActions.push({
                name: `move-${army.id}-to-${move.x},${move.y}`,
                priority: priority,
                execute: (s) => {
                    try {
                        return handleMoveAction(s, move.x, move.y, army);
                    } catch { return null; }
                }
            });
        }
    }


    // --- Execute Best Action ---
    if (possibleActions.length > 0) {
        possibleActions.sort((a, b) => b.priority - a.priority);
        const bestAction = possibleActions[0];
        console.log(`Bot: Choosing action '${bestAction.name}' with priority ${bestAction.priority}`);
        const nextState = bestAction.execute(state);
        if (nextState) {
            // End the turn after a successful action
            return handleEndTurn(nextState);
        }
    }
    
    // --- Final Fallback ---
    console.log(`Bot: No valid actions found. Ending turn.`);
    return handleEndTurn(state);
}
