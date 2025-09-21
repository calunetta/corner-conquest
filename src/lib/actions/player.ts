

import type { GameState, Player, Army, CardName } from '@/lib/types';
import { db, doc, deleteDoc, runTransaction, arrayUnion } from '@/lib/firebase';
import { GameAction, AbilityName } from '../types';

export function canPlayerPerformAnyAction(state: GameState): boolean {
    const player = state.players[state.currentPlayerIndex];

    if (player.armies.some(army => !army.hasActed)) {
        return true;
    }
    
    if (player.hasExtraMove) {
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
    let newState = { ...state };
    const { players, currentPlayerIndex, map, discardPile, settings, baseTiles } = newState;
    const player = players[currentPlayerIndex];
    
    if (player.actionsThisTurn.includes(GameAction.Deploy)) throw new Error("You can only deploy one army per turn.");
    
    let cost = player.nextArmyCost;
    let isReinforceUsed = false;
    
    if (player.efficientActive) {
        cost = Math.ceil(cost / 2);
    }
    if (player.reinforceActive) {
        cost = 0;
        isReinforceUsed = true;
    }

    if (player.resources.wheat < cost) throw new Error(`Not enough wheat. Cost: ${cost}`);
    if (player.armyCount >= 5) throw new Error("You have reached the maximum army size.");

    player.resources.wheat -= cost;
    player.armyCount += 1;
    const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
    const newArmy: Army = { id: newArmyId, position: {x: 0, y: 0}, hasActed: true }; 
    
    const baseTile = baseTiles.find(b => b.owner === player.id);
    if (!baseTile) throw new Error("Base not found!");
    newArmy.position = {x: baseTile.x, y: baseTile.y};

    player.armies.push(newArmy);
    map[baseTile.y][baseTile.x].occupants.push({ playerId: player.id, armyId: newArmy.id });
    
    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

    if (player.efficientActive && canUseCard) {
      newState.log.push(`${player.name} used 'Efficient' for a cheaper deployment!`);
      player.efficientActive = false;
      player.actionsThisTurn.push(GameAction.UseCard);
      const cardIndex = player.specialCards.indexOf(CardName.Efficient);
      if (cardIndex > -1) {
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    if (isReinforceUsed) {
      newState.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
      player.reinforceActive = false;
      if (canUseCard) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const cardIndex = player.specialCards.indexOf(CardName.Reinforce);
          if (cardIndex > -1) {
              const usedCard = player.specialCards.splice(cardIndex, 1)[0];
              discardPile.push(usedCard);
          }
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
      const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);
      if (canUseCard) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const cardIndex = player.specialCards.indexOf(CardName.MasterBuilder);
          if (cardIndex > -1) {
              const usedCard = player.specialCards.splice(cardIndex, 1)[0];
              discardPile.push(usedCard);
          }
      }
    }

    player.actionsThisTurn.push(GameAction.Upgrade);
    newState.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower + 1}.`);
    
    return checkAndEndTurnIfNoActions(newState);
}

export function handleEndTurn(state: GameState): GameState {
    let newState = JSON.parse(JSON.stringify(state)); 
    let currentPlayer = newState.players[newState.currentPlayerIndex];
    
    if (currentPlayer.passiveAbilities.explorer) {
        const occupiedIslands = new Set<string>();
        currentPlayer.armies.forEach((army: Army) => {
            const tile = newState.map[army.position.y][army.position.x];
            occupiedIslands.add(tile.id);
        });
        const vpGained = occupiedIslands.size;
        if (vpGained > 0) {
            currentPlayer.victoryPoints += vpGained;
            newState.log.push(`${currentPlayer.name}'s Explorer ability generated ${vpGained} VP.`);
        }
    }
    
    if (currentPlayer.passiveAbilities.collector) {
        let resourcesCollected: Partial<Record<string, number>> = {};
        const occupiedIslands = new Set<string>();
        
        currentPlayer.armies.forEach((army: Army) => {
            const tile = newState.map[army.position.y][army.position.x];
            if (occupiedIslands.has(tile.id)) return;
            
            if ((tile.type === 'resource' || tile.type === 'base') && tile.resources.length > 0) {
                occupiedIslands.add(tile.id);
                tile.resources.forEach((resource: { type: string; }) => {
                    currentPlayer.resources[resource.type] += 1;
                    resourcesCollected[resource.type] = (resourcesCollected[resource.type] || 0) + 1;
                });
            }
        });

        const collectedStrings = Object.entries(resourcesCollected).map(([type, amount]) => `${amount} ${type}`);
        if(collectedStrings.length > 0) {
            newState.log.push(`${currentPlayer.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`);
        }
    }
    
    currentPlayer.hasExtraMove = false;
    currentPlayer.efficientActive = false;
    currentPlayer.masterBuilderActive = false;
    
    currentPlayer.armies.forEach((army: Army) => army.hasActed = false);
    currentPlayer.actionsThisTurn = [];


    // Determine the next player
    let nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    let nextPlayer = newState.players[nextPlayerIndex];

    // Handle Sabotage
    if (nextPlayer.isSabotaged) {
        nextPlayer.isSabotaged = false; 
        newState.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
        nextPlayer = newState.players[nextPlayerIndex];
    }
    
    newState.currentPlayerIndex = nextPlayerIndex;

    if (newState.currentPlayerIndex === 0) {
      newState.turn += 1;
    }
    
    newState.log.push(`It's now ${nextPlayer.name}'s turn.`);
    
    // Reset all dialogs and temporary states
    newState.teleportState = null;
    newState.scoutingState = null;
    newState.combatState = null;
    newState.monsterCombatState = null;
    newState.positionDialogState = null;
    newState.collectDialogState = null;
    newState.stealResourceDialogState = null;
    newState.useCardDialogState = null;
    newState.abilitiesShopState = null;
    newState.showHostLeaveDialog = false;
    newState.sabotageDialogState = null;
    newState.wealthyDialogState = null;
    newState.armySelectionDialogState = null;
    newState.attackSelectionDialogState = null;

    return newState;
}

