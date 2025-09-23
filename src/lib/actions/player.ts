
import type { GameState, Player, Army, CardName, ActionHandlerResult, IslandResource, ResourceType } from '@/lib/types';
import { db, doc, deleteDoc, writeBatch, getDoc, arrayUnion, runTransaction } from '@/lib/firebase';
import { GameAction, AbilityName, IslandType, MAP_COLS, CardName as CardNameEnum, GameStatus } from '../types';
import { getPossibleMoves } from './movement';
import { takeBotTurn } from '../bot-logic';
import { cloneDeep } from 'lodash';

export function handleCancelAction(state: GameState): GameState {
  const newState = cloneDeep(state);
  const player = newState.players[newState.currentPlayerIndex];
  
  const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
  if (cardUseIndex > -1) {
    player.actionsThisTurn.splice(cardUseIndex, 1);
    newState.log.push(`${player.name} cancelled their card action.`);
  }

  // Reset all temporary flags that could be set by a card
  if (player.hasExtraMove) {
    player.hasExtraMove = false;
    newState.log.push(`${player.name} cancelled their Extra Move.`);
  }
  player.reinforceActive = false;
  player.efficientActive = false;
  player.masterBuilderActive = false;
  
  return newState;
}


export function canArmyPerformAnyAction(state: GameState, army: Army): boolean {
    const player = state.players[state.currentPlayerIndex];
    if (player.id !== state.currentPlayerIndex) return false;

    if (army.hasActed && !player.hasExtraMove) return false;

    if (getPossibleMoves(state, army).length > 0) return true;

    const tile = state.map[army.position.y * MAP_COLS + army.position.x];

    const canAttack = tile.occupants.some(o => o.playerId !== player.id) || (tile.type === IslandType.Monster && !!tile.monsters && tile.monsters.length > 0);
    if (canAttack) return true;

    const isPositioned = player.positions.some(p => p.armyId === army.id);
    if (!isPositioned && (tile.type === IslandType.Resource || tile.type === IslandType.Base) && tile.resources.length > 0 && (!tile.monsters || tile.monsters.length === 0)) {
       const hasAvailableResourceSlot = tile.resources.some(res => !(tile.positionedBy || []).some(p => p.resource === res.type));
       if (hasAvailableResourceSlot) return true;
    }

    return false;
}


export function canPlayerPerformAnyAction(state: GameState): boolean {
    const player = state.players[state.currentPlayerIndex];

    if (player.armies.some(army => canArmyPerformAnyAction(state, army))) {
        return true;
    }

    const { settings, specialCardsDeck, discardPile } = state;
    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

    const upgradeCost = player.masterBuilderActive ? Math.ceil(settings.upgradeCost / 2) : settings.upgradeCost;
    if (player.resources.iron >= upgradeCost && !player.actionsThisTurn.includes(GameAction.Upgrade) && player.attackPower < 4) {
        return true;
    }

    if (player.resources.gems >= 10 && !player.actionsThisTurn.includes(GameAction.BuyCard) && (specialCardsDeck.length > 0 || discardPile.length > 0)) {
        return true;
    }

    const deployCost = player.efficientActive ? Math.ceil(player.nextArmyCost / 2) : player.nextArmyCost;
    if ((player.resources.wheat >= deployCost || player.reinforceActive) && player.armyCount < 5 && !player.actionsThisTurn.includes(GameAction.Deploy)) {
        return true;
    }

    if (canUseCard && player.specialCards.length > 0) {
        return true;
    }
    
    if (player.resources.gems >= settings.abilityCost && settings.availableAbilities.length > 0) {
        const unownedAbilities = settings.availableAbilities.filter(a => !player.passiveAbilities[a as AbilityName]);
        if (unownedAbilities.length > 0) {
            return true;
        }
    }

    return false;
}

export function checkAndEndTurnIfNoActions(state: GameState): GameState {
    if (!canPlayerPerformAnyAction(state)) {
        state.log.push(`${state.players[state.currentPlayerIndex].name} has no more actions. Ending turn automatically.`);
        return handleEndTurn(state);
    }
    return state;
}

