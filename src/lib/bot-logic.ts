
import type { GameState, Army, ResourceType } from './types';
import { GameAction, AbilityName, CardName, IslandType, MAP_COLS, ResourceType as ResourceEnum } from './types';
import { getPossibleMoves, handleGameAction } from '@/modules/game-rules';
import { db, doc, updateDoc, setDoc } from './firebase';

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
    
    // Verify it is a valid bot turn
    const botPlayer = state.players[state.currentPlayerIndex];
    if (!botPlayer || !botPlayer.isBot || state.status !== 'playing') return;
    
    console.log(`--- Bot Turn Start: ${botPlayer.name} (Turn ${state.turn}) ---`);
    
    // 1. Pre-turn strategic card activations
    if (botPlayer.specialCards.includes(CardName.Reinforce) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        const temp = handleGameAction({ action: GameAction.UseCard, gameState: state, payload: { cardName: CardName.Reinforce } });
        if (temp.state) state = temp.state;
    }
    if (botPlayer.specialCards.includes(CardName.Efficient) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        const temp = handleGameAction({ action: GameAction.UseCard, gameState: state, payload: { cardName: CardName.Efficient } });
        if (temp.state) state = temp.state;
    }
    if (botPlayer.specialCards.includes(CardName.MasterBuilder) && !botPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
        const temp = handleGameAction({ action: GameAction.UseCard, gameState: state, payload: { cardName: CardName.MasterBuilder } });
        if (temp.state) state = temp.state;
    }
    
    let activeBot = state.players[state.currentPlayerIndex];
    
    // Wealthy card logic
    if (activeBot.specialCards.includes(CardName.Wealthy) && !activeBot.actionsThisTurn.includes(GameAction.UseCard)) {
        const deployCost = activeBot.efficientActive ? Math.ceil(activeBot.nextArmyCost / 2) : (activeBot.reinforceActive ? 0 : activeBot.nextArmyCost);
        const upgradeCost = activeBot.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
        let neededResource: ResourceType | null = null;
        if (!canAfford(activeBot, deployCost, ResourceEnum.Food) && activeBot.armies.length < 5) neededResource = ResourceEnum.Food;
        else if (!canAfford(activeBot, upgradeCost, ResourceEnum.Wood) && activeBot.attackPower < 4) neededResource = ResourceEnum.Wood;
        else neededResource = ResourceEnum.Gold;
        
        if (neededResource) {
            const temp = handleGameAction({ action: GameAction.GainWealth, gameState: state, payload: { resource: neededResource } });
            if (temp.state) state = temp.state;
        }
    }
    
    activeBot = state.players[state.currentPlayerIndex];
    
    // Sabotage card logic
    if (activeBot.specialCards.includes(CardName.Sabotage) && !activeBot.actionsThisTurn.includes(GameAction.UseCard)) {
        const opponent = state.players.find(p => !p.isBot && p.id !== activeBot.id);
        if (opponent) {
            const temp = handleGameAction({ action: GameAction.SabotagePlayer, gameState: state, payload: { targetPlayerId: opponent.id } });
            if (temp.state) state = temp.state;
        }
    }
    
    activeBot = state.players[state.currentPlayerIndex];

    // 2. Strategic Purchases (Ability, Upgrade, Deploy, Buy Card)
    const abilityCost = state.settings.abilityCost;
    const unownedAbilities = state.settings.availableAbilities.filter(a => !activeBot.passiveAbilities[a as AbilityName]);
    if (canAfford(activeBot, abilityCost, ResourceEnum.Gold) && unownedAbilities.length > 0) {
        const temp = handleGameAction({ action: GameAction.BuyAbility, gameState: state, payload: { abilityName: unownedAbilities[0] } });
        if (temp.state) state = temp.state;
    }
    activeBot = state.players[state.currentPlayerIndex];
    
    const upgradeCost = activeBot.masterBuilderActive ? Math.ceil(state.settings.upgradeCost / 2) : state.settings.upgradeCost;
    if (canAfford(activeBot, upgradeCost, ResourceEnum.Wood) && activeBot.attackPower < 4 && !activeBot.actionsThisTurn.includes(GameAction.Upgrade)) {
        const temp = handleGameAction({ action: GameAction.Upgrade, gameState: state });
        if (temp.state) state = temp.state;
    }
    activeBot = state.players[state.currentPlayerIndex];
    
    const deployCost = activeBot.efficientActive ? Math.ceil(activeBot.nextArmyCost / 2) : (activeBot.reinforceActive ? 0 : activeBot.nextArmyCost);
    if (canAfford(activeBot, deployCost, ResourceEnum.Food) && activeBot.armies.length < 5 && !activeBot.actionsThisTurn.includes(GameAction.Deploy)) {
        const temp = handleGameAction({ action: GameAction.Deploy, gameState: state });
        if (temp.state) state = temp.state;
    }
    activeBot = state.players[state.currentPlayerIndex];
    
    if (canAfford(activeBot, 10, ResourceEnum.Gold) && activeBot.specialCards.length < 7 && (state.specialCardsDeck.length > 0 || state.discardPile.length > 0) && !activeBot.actionsThisTurn.includes(GameAction.BuyCard)) {
        const temp = handleGameAction({ action: GameAction.BuyCard, gameState: state });
        if (temp.state) state = temp.state;
    }
    activeBot = state.players[state.currentPlayerIndex];

    // 3. Army Actions Loop (Iterate through unacted armies)
    const cols = state.settings.gridSize.cols;
    const maxArmyLoops = Math.max(1, activeBot.armies.length);
    
    for (let loop = 0; loop < maxArmyLoops; loop++) {
        activeBot = state.players[state.currentPlayerIndex];
        const unactedArmies = activeBot.armies.filter((a: Army) => !a.hasActed);
        if (unactedArmies.length === 0) break;
        
        const possibleActions: BotAction[] = [];
        
        for (const army of unactedArmies) {
            const currentTile = state.map[army.position.y * cols + army.position.x];
            const enemyOnTile = currentTile.occupants.find(o => o.playerId !== activeBot.id);
            const monsterOnTile = currentTile.monsters && currentTile.monsters.length > 0;
            
            if (enemyOnTile) {
                const enemyPlayer = state.players.find(p => p.id === enemyOnTile.playerId);
                if (enemyPlayer) {
                    possibleActions.push({
                        name: `attack-player-${army.id}`,
                        priority: 8 + (activeBot.attackPower - enemyPlayer.attackPower),
                        action: GameAction.InitiateCombat,
                        payload: {
                            attackingArmyId: army.id,
                            target: {
                                type: 'player',
                                defenderId: enemyPlayer.id,
                                defendingArmyId: enemyOnTile.armyId,
                            }
                        }
                    });
                }
            }
            
            if (monsterOnTile && currentTile.monsters && currentTile.monsters.length > 0) {
                possibleActions.push({
                    name: `attack-monster-${army.id}`,
                    priority: 7,
                    action: GameAction.InitiateCombat,
                    payload: {
                        attackingArmyId: army.id,
                        target: {
                            type: 'monster',
                            monsterName: currentTile.monsters[0].name,
                        }
                    }
                });
            }
            
            const isAlreadyPositioned = activeBot.positions.some((p: any) => p.armyId === army.id);
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
                const targetTile = state.map[move.y * cols + move.x];
                let priority = 2;
                if (state.settings.fogOfWar && !activeBot.revealedTiles.includes(targetTile.id)) {
                    priority = 6;
                } else if ((targetTile.type === IslandType.Resource || targetTile.type === IslandType.Base) && targetTile.resources.length > 0 && targetTile.occupants.length === 0 && (!targetTile.monsters || targetTile.monsters.length === 0)) {
                    priority = 4;
                } else if (targetTile.type === IslandType.Special) {
                    priority = 3;
                }
                
                possibleActions.push({
                    name: `move-${army.id}-to-${move.x},${move.y}`,
                    priority,
                    action: GameAction.Move,
                    payload: { x: move.x, y: move.y, army }
                });
            }
        }
        
        if (possibleActions.length === 0) break;
        
        possibleActions.sort((a, b) => b.priority - a.priority);
        const bestAction = possibleActions[0];
        console.log(`Bot: Executing action '${bestAction.name}' (priority: ${bestAction.priority})`);
        
        const actionRes = handleGameAction({ action: bestAction.action, gameState: state, payload: bestAction.payload });
        if (actionRes.state) {
            state = actionRes.state;
            
            // Auto-resolve combat if initiated
            if (state.monsterCombatState && state.monsterCombatState.monster) {
                const monster = state.monsterCombatState.monster;
                const rollRes = handleGameAction({
                    action: GameAction.MonsterCombatRoll,
                    gameState: state,
                    payload: { monster, useDecideCard: false, decidedValue: 6, useOvercomeCard: false, useWarChief: false }
                });
                if (rollRes.state) {
                    const closeRes = handleGameAction({ action: GameAction.CloseMonsterCombat, gameState: rollRes.state });
                    if (closeRes.state) state = closeRes.state;
                }
            } else if (state.combatState) {
                const rollRes = handleGameAction({
                    action: GameAction.CombatRoll,
                    gameState: state,
                    payload: { useWarChief: false, useOvercome: false }
                });
                if (rollRes.state) {
                    const closeRes = handleGameAction({ action: GameAction.CloseCombat, gameState: rollRes.state });
                    if (closeRes.state) state = closeRes.state;
                }
            }
        } else {
            // Action did not succeed; mark the first unacted army as acted to prevent looping
            const firstUnacted = activeBot.armies.find(a => !a.hasActed);
            if (firstUnacted) firstUnacted.hasActed = true;
        }
    }
    
    // 4. End Turn cleanly
    console.log(`Bot ${botPlayer.name}: Finished actions. Ending turn.`);
    const endTurnRes = handleGameAction({ action: GameAction.EndTurn, gameState: state });
    if (endTurnRes.state) {
        state = endTurnRes.state;
    }
    
    // 5. Atomic write to Firestore
    await setDoc(doc(db, 'games', gameId), state);
    console.log(`Bot ${botPlayer.name}: Turn state written to Firestore successfully.`);
}
