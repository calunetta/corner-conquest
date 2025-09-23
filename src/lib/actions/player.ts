

import type { GameState, Player, Army, CardName, ActionHandlerResult, IslandResource, ResourceType } from '@/lib/types';
import { db, doc, deleteDoc, writeBatch, getDoc, arrayUnion } from '@/lib/firebase';
import { GameAction, AbilityName, IslandType, MAP_COLS, CardName as CardNameEnum } from '../types';
import { getPossibleMoves } from './movement';

export function handleCancelAction(state: GameState): GameState {
  const newState = { ...state };
  const player = newState.players[newState.currentPlayerIndex];
  
  // Refund the UseCard action if it was provisionally taken
  const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
  if (cardUseIndex > -1) {
    player.actionsThisTurn.splice(cardUseIndex, 1);
  }

  // Reset any temporary flags that were set by a card
  player.hasExtraMove = false;
  player.reinforceActive = false;
  player.efficientActive = false;
  player.masterBuilderActive = false;
  
  // Close any dialogs that were opened by a card
  newState.sabotageDialogState = null;
  newState.stealResourceDialogState = null;
  newState.wealthyDialogState = null;

  newState.log.push(`${player.name} cancelled their action.`);

  return newState;
}


export function canArmyPerformAnyAction(state: GameState, army: Army): boolean {
    const player = state.players[state.currentPlayerIndex];
    if (player.id !== state.currentPlayerIndex) return false; // Not the current player

    if (army.hasActed && !player.hasExtraMove) return false;

    // Can Move?
    if (getPossibleMoves(state, army).length > 0) return true;

    const tile = state.map[army.position.y * MAP_COLS + army.position.x];

    // Can Attack?
    const canAttack = tile.occupants.some(o => o.playerId !== player.id) || (tile.type === IslandType.Monster && !!tile.monsters && tile.monsters.length > 0);
    if (canAttack) return true;

    // Can Position?
    const isPositioned = player.positions.some(p => p.armyId === army.id);
    if (!isPositioned && (tile.type === IslandType.Resource || tile.type === IslandType.Base) && tile.resources.length > 0 && (!tile.monsters || tile.monsters.length === 0)) {
       const hasAvailableResourceSlot = tile.resources.some(res => !(tile.positionedBy || []).some(p => p.resource === res.type));
       if (hasAvailableResourceSlot) return true;
    }

    return false;
}