export function handleDeployAction(state: GameState): GameState {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex, map, discardPile, settings, baseTiles } = newState;
    const player = players[currentPlayerIndex];
    
    if (player.actionsThisTurn.includes(GameAction.Deploy)) throw new Error("You can only deploy one army per turn.");
    
    let cost = player.nextArmyCost;
    let isReinforceUsed = false;
    let isEfficientUsed = false;
    
    if (player.reinforceActive) {
        cost = 0;
        isReinforceUsed = true;
    } else if (player.efficientActive) {
        cost = Math.ceil(cost / 2);
        isEfficientUsed = true;
    }

    if (player.resources.wheat < cost) throw new Error(`Not enough wheat. Cost: ${cost}`);
    if (player.armyCount >= 5) throw new Error("You have reached the maximum army size.");

    player.resources.wheat -= cost;
    player.armyCount += 1;
    const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
    const newArmy: Army = { id: newArmyId, position: {x: 0, y: 0}, hasActed: true }; 
    
    const baseTileInfo = baseTiles.find(b => b.owner === player.id);
    if (!baseTileInfo) throw new Error("Base not found!");
    newArmy.position = {x: baseTileInfo.x, y: baseTileInfo.y};

    player.armies.push(newArmy);
    map[baseTileInfo.y * MAP_COLS + baseTileInfo.x].occupants.push({ playerId: player.id, armyId: newArmy.id });
    
    if (isEfficientUsed) {
      newState.log.push(`${player.name} used 'Efficient' to deploy!`);
      player.efficientActive = false;
      const cardIndex = player.specialCards.indexOf(CardNameEnum.Efficient);
      if (cardIndex > -1) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    if (isReinforceUsed) {
      newState.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
      player.reinforceActive = false;
      const cardIndex = player.specialCards.indexOf(CardNameEnum.Reinforce);
      if (cardIndex > -1) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    if (!isReinforceUsed) {
        player.nextArmyCost += settings.deployCostIncrement;
    }
    
    player.actionsThisTurn.push(GameAction.Deploy);
    newState.log.push(`${player.name} deployed a new army!`);
    
    return checkAndEndTurnIfNoActions(newState);
}

export function handleUpgradeAction(state: GameState): GameState {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex, discardPile, settings } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes(GameAction.Upgrade)) throw new Error("You can only upgrade once per turn.");
    if (player.attackPower >= 4) throw new Error("You have reached the maximum attack power.");

    let cost = settings.upgradeCost;
    if (player.masterBuilderActive) {
        cost = Math.ceil(cost / 2);
    }
    if (player.resources.iron < cost) throw new Error(`Not enough iron. Cost: ${cost}`);
    
    player.resources.iron -= cost;
    player.attackPower += 1;

    if (player.masterBuilderActive) {
      newState.log.push(`${player.name} used 'Master Builder' for a cheaper upgrade!`);
      player.masterBuilderActive = false;
      const cardIndex = player.specialCards.indexOf(CardNameEnum.MasterBuilder);
      if (cardIndex > -1) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    player.actionsThisTurn.push(GameAction.Upgrade);
    newState.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower + 1}.`);
    
    return checkAndEndTurnIfNoActions(newState);
}

function applyAutomaticCollection(state: GameState, player: Player): { newState: GameState, collectedResources: Record<string, number> } {
    let newState = cloneDeep(state);
    const collectedResources: Record<string, number> = {};
    
    player.positions.forEach(pos => {
        const tile = newState.map[pos.y * MAP_COLS + pos.x];
        const resourceSpot = tile.resources.find(r => r.type === pos.resource);
        if (resourceSpot) {
            player.resources[resourceSpot.type] += resourceSpot.amount;
            collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + resourceSpot.amount;
        }
    });

    player.positions.forEach(pos => {
        const tile = newState.map[pos.y * MAP_COLS + pos.x];
        if (tile && tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === pos.resource));
        }
    });
    player.positions = [];

    return { newState, collectedResources };
}

export function handleEndTurn(state: GameState): GameState {
    let newState = cloneDeep(state); 
    
    if (newState.currentPlayerIndex >= newState.players.length) {
        newState.currentPlayerIndex = 0;
    }
    
    let outgoingPlayer = newState.players[newState.currentPlayerIndex];
    
    outgoingPlayer.hasExtraMove = false;
    outgoingPlayer.efficientActive = false;
    outgoingPlayer.masterBuilderActive = false;
    outgoingPlayer.reinforceActive = false;
    outgoingPlayer.armies.forEach((army: Army) => army.hasActed = false);
    outgoingPlayer.actionsThisTurn = [];

    let nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    
    newState.currentPlayerIndex = nextPlayerIndex;
    let nextPlayer = newState.players[nextPlayerIndex];

    if (nextPlayer.isSabotaged) {
        nextPlayer.isSabotaged = false; 
        newState.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        return handleEndTurn(newState);
    }
    
    // --- Pre-Turn Passive Abilities for NEW Player ---
    if (nextPlayer.passiveAbilities.explorer) {
        const occupiedIslands = new Set<string>();
        nextPlayer.armies.forEach((army: Army) => {
            const tile = newState.map[army.position.y * MAP_COLS + army.position.x];
            occupiedIslands.add(tile.id);
        });
        const vpGained = occupiedIslands.size;
        if (vpGained > 0) {
            nextPlayer.victoryPoints += vpGained;
            newState.log.push(`${nextPlayer.name}'s Explorer ability generated ${vpGained} VP.`);
        }
    }

    if (nextPlayer.passiveAbilities.collector) {
        let resourcesCollected: Partial<Record<string, number>> = {};
        const occupiedIslands = new Set<string>();
        
        nextPlayer.armies.forEach((army: Army) => {
            const tile = newState.map[army.position.y * MAP_COLS + army.position.x];
            if (occupiedIslands.has(tile.id)) return;
            
            if ((tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0) {
                occupiedIslands.add(tile.id);
                tile.resources.forEach((resource: { type: string; }) => {
                    nextPlayer.resources[resource.type as ResourceType] += 1;
                    resourcesCollected[resource.type] = (resourcesCollected[resource.type] || 0) + 1;
                });
            }
        });

        const collectedStrings = Object.entries(resourcesCollected).map(([type, amount]) => `${amount} ${type}`);
        if(collectedStrings.length > 0) {
            newState.log.push(`${nextPlayer.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`);
        }
    }
    
    const hasProductiveCard = nextPlayer.specialCards.includes(CardNameEnum.Productive);
    const positionedArmies = nextPlayer.positions;

    if (positionedArmies.length > 0 && newState.turn > 0) {
        if (hasProductiveCard) {
            // Let the client handle this via a dialog
            newState.log.push(`${nextPlayer.name}, you have a 'Productive' card. You will be prompted to use it.`);
        } else {
            const collectionResult = applyAutomaticCollection(newState, nextPlayer);
            newState = collectionResult.newState;
            const collectedStrings = Object.entries(collectionResult.collectedResources).map(([type, amount]) => `${amount} ${type}`);
            if (collectedStrings.length > 0) {
                newState.log.push(`${nextPlayer.name} automatically collected ${collectedStrings.join(', ')}.`);
            }
        }
    }

    if (newState.currentPlayerIndex === 0) {
      newState.turn += 1;
    }
    
    newState.log.push(`It's now ${nextPlayer.name}'s turn.`);
    
    newState.combatState = null;
    newState.monsterCombatState = null;

    if (nextPlayer.isBot) {
        setTimeout(() => takeBotTurn(newState), 1000);
    }

    return newState;
}

