
import type { GameState, Army, ResourceType } from './types';
import { GameAction, AbilityName, CardName, IslandType, MAP_COLS, ResourceType as ResourceEnum } from './types';
import { handleGameAction } from './actions';
import { getPossibleMoves } from './actions/movement';
import { db, doc, updateDoc } from './firebase';

function selectRandom<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

function canAfford(player: GameState['players'][0], cost: number, resource: ResourceType): boolean {
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
    let state: GameState = JSON.parse(JSON.stringify(initialState));
    const botPlayer = state.players[state.currentPlayerIndex];
    console.log(`--- Bot Turn Start: ${botPlayer.name} (Turn ${state.turn}) ---`);
    
    // --- Pre-computation for card effects ---
    const hasReinforce = botPlayer.specialCards.includes(CardName.Reinforce);
    const hasEfficient = botPlayer.specialCards.includes(CardName.Efficient);
    const hasMasterBuilder = botPlayer.specialCards.includes(CardName.MasterBuilder);

    const possibleActions: BotAction[] = [];

    // --- Strategic Card Usage ---
    if (hasReinforce && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        possibleActions.push({ name: 'activate-reinforce', priority: 8.6, action: GameAction.UseCard, payload: { cardName: CardName.Reinforce }});
    }
    if (hasEfficient && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        possibleActions.push({ name: 'activate-efficient', priority: 8.5, action: GameAction.UseCard, payload: { cardName: CardName.Efficient }});
    }
    if (hasMasterBuilder && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
         possibleActions.push({ name: 'activate-master-builder', priority: 7.5, action: GameAction.UseCard, payload: { cardName: CardName.MasterBuilder }});
    }

    // Re-evaluate active card effects after potential activation
    let localStateForEval = state;
    const activationAction = possibleActions.find(a => a.name.startsWith('activate-'));
    if (activationAction) {
        localStateForEval = handleGameAction({ action: activationAction.action, gameState: state, payload: activationAction.payload }).state!;
    }
    const activeBotPlayer = localStateForEval.players[localStateForEval.currentPlayerIndex];


    // --- Strategic (non-army) Actions ---
    const abilityCost = state.settings.abilityCost;
    const unownedAbilities = state.settings.availableAbilities.filter(a => !activeBotPlayer.passiveAbilities[a as AbilityName]);
    if (canAfford(activeBotPlayer, abilityCost, ResourceEnum.Gems) && unownedAbilities.length > 0) {
        possibleActions.push({
            name: 'buy-ability',
            priority: 8,
            action: GameAction.BuyAbility,
            payload: { abilityName: unownedAbilities[0] }
        });
    }
    
    const upgradeCost = activeBotPlayer.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
    if (canAfford(activeBotPlayer, upgradeCost, ResourceEnum.Iron) && activeBotPlayer.attackPower < 4 && !activeBotPlayer.actionsThisTurn.includes(GameAction.Upgrade)) {
        possibleActions.push({
            name: 'upgrade-attack',
            priority: 7 - activeBotPlayer.attackPower,
            action: GameAction.Upgrade
        });
    }

    const deployCost = activeBotPlayer.efficientActive ? Math.ceil(activeBotPlayer.nextArmyCost / 2) : (activeBotPlayer.reinforceActive ? 0 : activeBotPlayer.nextArmyCost);
    if (canAfford(activeBotPlayer, deployCost, ResourceEnum.Wheat) && activeBotPlayer.armyCount < 5 && !activeBotPlayer.actionsThisTurn.includes(GameAction.Deploy)) {
        possibleActions.push({
            name: 'deploy-army',
            priority: 6 - activeBotPlayer.armyCount,
            action: GameAction.Deploy
        });
    }

    if (canAfford(activeBotPlayer, 10, ResourceEnum.Gems) && !activeBotPlayer.actionsThisTurn.includes(GameAction.BuyCard)) {
        possibleActions.push({
            name: 'buy-card',
            priority: activeBotPlayer.resources.gems > 20 ? 4 : 1,
            action: GameAction.BuyCard
        });
    }
    
    if (activeBotPlayer.specialCards.includes(CardName.Wealthy) && !activeBotPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        let neededResource: ResourceType | null = null;
        if (!canAfford(activeBotPlayer, deployCost, ResourceEnum.Wheat) && activeBotPlayer.armyCount < 5) neededResource = ResourceEnum.Wheat;
        else if (!canAfford(activeBotPlayer, upgradeCost, ResourceEnum.Iron) && activeBotPlayer.attackPower < 4) neededResource = ResourceEnum.Iron;
        else if (activeBotPlayer.resources.gems < 5) neededResource = ResourceEnum.Gems;
        
        if (neededResource) {
            possibleActions.push({
                name: `use-wealthy-for-${neededResource}`,
                priority: 8.7, // High priority to unblock other actions
                action: GameAction.GainWealth,
                payload: { resource: neededResource }
            });
        }
    }
     if (activeBotPlayer.specialCards.includes(CardName.Sabotage) && !activeBotPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        const opponentToSabotage = state.players.find(p => !p.isBot && p.id !== activeBotPlayer.id);
        if (opponentToSabotage) {
             possibleActions.push({
                name: `use-sabotage-on-${opponentToSabotage.name}`,
                priority: 8.8,
                action: GameAction.SabotagePlayer,
                payload: { targetPlayerId: opponentToSabotage.id }
            });
        }
    }


    // --- Army-Specific Actions (Evaluate all possibilities) ---
    const unactedArmies = activeBotPlayer.armies.filter((a: Army) => !a.hasActed);
    for (const army of unactedArmies) {
        const currentTile = state.map[army.position.y * MAP_COLS + army.position.x];
        
        const enemyOnTile = currentTile.occupants.find(o => o.playerId !== activeBotPlayer.id);
        const monsterOnTile = currentTile.monsters && currentTile.monsters.length > 0;
        
        if(enemyOnTile) {
             const enemyPlayer = state.players.find(p => p.id === enemyOnTile.playerId);
             if (enemyPlayer) {
                 possibleActions.push({
                     name: `attack-player-${army.id}`,
                     priority: 8 + (activeBotPlayer.attackPower - enemyPlayer.attackPower),
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

        const isAlreadyPositioned = activeBotPlayer.positions.some((p: any) => p.armyId === army.id);
        if (!isAlreadyPositioned && (currentTile.type === IslandType.Resource || currentTile.type === IslandType.Base) && currentTile.resources.length > 0 && !monsterOnTile) {
            const availableResource = currentTile.resources.find((res: any) => !(currentTile.positionedBy || []).some((p: any) => p.resource === res.type));
            if (availableResource) {
                possibleActions.push({
                    name: `position-${army.id}`,
                    priority: 9,
                    action: GameAction.SelectResourcePosition,
                    payload: { resource: availableResource.type, armyId: army.id }
                });
            }
        }

        const validMoves = getPossibleMoves(state, army);
        for (const move of validMoves) {
            const targetTile = state.map[move.y * MAP_COLS + move.x];
            let priority = 2; // Base priority for any move
            
            if (state.settings.fogOfWar && !activeBotPlayer.revealedTiles.includes(targetTile.id)) {
                priority = 6;
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
            let { state: nextState } = handleGameAction({ action: bestAction.action, gameState: state, payload: bestAction.payload });

            if (nextState) {
                // If the bot's action results in combat, resolve it immediately.
                if(nextState.monsterCombatState) {
                    const monster = nextState.monsterCombatState.monster!;
                    const combatRollPayload = { monster, useDecideCard: false, decidedValue: 0, useOvercomeCard: false, useWarChief: false };
                    const combatResult = handleGameAction({ action: GameAction.MonsterCombatRoll, gameState: nextState, payload: combatRollPayload});
                    const finalState = handleGameAction({ action: GameAction.CloseMonsterCombat, gameState: combatResult.state! });
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
