

import type { GameState, Army, Monster, DeathAnimation, ActionHandlerResult, ResourceType, IslandResource, Player } from '@/lib/types';
import { CardName } from '@/lib/types';
import { PLAYER_DATA } from '@/lib/player-data';
import { GameAction, IslandType, GameStatus, ResourceType as ResourceTypeEnum } from '../types';

export function handleInitiateCombatAction(state: GameState, payload: { attackingArmyId: number, target: { type: 'player', defenderId: number, defendingArmyId: number } | { type: 'monster', monsterName: string } }): GameState {
    const { players, currentPlayerIndex, map, settings } = state;
    const attacker = players[currentPlayerIndex];
    const attackingArmy = attacker.armies.find(a => a.id === payload.attackingArmyId);

    if (!attackingArmy) throw new Error("Attacking army not found.");

    if (payload.target.type === 'player') {
        const { defenderId, defendingArmyId } = payload.target;
        state.combatState = {
            attackerId: attacker.id,
            attackingArmyId: attackingArmy.id,
            defenderId: defenderId,
            defendingArmyId: defendingArmyId,
            attackerRolls: [],
            defenderRolls: [],
            winnerId: null,
            phase: 'rolling',
        };
    } else {
        const { monsterName } = payload.target;
        const currentTile = map[attackingArmy.position.y * settings.gridSize.cols + attackingArmy.position.x];
        const monster = currentTile.monsters?.find(m => m.name === monsterName);
        if (!monster) throw new Error("Target monster not found on tile.");

        state.monsterCombatState = {
            attackerId: attacker.id,
            attackerPosition: attackingArmy.position,
            monster: monster,
            attackerRolls: [],
            monsterRolls: [],
            winnerId: null,
            phase: 'rolling',
        };
    }
    
    return state;
}

export function handleCombatRoll(state: GameState, payload: { useWarChief?: boolean; useOvercome?: boolean } | boolean): GameState {
    if (!state.combatState) return state;

    const useWarChief = typeof payload === 'object' ? !!payload.useWarChief : !!payload;
    const useOvercome = typeof payload === 'object' ? !!payload.useOvercome : false;

    const { combatState, players, discardPile } = state;
    const attacker = players[combatState.attackerId];
    const defender = players.find(p => p.id === combatState.defenderId);
    if (!defender) return state;

    const attackingArmy = attacker.armies.find(a => a.id === combatState.attackingArmyId);
    if (!attackingArmy) return state;
    
    attackingArmy.hasActed = true;

    const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

    if (useOvercome && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf(CardName.Overcome);
        if (cardIndex > -1) {
            attacker.actionsThisTurn.push(GameAction.UseCard);
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
            state.log.push(`${attacker.name} used 'Overcome' to win the battle automatically!`);
            combatState.attackerRolls = [6, 6];
            combatState.defenderRolls = [1];
            combatState.winnerId = combatState.attackerId;
            combatState.phase = 'results';
            return state;
        }
    }

    let attackerBonusPower = 0;
    if (useWarChief && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf(CardName.WarChief);
        if (cardIndex > -1) {
            attacker.actionsThisTurn.push(GameAction.UseCard);
            attackerBonusPower += 2;
            state.log.push(`${attacker.name} used 'War Chief' for +2 power!`);
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
        }
    }

    const rollDice = (count: number) => Array.from({ length: Math.max(1, count) }, () => Math.floor(Math.random() * 6) + 1);

    combatState.attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
    combatState.defenderRolls = rollDice(defender.attackPower + 1);
    
    const attackerScore = combatState.attackerRolls.reduce((a, b) => a + b, 0);
    const defenderScore = combatState.defenderRolls.reduce((a, b) => a + b, 0);

    combatState.winnerId = attackerScore > defenderScore ? combatState.attackerId : combatState.defenderId;
    combatState.phase = 'results';
    
    return state;
}