export function handleDeselectArmy() {
    return {
        selectedArmyId: null,
        possibleMoves: [],
        currentAction: null,
    }
}


export function handleCancelAction(state: GameState): GameState {
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerIndex];
    
    // Reverse card consumption if applicable
    if (newState.teleportState || newState.scoutingState) {
        const usedCardIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
        if (usedCardIndex > -1) player.actionsThisTurn.splice(usedCardIndex, 1);
        
        const cardFromDiscard = newState.discardPile.pop();
        if(cardFromDiscard) player.specialCards.push(cardFromDiscard);
    }
    
    newState.teleportState = null;
    newState.scoutingState = null;
    newState.monsterCombatState = null;
    newState.attackSelectionDialogState = null;
    newState.positionDialogState = null;
    newState.collectDialogState = null;
    newState.useCardDialogState = null;
    newState.sabotageDialogState = null;
    newState.wealthyDialogState = null;
    newState.stealResourceDialogState = null;
    newState.showHostLeaveDialog = false;
    
    if (player.hasExtraMove) {
        const cardIndex = player.specialCards.indexOf(CardName.ExtraMove);
        if (cardIndex === -1) { // If card was already used
             const discardIndex = newState.discardPile.indexOf(CardName.ExtraMove);
             if (discardIndex > -1) {
                const card = newState.discardPile.splice(discardIndex, 1)[0];
                if (card) {
                    player.specialCards.push(card);
                }
                const actionIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
                if (actionIndex > -1) player.actionsThisTurn.splice(actionIndex, 1);
             }
        }
        player.hasExtraMove = false;
    }
    
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
        let isLastPlayer = false;
        
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);

            if (!gameDoc.exists()) return;

            const currentState = gameDoc.data() as GameState;
            
            if (currentState.players.length <= 1) {
                isLastPlayer = true;
                return; 
            }

            let newPlayers = currentState.players.filter((p: Player) => p.playerId !== localPlayer.playerId);
            const newLog = arrayUnion(`${localPlayer.name} has left the room.`);
            
            let newCurrentPlayerIndex = currentState.currentPlayerIndex;
            if (currentState.currentPlayerIndex >= newPlayers.length) {
                newCurrentPlayerIndex = 0;
            }
            
            transaction.update(gameDocRef, { 
                players: newPlayers, 
                log: newLog,
                currentPlayerIndex: newCurrentPlayerIndex,
            });
        });

        if (isLastPlayer) {
             await deleteDoc(gameDocRef);
             const staticDocRef = doc(db, 'games', gameId, 'static', 'map');
             await deleteDoc(staticDocRef);
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
      const staticDocRef = doc(db, 'games', gameId, 'static', 'map');
      await deleteDoc(gameDocRef);
      await deleteDoc(staticDocRef);
      onExit();
  } catch (error) {
    console.error("Error during host leave confirmation:", error);
  }
}
