
import type { GameState, Army, Monster, DeathAnimation, CardName, ActionHandlerResult, ResourceType, IslandResource, Player } from '@/lib/types';
import { PLAYER_DATA } from '@/lib/player-data';
import { checkAndEndTurnIfNoActions, canArmyPerformAnyAction } from './player';
import { GameAction, IslandType, MAP_COLS, ResourceType as ResourceTypeEnum } from '../types';
import { cloneDeep } from 'lodash';

export function handleAttackAction(state: GameState, selectedArmy: Army | null): ActionHandlerResult {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex, map } = newState;
    const attacker = players[currentPlayerIndex];

    if (!selectedArmy) throw new Error("No army selected.");
    if (selectedArmy.hasActed && !attacker.hasExtraMove) throw new Error("This army has already acted this turn.");

    const currentTile = map[selectedArmy.position.y * MAP_COLS + selectedArmy.position.x];
    const otherPlayersOccupants = currentTile.occupants.filter(o => o.playerId !== attacker.id);

    if (otherPlayersOccupants.length > 0) {
        const defenderPlayerId = otherPlayersOccupants[0].playerId;
        const defendingPlayer = players.find(p => p.id === defenderPlayerId);

        if (!defendingPlayer) {
            throw new Error("Defending player not found.");
        }

        const defendingArmies = otherPlayersOccupants
            .map(o => defendingPlayer.armies.find(a => a.id === o.armyId))
            .filter((a): a is Army => !!a);

        if (defendingArmies.length === 1) {
            newState.combatState = {
                attackerId: attacker.id,
                attackingArmyId: selectedArmy.id,
                defenderId: defendingPlayer.id,
                defendingArmyId: defendingArmies[0].id,
                attackerRolls: [],
                defenderRolls: [],
                winnerId: null,
                phase: 'rolling',
            };
        } else {
             // This is now a UI concern, so we return the data needed for the local dialog
             return { 
                state: newState, 
                ui: { 
                    newAttackSelectionDialogState: {
                        attackingArmyId: selectedArmy.id,
                        defendingPlayer: defendingPlayer,
                        armies: defendingArmies,
                    }
                } 
            };
        }
    } else if (currentTile.type === IslandType.Monster && currentTile.monsters && currentTile.monsters.length > 0) {
      newState.monsterCombatState = {
        attackerId: attacker.id,
        attackerPosition: selectedArmy.position,
        monster: currentTile.monsters[0],
        attackerRolls: [],
        monsterRolls: [],
        winnerId: null,
        phase: 'rolling',
      };
    } else {
        newState.log.push(`${attacker.name}'s army attacks, but finds no target!`);
        const army = attacker.armies.find(a => a.id === selectedArmy.id);
        if (army) army.hasActed = true;
        newState = checkAndEndTurnIfNoActions(newState);
    }
    return { state: newState, ui: null };
}

export function handleSelectDefender(state: GameState, defenderArmyId: number, attackingArmyId: number): GameState {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex } = newState;
    const attacker = players[currentPlayerIndex];

    const attackingArmy = attacker.armies.find(a => a.id === attackingArmyId);
    if (!attackingArmy) return newState;
    
    const tile = newState.map[attackingArmy.position.y * MAP_COLS + attackingArmy.position.x];
    const defenderOccupant = tile.occupants.find(o => o.playerId !== attacker.id);
    if (!defenderOccupant) return newState;
    
    const defender = players.find(p => p.id === defenderOccupant.playerId);
    if (!defender) return newState;
    
    newState.combatState = {
        attackerId: attacker.id,
        attackingArmyId: attackingArmyId,
        defenderId: defender.id,
        defendingArmyId: defenderArmyId,
        attackerRolls: [],
        defenderRolls: [],
        winnerId: null,
        phase: 'rolling',
    };

    return newState;
}

export function handleCombatRoll(state: GameState, useWarChief: boolean, attackingArmy: Army | null): GameState {
    if (!state.combatState) return state;
    if (!attackingArmy) return state;

    const newState = cloneDeep(state);
    const { combatState, players, discardPile } = newState;
    const attacker = players[combatState.attackerId];
    const defender = players.find(p => p.id === combatState.defenderId);
    if(!defender) return state;

    let attackerBonusPower = 0;
    const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

    if (useWarChief && canUseCard) {
        const cardIndex = attacker.specialCards.indexOf(CardName.WarChief);
        if (cardIndex > -1) {
            attacker.actionsThisTurn.push(GameAction.UseCard);
            attackerBonusPower += 2;
            newState.log.push(`${attacker.name} used 'War Chief' for +2 power!`);
            const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
            discardPile.push(usedCard);
        }
    }

    const rollDice = (count: number) => Array.from({ length: Math.max(1, Math.min(count, 6)) }, () => Math.floor(Math.random() * 6) + 1);

    combatState.attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
    combatState.defenderRolls = rollDice(defender.attackPower + 1);
    
    const attackerScore = combatState.attackerRolls.reduce((a, b) => a + b, 0);
    const defenderScore = combatState.defenderRolls.reduce((a, b) => a + b, 0);

    combatState.winnerId = attackerScore > defenderScore ? combatState.attackerId : combatState.defenderId;
    combatState.phase = 'results';

    const armyInState = attacker.armies.find(a => a.id === attackingArmy.id);
    if(armyInState) armyInState.hasActed = true;
    
    return newState;
};