export function handleCloseCombat(state: GameState): GameState {
    const { combatState, players, map, baseTiles, settings } = state;
    if (!combatState || combatState.phase !== 'results' || combatState.winnerId === null) {
        state.combatState = null;
        return state;
    }
    
    const { winnerId, attackerId, defenderId, attackingArmyId, defendingArmyId } = combatState;
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players.find(p => p.id === winnerId)!;
    const loser = players.find(p => p.id === loserId)!;
    
    const attackingArmy = players.find(p => p.id === attackerId)?.armies.find(a => a.id === attackingArmyId);

    if (!attackingArmy) {
        state.combatState = null;
        return state;
    }
    
    const combatTile = map[attackingArmy.position.y * settings.gridSize.cols + attackingArmy.position.x];

    if (loserId === defenderId) {
        winner.victoryPoints += 5;
        state.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);

        const losingArmy = loser.armies.find(a => a.id === defendingArmyId);
        const baseTile = baseTiles.find(b => b.owner === loserId);

        if (losingArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${loser.id}-${losingArmy.id}`,
                x: losingArmy.position.x,
                y: losingArmy.position.y,
                sprite: PLAYER_DATA[loser.color].sprite.death,
                createdAt: Date.now()
            };
            state.deathAnimations.push(deathAnim);

            const oldPos = losingArmy.position;
            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === losingArmy.id && o.playerId === loserId));
            losingArmy.position = { x: baseTile.x, y: baseTile.y };
            losingArmy.hasActed = false; // Reset status on respawn
            map[baseTile.y * settings.gridSize.cols + baseTile.x].occupants.push({ playerId: loserId, armyId: losingArmy.id });
            
            const positionIndex = loser.positions.findIndex(p => p.armyId === losingArmy.id);
            if (positionIndex > -1) {
                const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                if (map[oldPos.y * settings.gridSize.cols + oldPos.x]?.positionedBy) {
                    map[oldPos.y * settings.gridSize.cols + oldPos.x]!.positionedBy = (map[oldPos.y * settings.gridSize.cols + oldPos.x]!.positionedBy || []).filter(p => !(p.playerId === loserId && p.resource === removedPosition.resource));
                }
            }
        }
    } else { // Attacker lost
        winner.victoryPoints += 5;
        state.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);
        
        const loserArmy = loser.armies.find(a => a.id === attackingArmyId);
        const baseTile = baseTiles.find(b => b.owner === loserId);
        if (loserArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${loser.id}-${loserArmy.id}`,
                x: loserArmy.position.x,
                y: loserArmy.position.y,
                sprite: PLAYER_DATA[loser.color].sprite.death,
                createdAt: Date.now()
            };
            state.deathAnimations.push(deathAnim);

            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === loserArmy.id && o.playerId === loserId));
            loserArmy.position = { x: baseTile.x, y: baseTile.y };
            loserArmy.hasActed = false; // Reset status on respawn
            map[baseTile.y * settings.gridSize.cols + baseTile.x].occupants.push({ playerId: loserId, armyId: loserArmy.id });
        }
    }

    if (winner.victoryPoints >= settings.victoryPointGoal && !state.winner) {
        state.winner = winner;
        state.status = GameStatus.Finished;
        state.log.push(`🎉 ${winner.name} has reached ${winner.victoryPoints} Victory Points and won the game!`);
    }

    state.log.push(`${winner.name} defeated ${loser.name} in battle!`);
    state.combatState = null;
    
    return state;
}

export function handleMonsterCombatRoll(state: GameState, payload: { monster: Monster; useDecideCard: boolean, decidedValue: number, useOvercomeCard: boolean, useWarChief: boolean }): GameState {
    const { players, currentPlayerIndex, discardPile, monsterCombatState } = state;
    if (!monsterCombatState) return state;

    const attacker = players[currentPlayerIndex];
    const attackingArmy = attacker.armies.find(a => a.position.x === monsterCombatState.attackerPosition.x && a.position.y === monsterCombatState.attackerPosition.y);
    if (!attackingArmy) return state;

    attackingArmy.hasActed = true;

    const { monster, useDecideCard, decidedValue, useOvercomeCard, useWarChief } = payload;

    let attackerRolls: number[] = [];
    let monsterRolls: number[] = [];
    let winnerId: number | null = null;
    
    let cardUsedThisAction = false;
    const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

    if (useOvercomeCard && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf(CardName.Overcome);
        if (cardIndex > -1) {
            cardUsedThisAction = true;
            winnerId = attacker.id;
            state.log.push(`${attacker.name} used the '${CardName.Overcome}' card to win automatically!`);
            discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
        } else {
             throw new Error("Overcome card not found, but was attempted to be used.");
        }
    }

    if (winnerId === null) { 
        let attackerBonusPower = 0;
        
        if (useWarChief && canUseCard && !cardUsedThisAction) {
             const cardIndex = attacker.specialCards.indexOf(CardName.WarChief);
             if (cardIndex > -1) {
                cardUsedThisAction = true;
                attackerBonusPower += 2;
                state.log.push(`${attacker.name} used '${CardName.WarChief}' for +2 power!`);
                discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
             }
        }

        let canUseDecideCard = useDecideCard;
        if (useDecideCard && canUseCard && !cardUsedThisAction) {
            const cardIndex = attacker.specialCards.indexOf(CardName.DecideDiceRoll);
            if (cardIndex > -1) {
                cardUsedThisAction = true;
                state.log.push(`${attacker.name} used the '${CardName.DecideDiceRoll}' card!`);
                discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
            } else {
                canUseDecideCard = false;
            }
        } else if (useDecideCard) {
            canUseDecideCard = false;
        }
        
        const rollDice = (count: number) => Array.from({ length: Math.max(1, count) }, () => Math.floor(Math.random() * 6) + 1);

        attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
        if (canUseDecideCard) {
            const safeDecidedValue = Math.max(1, Math.min(6, decidedValue || 6));
            attackerRolls[0] = safeDecidedValue;
        }

        const monsterDiceCount = Math.max(1, monster.level);
        monsterRolls = rollDice(monsterDiceCount);
        const attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
        const monsterScore = monsterRolls.reduce((a, b) => a + b, 0);
        winnerId = attackerScore > monsterScore ? attacker.id : null;
    }
    
    if (cardUsedThisAction) {
        attacker.actionsThisTurn.push(GameAction.UseCard);
    }

    state.monsterCombatState = {
      ...monsterCombatState,
      monster,
      attackerRolls,
      monsterRolls,
      winnerId: winnerId,
      phase: 'results',
    };
    return state;
}