export async function handlePlayerExit(gameId: string, playerId: string): Promise<void> {
    try {
        const gameDocRef = doc(db, 'games', gameId);
        
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) {
                return;
            }
            let currentState = gameDoc.data() as GameState;
            const playerIndex = currentState.players.findIndex(p => p.playerId === playerId);
            if (playerIndex === -1) {
                return;
            }
            
            const isHost = playerIndex === 0;

            if (isHost || currentState.players.length <= 1) {
                transaction.delete(gameDocRef);
                return;
            }

            const isCurrentPlayerExiting = currentState.currentPlayerIndex === playerIndex;

            currentState.log.push(`${currentState.players[playerIndex].name} has left the game.`);
            
            // Remove all remnants of the player
            currentState.map.forEach(tile => {
                tile.occupants = tile.occupants.filter(o => o.playerId !== playerIndex);
                tile.positionedBy = (tile.positionedBy || []).filter(p => p.playerId !== playerIndex);
            });

            currentState.players.splice(playerIndex, 1);

            // Re-assign player IDs (seat indices) and update references
            currentState.players.forEach((p, i) => p.id = i);
            
            currentState.map.forEach(tile => {
                tile.occupants.forEach(o => {
                    if (o.playerId > playerIndex) o.playerId--;
                });
                (tile.positionedBy || []).forEach(p => {
                    if (p.playerId > playerIndex) p.playerId--;
                });
            });
            
            if (currentState.combatState) {
                if (currentState.combatState.attackerId > playerIndex) currentState.combatState.attackerId--;
                if (currentState.combatState.defenderId > playerIndex) currentState.combatState.defenderId--;
                if(currentState.combatState.attackerId === playerIndex || currentState.combatState.defenderId === playerIndex) {
                    currentState.combatState = null;
                }
            }


            if (isCurrentPlayerExiting) {
                currentState.currentPlayerIndex = playerIndex % currentState.players.length;
                currentState = handleEndTurn(currentState);
            } else if (playerIndex < currentState.currentPlayerIndex) {
                currentState.currentPlayerIndex--;
            }
            
            if(currentState.currentPlayerIndex >= currentState.players.length) {
                currentState.currentPlayerIndex = 0;
            }

            transaction.set(gameDocRef, currentState);
        });
        
    } catch (error) {
        console.error("Error leaving game:", error);
    }
}
