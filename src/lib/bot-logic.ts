

import type { GameState, Army, ResourceType } from './types';
import { GameAction, AbilityName, CardName, IslandType, MAP_COLS } from './types';
import { handleGameAction } from './actions';
import { cloneDeep } from 'lodash';

// This function needs to be imported to the file that uses it
// import { db, doc, updateDoc } from '@/lib/firebase';


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
    action: GameAction;
    payload?: any;
}


// --- Main Decision Logic ---
export async function takeBotTurn(initialState: GameState): Promise<void> {
    const gameId = initialState.id;
    let state = cloneDeep(initialState);
    const botPlayer = state.players[state.currentPlayerIndex];
    console.log(`--- Bot Turn Start: ${botPlayer.name} (Turn ${state.turn}) ---`);
    
    // Set active card flags
    if (botPlayer.specialCards.includes(CardName.Reinforce)) botPlayer.reinforceActive = true;
    if (botPlayer.specialCards.includes(CardName.Efficient)) botPlayer.efficientActive = true;
    if (botPlayer.specialCards.includes(CardName.MasterBuilder)) botPlayer.masterBuilderActive = true;

    const possibleActions: BotAction[] = [];

    // --- Strategic (non-army) Actions ---
    const abilityCost = state.settings.abilityCost;
    const unownedAbilities = state.settings.availableAbilities.filter(a => !botPlayer.passiveAbilities[a as AbilityName]);
    if (canAfford(botPlayer, abilityCost, 'gems' as ResourceType) && unownedAbilities.length > 0) {
        possibleActions.push({
            name: 'buy-ability',
            priority: 8,
            action: GameAction.BuyAbility,
            payload: { abilityName: unownedAbilities[0] }
        });
    }
    
    const upgradeCost = botPlayer.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
    if (canAfford(botPlayer, upgradeCost, 'iron' as ResourceType) && botPlayer.attackPower < 4 && !botPlayer.actionsThisTurn.includes(GameAction.Upgrade)) {
        possibleActions.push({
            name: 'upgrade-attack',
            priority: 7 - botPlayer.attackPower,
            action: GameAction.Upgrade
        });
    }

    const deployCost = botPlayer.efficientActive ? Math.ceil(botPlayer.nextArmyCost / 2) : botPlayer.nextArmyCost;
    if ((canAfford(botPlayer, deployCost, 'wheat' as ResourceType) || botPlayer.reinforceActive) && botPlayer.armyCount < 5 && !botPlayer.actionsThisTurn.includes(GameAction.Deploy)) {
        possibleActions.push({
            name: 'deploy-army',
            priority: 6 - botPlayer.armyCount,
            action: GameAction.Deploy
        });
    }

    if (canAfford(botPlayer, 10, 'gems' as ResourceType) && !botPlayer.actionsThisTurn.includes(GameAction.BuyCard)) {
        possibleActions.push({
            name: 'buy-card',
            priority: botPlayer.resources.gems > 20 ? 4 : 1,
            action: GameAction.BuyCard
        });
    }
    
    if (botPlayer.specialCards.includes(CardName.Wealthy) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        let neededResource: ResourceType | null = null;
        if (!canAfford(botPlayer, deployCost, 'wheat' as ResourceType) && botPlayer.armyCount < 5) neededResource = 'wheat' as ResourceType;
        else if (!canAfford(botPlayer, upgradeCost, 'iron' as ResourceType) && botPlayer.attackPower < 4) neededResource = 'iron' as ResourceType;
        else if (botPlayer.resources.gems < 5) neededResource = 'gems' as ResourceType;
        else if (botPlayer.resources.wheat < 5) neededResource = 'wheat' as ResourceType;
        else if (botPlayer.resources.iron < 5) neededResource = 'iron' as ResourceType;
        
        if (neededResource) {
            possibleActions.push({
                name: `use-wealthy-for-${neededResource}`,
                priority: 8.5,
                action: GameAction.GainWealth,
                payload: { resource: neededResource }
            });
        }
    }
     if (botPlayer.specialCards.includes(CardName.Sabotage) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        const opponentToSabotage = state.players.find(p => !p.isBot && p.id !== botPlayer.id);
        if (opponentToSabotage) {
             possibleActions.push({
                name: `use-sabotage-on-${opponentToSabotage.name}`,
                priority: 8,
                action: GameAction.SabotagePlayer,
                payload: { targetPlayerId: opponentToSabotage.id }
            });
        }
    }


    // --- Army-Specific Actions (Evaluate all possibilities) ---
    const unactedArmies = botPlayer.armies.filter((a: Army) => !a.hasActed);
    for (const army of unactedArmies) {
        const currentTile = state.map[army.position.y * MAP_COLS + army.position.x];
        
        const enemyOnTile = currentTile.occupants.find(o => o.playerId !== botPlayer.id);
        const monsterOnTile = currentTile.monsters && currentTile.monsters.length > 0;
        
        if(enemyOnTile) {
             const enemyPlayer = state.players.find(p => p.id === enemyOnTile.playerId);
             if (enemyPlayer) {
                 possibleActions.push({
                     name: `attack-player-${army.id}`,
                     priority: 8 + (botPlayer.attackPower - enemyPlayer.attackPower),
                     action: GameAction.Attack,
                     payload: { army }
                 });
             }
        }
        
        if(monsterOnTile) {
             possibleActions.push({
                name: `attack-monster-${army.id}`,
                priority: 7,
                action: GameAction.Attack,
                payload: { army }
             });
        }

        const isAlreadyPositioned = botPlayer.positions.some((p: any) => p.armyId === army.id);
        if (!isAlreadyPositioned && (currentTile.type === IslandType.Resource || currentTile.type === IslandType.Base) && currentTile.resources.length > 0 && !monsterOnTile) {
            const availableResource = currentTile.resources.find((res: any) => !(currentTile.positionedBy || []).some((p: any) => p.resource === res.type));
            if (availableResource) {
                possibleActions.push({
                    name: `position-${army.id}`,
                    priority: 9,
                    action: GameAction.SelectResourcePosition,
                    payload: { resource: availableResource.type, army }
                });
            }
        }

        const validMoves = getPossibleMoves(state, army);
        for (const move of validMoves) {
            const targetTile = state.map[move.y * MAP_COLS + move.x];
            let priority = 2; // Base priority for any move
            
            if (state.settings.fogOfWar && !botPlayer.revealedTiles.includes(targetTile.id)) {
                priority = 6; // High priority to explore
            } 
            else if ((targetTile.type === IslandType.Resource || targetTile.type === IslandType.Base) && targetTile.resources.length > 0 && targetTile.occupants.length === 0 && !targetTile.monsters) {
                priority = 4;
            }
            else if (targetTile.type === IslandType.Special) {
                priority = 3;
            }

            possibleActions.push({
                name: `move-${army.id}-to-${move.x},${move.y}`,
                priority: priority,
                action: GameAction.Move,
                payload: { x: move.x, y: move.y, army }
            });
        }
    }

    if (possibleActions.length > 0) {
        possibleActions.sort((a, b) => b.priority - a.priority);
        const bestAction = possibleActions[0];
        console.log(`Bot: Choosing action '${bestAction.name}' with priority ${bestAction.priority}`);
        
        try {
            const { state: nextState, ui } = handleGameAction({ action: bestAction.action, gameState: state, payload: bestAction.payload });

            if (nextState) {
                // If the action results in combat, the bot needs to resolve it.
                if(nextState.monsterCombatState) {
                    const combatResult = handleGameAction({ action: GameAction.MonsterCombatRoll, gameState: nextState, payload: { monster: nextState.monsterCombatState.monster, useDecideCard: false, decidedValue: 0, useOvercomeCard: false, useWarChief: false }});
                    const finalState = handleGameAction({ action: GameAction.CloseMonsterCombat, gameState: combatResult.state });
                    if (finalState.state) {
                         await updateDoc(doc(db, 'games', gameId), { ...finalState.state });
                         return;
                    }
                }

                await updateDoc(doc(db, 'games', gameId), { ...nextState });
                return;
            }

        } catch (error) {
             console.error(`Bot action '${bestAction.name}' failed:`, error);
        }
    }
    
    // Fallback: If all attempted actions failed or no actions were possible, end the turn.
    console.log(`Bot: No valid actions found or all failed. Ending turn.`);
    const endTurnState = handleGameAction({ action: GameAction.EndTurn, gameState: state });
    if (endTurnState.state) {
        await updateDoc(doc(db, 'games', gameId), { ...endTurnState.state });
    }
}