export function handleCloseMonsterCombat(state: GameState): GameState {
    const { monsterCombatState, baseTiles, settings } = state;
    if (!monsterCombatState || monsterCombatState.phase !== 'results') {
        state.monsterCombatState = null;
        return state;
    }
    
    const { winnerId, monster, attackerId, attackerPosition } = monsterCombatState;
    const attacker = state.players[attackerId];
    
    const currentTile = state.map[attackerPosition.y * settings.gridSize.cols + attackerPosition.x];

    if (winnerId === attacker.id) {
        const monsterVP = [0, 2, 5, 7, 10][monster.level] || 0;
        attacker.victoryPoints += monsterVP;
        
        const deathAnim: DeathAnimation = {
            id: `monster-${currentTile.x}-${currentTile.y}-${monster.name}`,
            x: currentTile.x,
            y: currentTile.y,
            sprite: monster.sprite.death,
            createdAt: Date.now()
        };
        state.deathAnimations.push(deathAnim);

        currentTile.monsters = (currentTile.monsters || []).filter(m => m.name !== monster.name);
        state.log.push(`${attacker.name} defeated the ${monster.name} for ${monsterVP} VP!`);
        
        if (currentTile.monsters?.length === 0) {
          currentTile.type = IslandType.Resource;
            
          const resourceTypes: ResourceType[] = [ResourceTypeEnum.Gems, ResourceTypeEnum.Iron, ResourceTypeEnum.Wheat];
          const availableResources = [...resourceTypes];
          const islandResources: IslandResource[] = [];
          
          const numResourceTypes = Math.random() < 0.4 ? 2 : 1;

            if (numResourceTypes === 1) {
                const randomIndex = Math.floor(Math.random() * availableResources.length);
                const selectedResourceType = availableResources[randomIndex];
                islandResources.push({ type: selectedResourceType, amount: 2 * settings.baseResourceAmount });
            } else {
                for (let i = 0; i < numResourceTypes; i++) {
                    const randomIndex = Math.floor(Math.random() * availableResources.length);
                    const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
                    const amount = (Math.random() < 0.5 ? 1 : 2) * settings.baseResourceAmount;
                    islandResources.push({ type: selectedResourceType, amount });
                }
            }
            
            currentTile.resources = islandResources;
            const resourceNames = islandResources.map(r => r.type).join(' and ');
            state.log.push(`The defeated monster revealed new resources on the island: ${resourceNames}!`);
        }
        
    } else {
        state.log.push(`${attacker.name} was defeated by the ${monster.name}!`);
        const baseTile = baseTiles.find(t => t.owner === attacker.id);
        const losingArmy = attacker.armies.find(a => a.position.x === attackerPosition.x && a.position.y === attackerPosition.y);
        if (losingArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${attacker.id}-${losingArmy.id}`,
                x: losingArmy.position.x,
                y: losingArmy.position.y,
                sprite: PLAYER_DATA[attacker.color].sprite.death,
                createdAt: Date.now()
            };
            state.deathAnimations.push(deathAnim);
            
            state.map[losingArmy.position.y * settings.gridSize.cols + losingArmy.position.x].occupants = state.map[losingArmy.position.y * settings.gridSize.cols + losingArmy.position.x].occupants.filter(o => o.armyId !== losingArmy.id);
            losingArmy.position = { x: baseTile.x, y: baseTile.y };
            losingArmy.hasActed = false; // Reset status on respawn
            state.map[baseTile.y * settings.gridSize.cols + baseTile.x].occupants.push({ playerId: attacker.id, armyId: losingArmy.id });
        }
    }

    if (attacker.victoryPoints >= settings.victoryPointGoal && !state.winner) {
        state.winner = attacker;
        state.status = GameStatus.Finished;
        state.log.push(`🎉 ${attacker.name} has reached ${attacker.victoryPoints} Victory Points and won the game!`);
    }

    state.monsterCombatState = null;
    return state;
}
