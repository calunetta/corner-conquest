
import type { GameState, Player, Army, CardName, ActionHandlerResult, IslandResource, ResourceType } from '@/lib/types';
import { db, doc, deleteDoc, writeBatch, getDoc, arrayUnion, runTransaction } from '@/lib/firebase';
import { GameAction, AbilityName, IslandType, MAP_COLS, CardName as CardNameEnum, GameStatus } from '../types';

export function handleCancelAction(state: GameState, payload?: { cardName?: CardName }): GameState {
  const player = state.players[state.currentPlayerIndex];
  
  // If a specific card action was being cancelled (like Teleport or Scout)
  if (payload?.cardName) {
      const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
      if (cardUseIndex > -1) {
          player.actionsThisTurn.splice(cardUseIndex, 1);
      }
      
      const discardIndex = state.discardPile.indexOf(payload.cardName);
      if (discardIndex > -1) {
        const card = state.discardPile.splice(discardIndex, 1)[0];
        player.specialCards.push(card);
      } else if (payload.cardName === CardNameEnum.ExtraMove) {
          // Extra Move is a special case as it's consumed on activation.
          player.hasExtraMove = false;
          // It's assumed it's in the discard pile.
          const extraMoveIndex = state.discardPile.indexOf(CardNameEnum.ExtraMove);
          if (extraMoveIndex > -1) {
             const card = state.discardPile.splice(extraMoveIndex, 1)[0];
             player.specialCards.push(card);
          }
      }

      state.log.push(`${player.name} cancelled their action with ${payload.cardName}.`);
  }

  // Reset all temporary flags regardless
  player.reinforceActive = false;
  player.efficientActive = false;
  player.masterBuilderActive = false;
  
  return state;
}