export function handleCloseCombat(state: GameState): GameState {
    let newState = cloneDeep(state);
    const { combatState, players, map, baseTiles } = newState;
    if (!combatState || combatState.phase !== 'results' || combatState.winnerId === null) {
        return { ...newState, combatState: null };
    }
    
    const { winnerId, attackerId, defenderId, attackingArmyId, defendingArmyId } = combatState;
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players.find(p => p.id === winnerId)!;
    const loser = players.find(p => p.id === loserId)!;
    
    const attackingArmy = players.find(p=>p.id === attackerId)?.armies.find(a => a.id === attackingArmyId);

    if (!attackingArmy) return { ...newState, combatState: null };
    
    const combatTile = map[attackingArmy.position.y * MAP_COLS + attackingArmy.position.x];

    if (loserId === defenderId) {
        winner.victoryPoints += 5;
        newState.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);

        const losingArmy = loser.armies.find(a => a.id === defendingArmyId);
        const baseTile = baseTiles.find(b => b.owner === loserId);

        if (losingArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${loser.id}-${losingArmy.id}`,
                x: losingArmy.position.x,
                y: losingArmy.position.y,
                sprite: PLAYER_DATA[loser.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);

            const oldPos = losingArmy.position;
            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === losingArmy.id && o.playerId === loserId));
            losingArmy.position = {x: baseTile.x, y: baseTile.y};
            losingArmy.hasActed = false; // Reset status on respawn
            map[baseTile.y * MAP_COLS + baseTile.x].occupants.push({playerId: loserId, armyId: losingArmy.id});
            
            const positionIndex = loser.positions.findIndex(p => p.armyId === losingArmy.id);
            if (positionIndex > -1) {
                const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                if (map[oldPos.y * MAP_COLS + oldPos.x].positionedBy) {
                    map[oldPos.y * MAP_COLS + oldPos.x]!.positionedBy = (map[oldPos.y * MAP_COLS + oldPos.x]!.positionedBy || []).filter(p => !(p.playerId === loserId && p.resource === removedPosition.resource));
                }
            }
        }
    } else { // Attacker lost
        winner.victoryPoints += 5;
        newState.log.push(`${winner.name} receives 5 VP for defeating ${loser.name}!`);
        
        const loserArmy = loser.armies.find(a => a.id === attackingArmyId);
        const baseTile = baseTiles.find(b => b.owner === loserId);
         if (loserArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${loser.id}-${loserArmy.id}`,
                x: loserArmy.position.x,
                y: loserArmy.position.y,
                sprite: PLAYER_DATA[loser.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);

            combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === loserArmy.id && o.playerId === loserId));
            loserArmy.position = {x: baseTile.x, y: baseTile.y};
            loserArmy.hasActed = false; // Reset status on respawn
            map[baseTile.y * MAP_COLS + baseTile.x].occupants.push({playerId: loserId, armyId: loserArmy.id});
         }
    }

    newState.log.push(`${winner.name} defeated ${loser.name} in battle!`);
    newState.combatState = null;
    
    return checkAndEndTurnIfNoActions(newState);
}