export function canPlayerPerformAnyAction(state: GameState): boolean {
    const player = state.players[state.currentPlayerIndex];

    // Check if any army can perform an action
    if (player.armies.some(army => canArmyPerformAnyAction(state, army))) {
        return true;
    }

    const { settings, specialCardsDeck, discardPile } = state;
    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

    // Check strategic (non-army) actions
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
    let newState = { ...state };
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
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    if (isReinforceUsed) {
      newState.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
      player.reinforceActive = false;
      const cardIndex = player.specialCards.indexOf(CardNameEnum.Reinforce);
      if (cardIndex > -1) {
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
    let newState = { ...state };
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
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    player.actionsThisTurn.push(GameAction.Upgrade);
    newState.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower + 1}.`);
    
    return checkAndEndTurnIfNoActions(newState);
}

function applyAutomaticCollection(state: GameState, player: Player): { newState: GameState, collectedResources: Record<string, number> } {
    let newState = { ...state };
    const collectedResources: Record<string, number> = {};
    
    player.positions.forEach(pos => {
        const tile = newState.map[pos.y * MAP_COLS + pos.x];
        const resourceSpot = tile.resources.find(r => r.type === pos.resource);
        if (resourceSpot) {
            player.resources[resourceSpot.type] += resourceSpot.amount;
            collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + resourceSpot.amount;
        }
    });

    // Reset positions after collecting
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
    let newState = JSON.parse(JSON.stringify(state)); 
    
    if (newState.currentPlayerIndex >= newState.players.length) {
        newState.currentPlayerIndex = 0;
    }
    
    let outgoingPlayer = newState.players[newState.currentPlayerIndex];
    
    outgoingPlayer.hasExtraMove = false;
    outgoingPlayer.efficientActive = false;
    outgoingPlayer.masterBuilderActive = false;
    
    outgoingPlayer.armies.forEach((army: Army) => army.hasActed = false);
    outgoingPlayer.actionsThisTurn = [];

    // --- Determine Next Player ---
    let nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    let nextPlayer = newState.players[nextPlayerIndex];

    if (nextPlayer.isSabotaged) {
        nextPlayer.isSabotaged = false; 
        newState.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
        nextPlayer = newState.players[nextPlayerIndex];
    }
    
    newState.currentPlayerIndex = nextPlayerIndex;
    
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
                    nextPlayer.resources[resource.type] += 1;
                    resourcesCollected[resource.type] = (resourcesCollected[resource.type] || 0) + 1;
                });
            }
        });

        const collectedStrings = Object.entries(resourcesCollected).map(([type, amount]) => `${amount} ${type}`);
        if(collectedStrings.length > 0) {
            newState.log.push(`${nextPlayer.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`);
        }
    }

    
    // Auto-select army if the next player has only one
    if (nextPlayer.armies.length === 1) {
        newState.autoSelectArmyFor = { playerId: nextPlayer.playerId, armyId: nextPlayer.armies[0].id };
    } else {
        newState.autoSelectArmyFor = null;
    }
    
    const hasProductiveCard = nextPlayer.specialCards.includes(CardNameEnum.Productive);
    const positionedArmies = nextPlayer.positions;

    if (positionedArmies.length > 0) {
        if (hasProductiveCard) {
            const options = positionedArmies.map(pos => {
                const tile = newState.map[pos.y * MAP_COLS + pos.x];
                const resource = tile.resources.find(r => r.type === pos.resource);
                return resource ? { resource: resource.type, amount: resource.amount, x: pos.x, y: pos.y } : null;
            }).filter((opt): opt is { resource: ResourceType; amount: number; x: number; y: number } => opt !== null);
            
            newState.productiveCardDialogState = {
                isOpen: true,
                options: options
            };
            newState.log.push(`${nextPlayer.name}, you have a 'Productive' card. Choose a resource to double.`);
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
    newState.positionDialogState = null;
    newState.stealResourceDialogState = null;
    newState.sabotageDialogState = null;
    newState.wealthyDialogState = null;
    newState.armySelectionDialogState = null;
    newState.attackSelectionDialogState = null;
    newState.specialIslandRollDialogState = null;

    return newState;
}

interface PlayerExitParams {
    gameId: string;
    localPlayer: Player;
    onExit: () => void;
}

export async function handlePlayerExit({ gameId, localPlayer, onExit }: PlayerExitParams): Promise<boolean> {
    try {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);

        if (!gameDoc.exists()) {
            onExit();
            return true;
        }

        const currentState = gameDoc.data() as GameState;
        
        if (currentState.players.length <= 1) {
            await deleteDoc(gameDocRef);
        } else {
            const batch = writeBatch(db);
            const newPlayers = currentState.players.filter((p: Player) => p.playerId !== localPlayer.playerId);
            const newLog = arrayUnion(`${localPlayer.name} has left the room.`);
            
            let newCurrentPlayerIndex = currentState.currentPlayerIndex;
            if (currentState.currentPlayerIndex >= newPlayers.length) {
                newCurrentPlayerIndex = 0;
            }

            batch.update(gameDocRef, { 
                players: newPlayers, 
                log: newLog,
                currentPlayerIndex: newCurrentPlayerIndex,
            });
            await batch.commit();
        }
        
        onExit();
        return true;
    } catch (error) {
        console.error("Error leaving game:", error);
        return false;
    }
}

export async function handleConfirmHostLeave(gameId: string, onExit: () => void) {
  try {
      const gameDocRef = doc(db, 'games', gameId);
      await deleteDoc(gameDocRef);
      onExit();
  } catch (error) {
    console.error("Error during host leave confirmation:", error);
  }
}