export function handleDeployAction(state: GameState): GameState {
    const { players, currentPlayerIndex, map, discardPile, settings, baseTiles } = state;
    const player = players[currentPlayerIndex];
    
    if (player.actionsThisTurn.includes(GameAction.Deploy)) throw new Error("You can only deploy one army per turn.");
    
    let cost = player.nextArmyCost;
    let isReinforceUsed = false;
    let isEfficientUsed = false;
    
    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

    if (player.reinforceActive && canUseCard) {
        cost = 0;
        isReinforceUsed = true;
    } else if (player.efficientActive && canUseCard) {
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
      state.log.push(`${player.name} used 'Efficient' to deploy!`);
      player.efficientActive = false;
      const cardIndex = player.specialCards.indexOf(CardNameEnum.Efficient);
      if (cardIndex > -1) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    if (isReinforceUsed) {
      state.log.push(`${player.name} used 'Reinforce' to deploy for free!`);
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
    state.log.push(`${player.name} deployed a new army!`);
    
    return state;
}

export function handleUpgradeAction(state: GameState): GameState {
    const { players, currentPlayerIndex, discardPile, settings } = state;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes(GameAction.Upgrade)) throw new Error("You can only upgrade once per turn.");
    if (player.attackPower >= 4) throw new Error("You have reached the maximum attack power.");
    
    const canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard);

    let cost = settings.upgradeCost;
    if (player.masterBuilderActive && canUseCard) {
        cost = Math.ceil(cost / 2);
    }
    if (player.resources.iron < cost) throw new Error(`Not enough iron. Cost: ${cost}`);
    
    player.resources.iron -= cost;
    player.attackPower += 1;

    if (player.masterBuilderActive && canUseCard) {
      state.log.push(`${player.name} used 'Master Builder' for a cheaper upgrade!`);
      player.masterBuilderActive = false;
      const cardIndex = player.specialCards.indexOf(CardNameEnum.MasterBuilder);
      if (cardIndex > -1) {
          player.actionsThisTurn.push(GameAction.UseCard);
          const usedCard = player.specialCards.splice(cardIndex, 1)[0];
          discardPile.push(usedCard);
      }
    }

    player.actionsThisTurn.push(GameAction.Upgrade);
    state.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower + 1}.`);
    
    return state;
}

function applyAutomaticCollection(state: GameState, player: Player): GameState {
    const collectedResources: Record<string, number> = {};
    
    player.positions.forEach(pos => {
        const tile = state.map[pos.y * MAP_COLS + pos.x];
        const resourceSpot = tile.resources.find(r => r.type === pos.resource);
        if (resourceSpot) {
            player.resources[resourceSpot.type as ResourceType] += resourceSpot.amount;
            collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + resourceSpot.amount;
        }
    });

    const collectedStrings = Object.entries(collectedResources).map(([type, amount]) => `${amount} ${type}`);
    if (collectedStrings.length > 0) {
        state.log.push(`${player.name} automatically collected ${collectedStrings.join(', ')}.`);
    }

    player.positions.forEach(pos => {
        const tile = state.map[pos.y * MAP_COLS + pos.x];
        if (tile && tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === pos.resource));
        }
    });
    player.positions = [];

    return state;
}

export function handleEndTurn(state: GameState): GameState {
    
    if (state.currentPlayerIndex >= state.players.length) {
        state.currentPlayerIndex = 0;
    }
    
    let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.currentPlayerIndex = nextPlayerIndex;
    let nextPlayer = state.players[nextPlayerIndex];

    nextPlayer.armies.forEach((army: Army) => army.hasActed = false);
    nextPlayer.actionsThisTurn = [];
    nextPlayer.hasExtraMove = false;
    nextPlayer.efficientActive = false;
    nextPlayer.masterBuilderActive = false;
    nextPlayer.reinforceActive = false;
    
    if (nextPlayer.isSabotaged) {
        nextPlayer.isSabotaged = false; 
        state.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        return handleEndTurn(state);
    }
    
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }
    
    if (nextPlayer.passiveAbilities.explorer) {
        const occupiedIslands = new Set<string>();
        nextPlayer.armies.forEach((army: Army) => {
            const tile = state.map[army.position.y * MAP_COLS + army.position.x];
            occupiedIslands.add(tile.id);
        });
        const vpGained = occupiedIslands.size;
        if (vpGained > 0) {
            nextPlayer.victoryPoints += vpGained;
            state.log.push(`${nextPlayer.name}'s Explorer ability generated ${vpGained} VP.`);
        }
    }

    if (nextPlayer.passiveAbilities.collector) {
        let resourcesCollected: Partial<Record<string, number>> = {};
        const occupiedIslands = new Set<string>();
        
        nextPlayer.armies.forEach((army: Army) => {
            const tile = state.map[army.position.y * MAP_COLS + army.position.x];
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
            state.log.push(`${nextPlayer.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`);
        }
    }
    
    const hasProductiveCard = nextPlayer.specialCards.includes(CardNameEnum.Productive);
    const positionedArmies = nextPlayer.positions;

    if (positionedArmies.length > 0) {
        if (!hasProductiveCard) {
            state = applyAutomaticCollection(state, nextPlayer);
        } else {
            const productiveOptions = nextPlayer.positions.map(pos => {
                const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
                const resource = tile.resources.find(r => r.type === pos.resource);
                return { resource: pos.resource, amount: resource?.amount || 0 };
            }).filter(opt => opt.amount > 0);
            
            if (!nextPlayer.dialogState) nextPlayer.dialogState = {};
            nextPlayer.dialogState.productiveCard = { isOpen: true, options: productiveOptions };
        }
    }
    
    state.log.push(`It's now ${nextPlayer.name}'s turn.`);
    
    state.combatState = null;
    state.monsterCombatState = null;

    return state;
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

            if (isHost && currentState.players.length <= 1) {
                transaction.delete(gameDocRef);
                return;
            }

            const isCurrentPlayerExiting = currentState.currentPlayerIndex === playerIndex;

            currentState.log.push(`${currentState.players[playerIndex].name} has left the game.`);
            
            currentState.map.forEach(tile => {
                tile.occupants = tile.occupants.filter(o => o.playerId !== playerIndex);
                tile.positionedBy = (tile.positionedBy || []).filter(p => p.playerId !== playerIndex);
            });

            currentState.players.splice(playerIndex, 1);
            
            if (isHost) {
                currentState.log.push(`${currentState.players[0].name} is the new host.`);
            }

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
                if(currentState.combatState.attackerId === playerIndex || currentState.combatState.defenderId === playerIndex) {
                    currentState.combatState = null;
                } else {
                    if (currentState.combatState.attackerId > playerIndex) currentState.combatState.attackerId--;
                    if (currentState.combatState.defenderId > playerIndex) currentState.combatState.defenderId--;
                }
            }

            if (currentState.currentPlayerIndex > playerIndex) {
                 currentState.currentPlayerIndex--;
            } else if (isCurrentPlayerExiting) {
                currentState.currentPlayerIndex = playerIndex % currentState.players.length;
                currentState = handleEndTurn(currentState);
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