export function handleMonsterCombatRoll(state: GameState, payload: {monster: Monster; useDecideCard: boolean, decidedValue: number, useOvercomeCard: boolean, useWarChief: boolean}): GameState {
    const newState = cloneDeep(state);
    const { players, currentPlayerIndex, discardPile, monsterCombatState } = newState;
    if(!monsterCombatState) return newState;

    const attacker = players[currentPlayerIndex];
    const attackingArmy = attacker.armies.find(a => a.position.x === monsterCombatState.attackerPosition.x && a.position.y === monsterCombatState.attackerPosition.y);
    if (!attackingArmy) return newState;

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
            newState.log.push(`${attacker.name} used the 'Overcome' card to win automatically!`);
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
                newState.log.push(`${attacker.name} used 'War Chief' for +2 power!`);
             }
        }

        let canUseDecideCard = useDecideCard;
        if (useDecideCard && canUseCard && !cardUsedThisAction) {
            const cardIndex = attacker.specialCards.indexOf(CardName.DecideDiceRoll);
            if (cardIndex > -1) {
                cardUsedThisAction = true;
                newState.log.push(`${attacker.name} used the 'Decide Dice Roll' card!`);
            } else {
                canUseDecideCard = false;
            }
        } else if (useDecideCard) {
            canUseDecideCard = false;
        }
        
        const rollDice = (count: number) => Array.from({ length: Math.max(1, Math.min(count, 6)) }, () => Math.floor(Math.random() * 6) + 1);

        attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
        if(canUseDecideCard) attackerRolls[0] = decidedValue; 

        monsterRolls = rollDice(monster.level);
        const attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
        const monsterScore = monsterRolls.reduce((a, b) => a + b, 0);
        winnerId = attackerScore > monsterScore ? attacker.id : null;
    }
    
    if (cardUsedThisAction) {
        attacker.actionsThisTurn.push(GameAction.UseCard);
        let cardToDiscard: CardName | null = null;
        if (useOvercomeCard) cardToDiscard = CardName.Overcome;
        else if (useWarChief) cardToDiscard = CardName.WarChief;
        else if (useDecideCard) cardToDiscard = CardName.DecideDiceRoll;

        if (cardToDiscard) {
            const cardIndex = attacker.specialCards.indexOf(cardToDiscard);
            if (cardIndex > -1) discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
        }
    }
    
    const army = attacker.armies.find(a => a.id === attackingArmy.id);
    if(army) army.hasActed = true;

    newState.monsterCombatState = {
      attackerId: attacker.id,
      attackerPosition: attackingArmy.position,
      monster,
      attackerRolls,
      monsterRolls,
      winnerId: winnerId,
      phase: 'results',
    };
    return newState;
};

export function handleCloseMonsterCombat(state: GameState): GameState {
    let newState = cloneDeep(state);
    const { monsterCombatState, baseTiles, settings } = newState;
    if (!monsterCombatState || monsterCombatState.phase !== 'results') {
        return { ...newState, monsterCombatState: null };
    }
    
    const { winnerId, monster, attackerId, attackerPosition } = newState.monsterCombatState;
    const attacker = newState.players[attackerId];
    
    const currentTile = newState.map[attackerPosition.y * MAP_COLS + attackerPosition.x];

    if (winnerId === attacker.id) {
        const monsterVP = [0, 2, 5, 7, 10][monster.level] || 0;
        attacker.victoryPoints += monsterVP;
        
        const deathAnim: DeathAnimation = {
            id: `monster-${currentTile.x}-${currentTile.y}-${monster.name}`,
            x: currentTile.x,
            y: currentTile.y,
            sprite: monster.sprite.death
        };
        newState.deathAnimations.push(deathAnim);

        currentTile.monsters = (currentTile.monsters || []).filter(m => m.name !== monster.name);
        newState.log.push(`${attacker.name} defeated the ${monster.name} for ${monsterVP} VP!`);
        
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
            newState.log.push(`The defeated monster revealed new resources on the island: ${resourceNames}!`);
        }
        
        newState.monsterCombatState = null;
        return checkAndEndTurnIfNoActions(newState);

    } else {
        newState.log.push(`${attacker.name} was defeated by the ${monster.name}!`);
        const baseTile = baseTiles.find(t => t.owner === attacker.id);
        const losingArmy = attacker.armies.find(a => a.position.x === attackerPosition.x && a.position.y === attackerPosition.y);
        if (losingArmy && baseTile) {
            const deathAnim: DeathAnimation = {
                id: `army-${attacker.id}-${losingArmy.id}`,
                x: losingArmy.position.x,
                y: losingArmy.position.y,
                sprite: PLAYER_DATA[attacker.color].sprite.death
            };
            newState.deathAnimations.push(deathAnim);
            
            newState.map[losingArmy.position.y * MAP_COLS + losingArmy.position.x].occupants = newState.map[losingArmy.position.y * MAP_COLS + losingArmy.position.x].occupants.filter(o => o.armyId !== losingArmy.id);
            losingArmy.position = {x: baseTile.x, y: baseTile.y};
            losingArmy.hasActed = false; // Reset status on respawn
            newState.map[baseTile.y * MAP_COLS + baseTile.x].occupants.push({playerId: attacker.id, armyId: losingArmy.id});
        }
    }

    newState.monsterCombatState = null;
    return checkAndEndTurnIfNoActions(newState);
}
