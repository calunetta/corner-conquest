
import type { GameState, Player, Army, CardName, ActionHandlerResult, IslandResource, ResourceType } from '@/lib/types';
import { db, doc, runTransaction } from '@/lib/firebase';
import { GameAction, AbilityName, IslandType, CardName as CardNameEnum, GameStatus } from '../types';

export function handleCancelAction(state: GameState, payload?: any): GameState {
  const player = state.players[state.currentPlayerIndex];
  
  if (payload?.cardName) {
      const cardName = payload.cardName;
      const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
      if (cardUseIndex > -1) {
          player.actionsThisTurn.splice(cardUseIndex, 1);
      }
      
      const discardIndex = state.discardPile.indexOf(cardName);
      if (discardIndex > -1) {
          const card = state.discardPile.splice(discardIndex, 1)[0];
          player.specialCards.push(card);
      }
      
      if (cardName === CardNameEnum.ExtraMove) player.hasExtraMove = false;
      if (cardName === CardNameEnum.Reinforce) player.reinforceActive = false;
      if (cardName === CardNameEnum.Efficient) player.efficientActive = false;
      if (cardName === CardNameEnum.MasterBuilder) player.masterBuilderActive = false;

      if (payload.scoutedTiles && Array.isArray(payload.scoutedTiles)) {
          player.revealedTiles = player.revealedTiles.filter(t => !payload.scoutedTiles.includes(t));
      }

      state.log.push(`${player.name} cancelled their action with ${cardName}.`);
  }
  
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

    if (player.resources.food < cost) throw new Error(`Not enough food. Cost: ${cost}`);
    if (player.armies.length >= 5) throw new Error("You have reached the maximum army size.");

    player.resources.food -= cost;
    player.armyCount = player.armies.length + 1;
    const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
    const newArmy: Army = { id: newArmyId, position: { x: 0, y: 0 }, hasActed: true }; 
    
    const baseTileInfo = baseTiles.find(b => b.owner === player.id);
    if (!baseTileInfo) throw new Error("Base not found!");
    newArmy.position = { x: baseTileInfo.x, y: baseTileInfo.y };

    player.armies.push(newArmy);
    map[baseTileInfo.y * settings.gridSize.cols + baseTileInfo.x].occupants.push({ playerId: player.id, armyId: newArmy.id });
    
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
    if (player.resources.wood < cost) throw new Error(`Not enough wood. Cost: ${cost}`);
    
    player.resources.wood -= cost;
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
    state.log.push(`${player.name} upgraded their army's attack power to ${player.attackPower}.`);
    
    return state;
}

function applyAutomaticCollection(state: GameState, player: Player): GameState {
    const collectedResources: Record<string, number> = {};
    
    player.positions.forEach(pos => {
        const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
        const resourceSpot = tile?.resources.find(r => r.type === pos.resource);
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
        const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
        if (tile && tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => !(p.playerId === player.id && p.resource === pos.resource));
        }
    });
    player.positions = [];

    return state;
}

export function handleEndTurn(state: GameState): GameState {
    if (state.players.length === 0) return state;

    if (state.currentPlayerIndex >= state.players.length) {
        state.currentPlayerIndex = 0;
    }
    
    let attempts = 0;
    let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.currentPlayerIndex = nextPlayerIndex;
    let nextPlayer = state.players[nextPlayerIndex];

    while (nextPlayer.isSabotaged && attempts < state.players.length) {
        nextPlayer.isSabotaged = false;
        state.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
        nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        state.currentPlayerIndex = nextPlayerIndex;
        nextPlayer = state.players[nextPlayerIndex];
        attempts++;
        if (state.currentPlayerIndex === 0) {
            state.turn += 1;
        }
    }

    nextPlayer.armies.forEach((army: Army) => army.hasActed = false);
    nextPlayer.actionsThisTurn = [];
    nextPlayer.hasExtraMove = false;
    nextPlayer.efficientActive = false;
    nextPlayer.masterBuilderActive = false;
    nextPlayer.reinforceActive = false;
    
    if (state.currentPlayerIndex === 0 && attempts === 0) {
      state.turn += 1;
    }
    
    if (nextPlayer.passiveAbilities.explorer) {
        const occupiedIslands = new Set<string>();
        nextPlayer.armies.forEach((army: Army) => {
            const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
            if (tile && tile.type !== IslandType.Base) {
                occupiedIslands.add(tile.id);
            }
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
            const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
            if (!tile || occupiedIslands.has(tile.id)) return;
            
            if (tile.type === 'resource' && Array.isArray(tile.resources) && tile.resources.length > 0) {
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
    
    const positionedArmies = nextPlayer.positions;

    if (positionedArmies.length > 0) {
        if (nextPlayer.specialCards.includes(CardNameEnum.Productive)) {
            state.productiveDialogState = { playerId: nextPlayer.id };
        } else {
            state = applyAutomaticCollection(state, nextPlayer);
        }
    }

    if (nextPlayer.victoryPoints >= state.settings.victoryPointGoal && !state.winner) {
        state.winner = nextPlayer;
        state.status = GameStatus.Finished;
        state.log.push(`🎉 ${nextPlayer.name} has reached ${nextPlayer.victoryPoints} Victory Points and won the game!`);
    }
    
    state.log.push(`It's now ${nextPlayer.name}'s turn.`);
    
    state.combatState = null;
    state.monsterCombatState = null;
    if (state.deathAnimations && state.deathAnimations.length > 0) {
        const now = Date.now();
        state.deathAnimations = state.deathAnimations.filter(anim => anim.createdAt && (now - anim.createdAt) < 2000);
    }

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
            const remainingRealPlayers = currentState.players.filter(p => !p.isBot && p.playerId !== playerId);

            if ((isHost && currentState.status === 'playing') || remainingRealPlayers.length === 0 || (isHost && currentState.players.length <= 1)) {
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
            
            // Re-assign player IDs to be contiguous (0, 1, 2...)
            currentState.players.forEach((p, i) => p.id = i);
            
            // Update baseTiles ownership
            currentState.baseTiles = currentState.baseTiles
                .filter(b => b.owner !== playerIndex)
                .map(b => ({
                    ...b,
                    owner: b.owner > playerIndex ? b.owner - 1 : b.owner,
                }));

            // Update references in map occupants and positionedBy
            currentState.map.forEach(tile => {
                tile.occupants.forEach(o => {
                    if (o.playerId > playerIndex) o.playerId--;
                });
                (tile.positionedBy || []).forEach(p => {
                    if (p.playerId > playerIndex) p.playerId--;
                });
            });
            
            // Update references in combat state
            if (currentState.combatState) {
                if (currentState.combatState.attackerId === playerIndex || currentState.combatState.defenderId === playerIndex) {
                    currentState.combatState = null;
                } else {
                    if (currentState.combatState.attackerId > playerIndex) currentState.combatState.attackerId--;
                    if (currentState.combatState.defenderId > playerIndex) currentState.combatState.defenderId--;
                }
            }

            // Adjust currentPlayerIndex
            if (isCurrentPlayerExiting) {
                 currentState.currentPlayerIndex = playerIndex % currentState.players.length;
                 currentState = handleEndTurn(currentState);
            } else if (currentState.currentPlayerIndex > playerIndex) {
                 currentState.currentPlayerIndex--;
            }
            
            if (currentState.currentPlayerIndex >= currentState.players.length) {
                currentState.currentPlayerIndex = 0;
            }

            transaction.set(gameDocRef, currentState);
        });
        
    } catch (error) {
        console.error("Error leaving game:", error);
    }
}
