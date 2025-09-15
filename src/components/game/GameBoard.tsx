'use client';
import { useState, useEffect } from 'react';
import type { GameState, GameAction, ResourceType, IslandResource, Monster, Army, FirestoreGameState } from '@/lib/types';
import { initializeGame, unflattenMap, flattenMap } from '@/lib/game-logic';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { CombatDialog } from './CombatDialog';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import { PositionDialog } from './PositionDialog';
import { CardsDialog } from './CardsDialog';
import { StealResourceDialog } from './StealResourceDialog';
import { UseCardDialog } from './UseCardDialog';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const GAME_ID = 'main-game'; // For now, we'll have one global game session

function generateMonsters(x: number, y: number, mapSize: number): Monster[] {
    const monsters: Monster[] = [];
    const center = { x: Math.floor(mapSize / 2), y: Math.floor(mapSize / 2) };
    const distance = Math.abs(x - center.x) + Math.abs(y - center.y);

    let possibleLevels: number[] = [];
    if (distance <= 1) { // Center
        possibleLevels = [3, 4];
    } else if (distance <= 3) { // Mid-ring
        possibleLevels = [1, 2, 3];
    } else { // Outer ring
        possibleLevels = [1, 2];
    }

    const hasBigMonster = possibleLevels.includes(3) || possibleLevels.includes(4) ? Math.random() < 0.3 : false;

    if (hasBigMonster) {
        const bigMonsterLevel = possibleLevels.includes(4) && Math.random() < 0.25 ? 4 : 3;
        monsters.push({
            id: 'big',
            type: bigMonsterLevel === 3 ? 'cub' : 'huge',
            level: bigMonsterLevel
        });

        const littleMonsterLevel = Math.random() < 0.6 ? 1 : 2;
         monsters.push({
            id: 'little',
            type: littleMonsterLevel === 1 ? 'cub' : 'huge',
            level: littleMonsterLevel
        });

    } else {
        const numMonsters = Math.random() < 0.7 ? 1 : 2;
        let availableLevels = possibleLevels.filter(l => l <= 2);
        if (availableLevels.length === 0) availableLevels = [1]; 

        if (numMonsters === 1) {
            const level = availableLevels[Math.floor(Math.random() * availableLevels.length)];
            monsters.push({
                id: 'little',
                type: level === 1 ? 'cub' : 'huge',
                level: level
            });
        } else {
             monsters.push({ id: 'little', type: 'cub', level: 1 });
             if (availableLevels.includes(2)) {
                 monsters.push({ id: 'little', type: 'huge', level: 2 });
             } else {
                 monsters.splice(1, 1);
             }
        }
    }

    const uniqueTypes = new Set<string>();
    return monsters.filter(monster => {
        const signature = `${monster.id}-${monster.type}-${monster.level}`;
        if (uniqueTypes.has(signature)) {
            return false;
        }
        uniqueTypes.add(signature);
        return true;
    });
}


export function GameBoard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { toast } = useToast();
  const [toastsToShow, setToastsToShow] = useState<{ title: string; description: string; variant?: "destructive" | "default" }[]>([]);

  useEffect(() => {
    const gameDocRef = doc(db, 'games', GAME_ID);

    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const firestoreState = docSnapshot.data() as FirestoreGameState;
            setGameState({
                ...firestoreState,
                map: unflattenMap(firestoreState.map, firestoreState.mapSize),
            });
        } else {
            console.log("No such document! Initializing new game.");
            const newGame = initializeGame();
            // We don't set local state here, we let the snapshot listener do it
            const newGameDocRef = doc(db, 'games', GAME_ID);
            const firestoreState: FirestoreGameState = {
                ...newGame,
                map: flattenMap(newGame.map),
                mapSize: newGame.map.length,
            };
            setDoc(newGameDocRef, firestoreState);
        }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  const updateGameState = async (state: GameState) => {
    const gameDocRef = doc(db, 'games', GAME_ID);
    
    // Sanitize state before sending to Firestore
    const sanitizedMap = state.map.map(row => row.map(tile => ({
        ...tile,
        positionedBy: tile.positionedBy || [], // Ensure positionedBy is an array
        monsters: tile.monsters || [], // Ensure monsters is an array
    })));

    const firestoreState: FirestoreGameState = {
        ...state,
        map: flattenMap(sanitizedMap),
        mapSize: state.map.length,
    };
    await setDoc(gameDocRef, firestoreState, { merge: true });
  };


  useEffect(() => {
    if (toastsToShow.length > 0) {
      toastsToShow.forEach(t => toast(t));
      setToastsToShow([]);
    }
  }, [toastsToShow, toast]);

  const handleAction = (action: GameAction) => {
    if (!gameState) return;
    const { players, selectedArmyId } = gameState;
    const currentPlayer = players[gameState.currentPlayerIndex];
    const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;

    const newState = JSON.parse(JSON.stringify(gameState)); // Deep clone
    newState.currentAction = action;

    if (!selectedArmy && !['deploy', 'buy-card', 'upgrade', 'show-cards'].includes(action)) {
        toast({ title: 'No Army Selected', description: 'You must select an army before performing this action.', variant: 'destructive'});
        newState.currentAction = null;
        updateGameState(newState);
        return;
    }
    
    if (action === 'position') {
      handlePositionAction(newState);
    } else if (action === 'collect') {
      handleCollectAction(newState);
    } else if (action === 'deploy') {
      handleDeployAction(newState);
    } else if (action === 'buy-card') {
      handleBuyCardAction(newState);
    } else if (action === 'upgrade') {
      handleUpgradeAction(newState);
    } else if (action === 'attack') {
      handleAttackAction(newState);
    } else if (action === 'show-cards') {
        newState.showCardsDialog = true;
        updateGameState(newState);
    }
    
  };
  
  const handleOpenUseCardDialog = (cardName: string) => {
    if (!gameState) return;
    const newState = JSON.parse(JSON.stringify(gameState));
    newState.useCardDialogState = { cardName };
    updateGameState(newState);
  };

  const handleUseCard = (cardName: string) => {
    if (!gameState) return;
    const newState = JSON.parse(JSON.stringify(gameState));
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    if (player.actionsThisTurn.includes('use-card')) {
        toast({ title: "Card Error", description: "You can only use one card per turn.", variant: 'destructive' });
        newState.useCardDialogState = null;
        newState.showCardsDialog = false;
        updateGameState(newState);
        return;
    }

    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) {
        toast({ title: "Card Error", description: `You do not have the ${cardName} card.`, variant: 'destructive' });
        return;
    }
    
    player.actionsThisTurn.push('use-card');

    if (cardName === 'Extra Move') {
        player.hasExtraMove = true;
        player.specialCards.splice(cardIndex, 1);
        newState.log.push(`${player.name} used the 'Extra Move' card!`);
        toast({ title: 'Card Used!', description: 'You have an extra move this turn.' });
    } else if (cardName === 'Steal Resource') {
        newState.stealResourceDialogState = { targetPlayerId: null };
    }
    
    newState.useCardDialogState = null;
    newState.showCardsDialog = false; // Close card dialog after use
    updateGameState(newState);
  };

  const handleStealResource = (targetPlayerId: number, resource: ResourceType) => {
    if (!gameState) return;
    const newState = JSON.parse(JSON.stringify(gameState));
    const { players, currentPlayerIndex } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === targetPlayerId);

    if (!targetPlayer) return;

    const cardIndex = currentPlayer.specialCards.indexOf('Steal Resource');
    if (cardIndex === -1) return; // Should not happen

    const amountToSteal = 2;
    const stolenAmount = Math.min(targetPlayer.resources[resource], amountToSteal);

    if (stolenAmount > 0) {
        targetPlayer.resources[resource] -= stolenAmount;
        currentPlayer.resources[resource] += stolenAmount;
        
        const logMsg = `${currentPlayer.name} used 'Steal Resource' on ${targetPlayer.name} and stole ${stolenAmount} ${resource}!`;
        newState.log.push(logMsg);
        toast({ title: "Resource Stolen!", description: logMsg});
    } else {
        const logMsg = `${currentPlayer.name} tried to steal ${resource} from ${targetPlayer.name}, but they had none.`;
        newState.log.push(logMsg);
        toast({ title: "Steal Failed", description: logMsg, variant: 'destructive' });
    }

    currentPlayer.specialCards.splice(cardIndex, 1);
    currentPlayer.lastAction = 'use-card';
    newState.stealResourceDialogState = null;
    endTurn(newState);
  };

  const handleUpgradeAction = (state: GameState) => {
    const { currentPlayerIndex, players } = state;
    const player = players[currentPlayerIndex];
    if (player.resources.iron >= 5 && !player.actionsThisTurn.includes('upgrade')) {
      player.resources.iron -= 5;
      player.attackPower += 1;
      player.actionsThisTurn.push('upgrade');
      const logMsg = `${player.name} upgraded their army! Attack Power is now ${player.attackPower}.`;
      state.log.push(logMsg);
      toast({ title: 'Army Upgraded!', description: logMsg });
      state.currentAction = null;
      updateGameState(state);
    } else {
      toast({ title: 'Cannot Upgrade', description: 'Not enough iron or you already upgraded this turn.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
    }
  };
  
  const handleDeployAction = (state: GameState) => {
    const { currentPlayerIndex, players, map } = state;
    const player = players[currentPlayerIndex];
    const baseTile = map.flat().find(t => t.type === 'base' && t.owner === player.id);

    if (!baseTile) {
      toast({ title: 'Cannot Deploy', description: 'Base not found!', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
      return;
    }

    if (player.resources.food >= player.nextArmyCost && player.armyCount < 5 && !player.actionsThisTurn.includes('deploy')) {
      player.resources.food -= player.nextArmyCost;
      player.armyCount += 1;
      const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
      const newArmy: Army = { id: newArmyId, position: {x: baseTile.x, y: baseTile.y} };
      player.armies.push(newArmy);
      map[baseTile.y][baseTile.x].occupants.push({playerId: player.id, armyId: newArmy.id});
      
      player.nextArmyCost += 1;
      player.actionsThisTurn.push('deploy');
      const logMsg = `${player.name} deployed a new army at their base! They now have ${player.armyCount} armies.`;
      state.log.push(logMsg);
      toast({ title: 'Army Deployed!', description: logMsg });
      state.currentAction = null;
      updateGameState(state);
    } else {
      toast({ title: 'Cannot Deploy', description: 'Not enough food, at max army size, or you already deployed this turn.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
    }
  }

  const handleBuyCardAction = (state: GameState) => {
    const { currentPlayerIndex, players, specialCardsDeck } = state;
    const player = players[currentPlayerIndex];

    if (player.specialCards.length >= 10) {
      toast({ title: 'Cannot Buy Card', description: 'You have reached the maximum of 10 cards.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
      return;
    }

    if (player.resources.gems >= 10 && specialCardsDeck.length > 0 && !player.actionsThisTurn.includes('buy-card')) {
      player.resources.gems -= 10;
      const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
      const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
      player.specialCards.push(drawnCard);
      player.actionsThisTurn.push('buy-card');
      const logMsg = `${player.name} bought a special card: ${drawnCard}!`;
      state.log.push(logMsg);
      toast({ title: 'Card Purchased!', description: logMsg });
      state.currentAction = null;
      updateGameState(state);
    } else {
      toast({ title: 'Cannot Buy Card', description: 'Not enough gems, no cards left, or you already bought a card this turn.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
    }
  }

  const handleCollectAction = (state: GameState) => {
    const { currentPlayerIndex, players, map, selectedArmyId } = state;
    const player = players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);
    
    if (!army) {
        toast({ title: 'Cannot Collect', description: 'No army selected.', variant: 'destructive'});
        state.currentAction = null;
        updateGameState(state);
        return;
    }
    
    const position = player.positions.find(p => p.x === army.position.x && p.y === army.position.y);

    if (position) {
        const tile = map[position.y][position.x];
        const resource = tile.resources.find(r => r.type === position.resource);
        if (resource) {
            player.resources[position.resource] += resource.amount;
            const logMsg = `${player.name} collected ${resource.amount} ${position.resource}.`;
            state.log.push(logMsg);
            toast({ title: 'Resource Collected!', description: logMsg });
            player.lastAction = 'collect';
            endTurn(state);
        } else {
             toast({ title: 'Cannot Collect', description: 'Resource not found on this island.', variant: 'destructive'});
             state.currentAction = null;
             updateGameState(state);
        }
    } else {
      toast({ title: 'Cannot Collect', description: 'You have no army positioned on this island.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
    }
  };

  const handleTileClick = (x: number, y: number) => {
    if (!gameState) return;
    const newState = JSON.parse(JSON.stringify(gameState));
    const { players, currentPlayerIndex, selectedArmyId, possibleMoves } = newState;
    const currentPlayer = players[currentPlayerIndex];

    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);
    const clickedTile = newState.map[y][x];
    const armyOnTile = clickedTile.occupants.find(o => o.playerId === currentPlayer.id);

    if (selectedArmyId !== null && isPossibleMove) {
      handleMoveAction(newState, x, y);
    } else if (armyOnTile) {
        newState.selectedArmyId = armyOnTile.armyId;
        newState.selectedTile = {x, y};
        newState.currentAction = 'move';
        
        let moves = [];
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            if (Math.abs(i) + Math.abs(j) <= 2 && (i !== 0 || j !== 0)) {
              const newX = x + i;
              const newY = y + j;
              if (newX >= 0 && newX < newState.map.length && newY >= 0 && newY < newState.map.length) {
                moves.push({ x: newX, y: newY });
              }
            }
          }
        }
        moves = moves.filter(move => {
          const tile = newState.map[move.y][move.x];
          if (tile.type === 'base' && tile.owner !== currentPlayer.id) {
            return false;
          }
          if (tile.type === 'empty') {
            return false;
          }
          return true;
        });
        newState.possibleMoves = moves;
        updateGameState(newState);
    }
  };

  const handlePositionAction = (state: GameState) => {
    const { selectedArmyId, players, currentPlayerIndex, map } = state;
    const player = players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army) return;

    const tile = map[army.position.y][army.position.x];

    if ((tile.type !== 'resource' && tile.type !== 'base') || tile.resources.length === 0) {
        toast({ title: 'Cannot Position', description: 'You can only position on an island with resources.', variant: 'destructive'});
        state.currentAction = null;
        updateGameState(state);
        return;
    }
    
    if (player.positions.some(p => p.x === army.position.x && p.y === army.position.y)) {
      toast({ title: 'Already Positioned', description: `You already have an army positioned at ${army.position.x},${army.position.y}.`, variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
      return;
    }
    
    const availableResources = tile.resources.filter(resource => {
      return !(tile.positionedBy || []).some(p => p.resource === resource.type);
    });

    if (availableResources.length === 0) {
      toast({ title: 'Cannot Position', description: 'All resources on this island are already occupied.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
      return;
    }
    
    state.positionDialogState = { x: army.position.x, y: army.position.y, resources: availableResources };
    updateGameState(state);
  }

  const handleSelectResourceForPosition = (state: GameState, resource: ResourceType) => {
    const { currentPlayerIndex, positionDialogState, selectedArmyId } = state;
    const player = state.players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army || !positionDialogState) {
        state.positionDialogState = null;
        state.currentAction = null;
        updateGameState(state);
        return;
    }
    
    const x = army.position.x;
    const y = army.position.y;
    const tile = state.map[y][x];

    player.positions.push({ x, y, resource });
    
    if (!tile.positionedBy) {
      tile.positionedBy = [];
    }
    tile.positionedBy.push({playerId: player.id, resource});

    player.lastAction = 'position';

    const logMsg = `${player.name} has positioned an army on ${resource} at ${x},${y}.`;
    state.log.push(logMsg);
    toast({ title: 'Army Positioned!', description: logMsg });
    
    state.positionDialogState = null;
    endTurn(state);
  };

  const handleMoveAction = (newState: GameState, x: number, y: number) => {
    const { currentPlayerIndex, map, selectedArmyId, specialCardsDeck } = newState;
    const player = newState.players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army) return;
    
    const currentPos = army.position;
    const oldTile = newState.map[currentPos.y][currentPos.x];
    
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== army.id);
    
    // Clear all player positions when they move
    newState.map.forEach(row => row.forEach(tile => {
        if(tile.positionedBy) {
            tile.positionedBy = tile.positionedBy.filter(p => p.playerId !== player.id);
        }
    }));
    player.positions = [];
    
    army.position = { x, y };
    newState.map[y][x].occupants.push({ playerId: player.id, armyId: army.id });
    
    
    const revealedIsland = newState.map[y][x];
    if(revealedIsland.isHidden) {
      revealedIsland.isHidden = false;
      player.victoryPoints += 1;
      const logMsg = `${player.name} discovered a new island and gets 1 VP!`;
      newState.log.push(logMsg);
      setToastsToShow(prev => [...prev, { title: 'Island Discovered!', description: logMsg }]);
      
      if (revealedIsland.type === 'special') {
          if (player.specialCards.length < 10) {
            const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
            const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
            player.specialCards.push(drawnCard);
            const cardLogMsg = `${player.name} found a special card: ${drawnCard}!`;
            newState.log.push(cardLogMsg);
            setToastsToShow(prev => [...prev, { title: 'Card Found!', description: cardLogMsg }]);
          } else {
            const cardLogMsg = `${player.name} found a special card, but their hand is full!`;
            newState.log.push(cardLogMsg);
            setToastsToShow(prev => [...prev, { title: 'Hand Full!', description: cardLogMsg, variant: 'destructive' }]);
          }
      }

      if(revealedIsland.type === 'monster') {
          const monsters = generateMonsters(x, y, newState.map.length);
          revealedIsland.monsters = monsters;
          
          const monsterLog = `${player.name} encountered monsters!`;
          newState.log.push(monsterLog);
          setToastsToShow(prev => [...prev, { title: 'Monster Encounter!', description: monsterLog, variant: 'destructive'}]);
      }
    }
    
    if (player.hasExtraMove) {
        player.hasExtraMove = false; // Consume the extra move
        player.lastAction = 'move'; // Set last action to prevent repeated moves
        const logMsg = `${player.name} used their extra move.`;
        newState.log.push(logMsg);
        toast({ title: 'Extra Move Used', description: 'You can now perform another action.'});
        
        // Reset action/moves but don't end turn
        newState.currentAction = null;
        newState.possibleMoves = [];
        newState.selectedTile = null;
        updateGameState(newState);
    } else {
        player.lastAction = 'move';
        endTurn(newState);
    }
  }

  const handleAttackAction = (state: GameState) => {
    const { currentPlayerIndex, players, map, selectedArmyId } = state;
    const attacker = players[currentPlayerIndex];
    const army = attacker.armies.find(a => a.id === selectedArmyId);
    if (!army) return;

    const currentTile = map[army.position.y][army.position.x];
    const otherPlayersOccupants = currentTile.occupants.filter(o => o.playerId !== attacker.id);

    if (otherPlayersOccupants.length > 0) {
      const defenderId = otherPlayersOccupants[0].playerId; 
      state.combatState = {
        attackerId: attacker.id,
        defenderId: defenderId,
        attackerRolls: [],
        defenderRolls: [],
        winnerId: null,
        phase: 'rolling',
      };
      state.currentAction = 'attack';
      updateGameState(state);
    } else if (currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0) {
      state.monsterCombatState = {
        attackerId: attacker.id,
        monster: currentTile.monsters[0], 
        attackerRolls: [],
        monsterRolls: [],
        winnerId: null,
        phase: 'rolling',
        useDecideDiceRollCard: false,
        decidedRollValue: 1,
      };
      state.currentAction = 'attack';
      updateGameState(state);
    } else {
      toast({ title: 'No one to attack', description: 'There are no other players or monsters on this island.', variant: 'destructive' });
      state.currentAction = null;
      updateGameState(state);
    }
  };

  const handleCombatRoll = () => {
    if (!gameState || !gameState.combatState) return;

    const newState = JSON.parse(JSON.stringify(gameState));
    const { combatState, players } = newState;
    const attacker = players[combatState.attackerId];
    const defender = players[combatState.defenderId];

    const rollDice = (armyCount: number, attackPower: number) => {
      const diceCount = Math.min(armyCount + attackPower, 4);
      return Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    };

    combatState.attackerRolls = rollDice(attacker.armyCount, attacker.attackPower);
    combatState.defenderRolls = rollDice(defender.armyCount, defender.attackPower);

    const attackerScore = combatState.attackerRolls.reduce((a, b) => a + b, 0);
    const defenderScore = combatState.defenderRolls.reduce((a, b) => a + b, 0);

    if (attackerScore > defenderScore) {
      combatState.winnerId = combatState.attackerId;
    } else {
      combatState.winnerId = combatState.defenderId;
    }
    
    combatState.phase = 'results';
    updateGameState(newState);
  };
  
  const handleCloseCombat = () => {
    if (!gameState || !gameState.combatState) return;
    
    const newState = JSON.parse(JSON.stringify(gameState));
    const { combatState, players, map, selectedArmyId } = newState;
    const { winnerId, attackerId, defenderId } = combatState;
    
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players[winnerId!];
    const loser = players[loserId];

    const attackingArmy = players[attackerId].armies.find(a => a.id === selectedArmyId);
    if (!attackingArmy) { 
        newState.combatState = null;
        endTurn(newState);
        return;
    }
    
    const combatTile = map[attackingArmy.position.y][attackingArmy.position.x];
    const loserOccupantInfo = combatTile.occupants.find(o => o.playerId === loserId);
    
    // Find the specific army that lost.
    const losingArmy = loser.armies.find(a => a.id === loserOccupantInfo?.armyId);
    
    if (losingArmy) {
        const baseTile = map.flat().find(t => t.type === 'base' && t.owner === loserId);
        if (baseTile) {
            const oldPos = losingArmy.position;
            
            // Remove loser from old tile
            map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(o => !(o.armyId === losingArmy.id && o.playerId === loserId));
            
            // Move loser to their base
            losingArmy.position = {x: baseTile.x, y: baseTile.y};
            map[baseTile.y][baseTile.x].occupants.push({playerId: loserId, armyId: losingArmy.id});
            
            // Remove any positions the loser had on that tile
            const positionIndex = loser.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
            if (positionIndex > -1) {
                const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                 if (map[oldPos.y][oldPos.x].positionedBy) {
                    map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x].positionedBy!.filter(p => !(p.playerId === loserId && p.resource === removedPosition.resource));
                }
            }
        }
    }

    const logMsg = `${winner.name} defeated ${loser.name}! ${loser.name}'s army was sent back to their base.`;
    newState.log.push(logMsg);
    toast({ title: 'Combat Over!', description: logMsg });
    
    newState.combatState = null;
    players[attackerId].lastAction = 'attack';
    endTurn(newState);
  }

  const handleMonsterCombatRoll = (monster: Monster, useCard: boolean, decidedValue: number) => {
    if (!gameState) return;

    const newState = JSON.parse(JSON.stringify(gameState));
    const { players } = newState;
    const attacker = players[newState.currentPlayerIndex];
    
    if (useCard) {
      const cardIndex = attacker.specialCards.indexOf('Decide Dice Roll');
      if (cardIndex > -1) {
        attacker.specialCards.splice(cardIndex, 1);
        const logMsg = `${attacker.name} used the 'Decide Dice Roll' card!`;
        newState.log.push(logMsg);
        toast({ title: 'Card Used!', description: logMsg });
      } else {
        useCard = false; 
        toast({ title: 'Card Error', description: "Decide Dice Roll card not found.", variant: 'destructive'});
      }
    }


    const rollDice = (count: number) => {
      const diceCount = Math.min(count, 4);
      return Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    };

    let attackerRolls = rollDice(attacker.armyCount + attacker.attackPower);
    if(useCard) {
        attackerRolls[0] = decidedValue; 
    }

    const monsterRolls = rollDice(monster.level);

    const attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
    const monsterScore = monsterRolls.reduce((a, b) => a + b, 0);

    let winnerId = null;
    if (attackerScore >= monsterScore) { 
      winnerId = attacker.id;
    }

    newState.monsterCombatState = {
      attackerId: attacker.id,
      monster,
      attackerRolls,
      monsterRolls,
      winnerId,
      phase: 'results',
      useDecideDiceRollCard: useCard,
      decidedRollValue: decidedValue,
    };
    updateGameState(newState);
  };
  
  const handleCloseMonsterCombat = () => {
    if (!gameState || !gameState.monsterCombatState || gameState.selectedArmyId === null) return;
    
    const newState = JSON.parse(JSON.stringify(gameState));
    const { monsterCombatState, players, map, selectedArmyId } = newState;
    const attacker = players[monsterCombatState.attackerId];
    // This is the fix: identify the specific army in combat
    const attackingArmy = attacker.armies.find(a => a.id === selectedArmyId);
    if (!attackingArmy) return;

    const currentTile = map[attackingArmy.position.y][attackingArmy.position.x];
    
    if (monsterCombatState.winnerId === attacker.id) {
      const monsterLevel = monsterCombatState.monster.level;
      let monsterVP = 0;
      switch (monsterLevel) {
        case 1: monsterVP = 2; break;
        case 2: monsterVP = 5; break;
        case 3: monsterVP = 7; break;
        case 4: monsterVP = 10; break;
      }

      attacker.victoryPoints += monsterVP;
      currentTile.monsters = (currentTile.monsters || []).filter(m => !(m.id === monsterCombatState.monster.id && m.level === monsterCombatState.monster.level));
      
      const logMsg = `${attacker.name} defeated the level ${monsterCombatState.monster.level} monster and earned ${monsterVP} VP!`;
      newState.log.push(logMsg);
      toast({ title: 'Victory!', description: logMsg });

      if (currentTile.monsters?.length === 0) {
        currentTile.type = 'resource';
      }

    } else { // Player lost
      const baseTile = map.flat().find(t => t.type === 'base' && t.owner === attacker.id);
      if (baseTile && attackingArmy) {
          const oldPos = attackingArmy.position;
          
          // Remove from old tile
          map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(o => !(o.playerId === attacker.id && o.armyId === attackingArmy.id));
          
          // Move to base
          attackingArmy.position = {x: baseTile.x, y: baseTile.y};
          map[baseTile.y][baseTile.x].occupants.push({playerId: attacker.id, armyId: attackingArmy.id});
          
          // Remove any positions
          const positionIndex = attacker.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
          if (positionIndex > -1) {
            const removedPosition = attacker.positions.splice(positionIndex, 1)[0];
            if (map[oldPos.y][oldPos.x].positionedBy) {
                map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x].positionedBy!.filter(p => !(p.playerId === attacker.id && p.resource === removedPosition.resource));
            }
          }
      }

      const logMsg = `${attacker.name} was defeated by the monster and their army sent back to base!`;
      newState.log.push(logMsg);
      toast({ title: 'Defeated!', description: logMsg, variant: 'destructive' });
    }
    
    newState.monsterCombatState = null;
    attacker.lastAction = 'attack';
    endTurn(newState);
  }

  const endTurn = (state: GameState) => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.hasExtraMove) {
        // This case is handled inside handleMoveAction, this is a safeguard
        updateGameState(state);
        return;
    }

    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }

    const nextPlayer = state.players[state.currentPlayerIndex];
    nextPlayer.lastAction = null;
    nextPlayer.actionsThisTurn = [];
    
    state.log.push(`It's now ${nextPlayer.name}'s turn.`);
    state.currentAction = null;
    state.possibleMoves = [];
    state.selectedTile = null;
    
    if (nextPlayer.armies.length === 1) {
        state.selectedArmyId = nextPlayer.armies[0].id;
    } else {
        state.selectedArmyId = null;
    }

    updateGameState(state);
  }

  const handleEndTurn = () => {
    if (!gameState) return;
    endTurn(JSON.parse(JSON.stringify(gameState)));
  }

  if (!gameState) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">Connecting to game session...</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, map, log, currentAction, possibleMoves, selectedTile, combatState, monsterCombatState, positionDialogState, showCardsDialog, selectedArmyId, stealResourceDialogState, useCardDialogState } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const currentTileForMonster = selectedArmy ? map[selectedArmy.position.y][selectedArmy.position.x] : null;

  return (
    <div className="flex h-screen w-screen flex-col gap-4 p-4">
      <div className="flex-[1]">
        <div className="grid grid-cols-2 grid-rows-2 gap-4">
          <PlayerInfo player={players[0]} isCurrentPlayer={currentPlayerIndex === 0} />
          <PlayerInfo player={players[1]} isCurrentPlayer={currentPlayerIndex === 1} />
          <PlayerInfo player={players[2]} isCurrentPlayer={currentPlayerIndex === 2} />
          <PlayerInfo player={players[3]} isCurrentPlayer={currentPlayerIndex === 3} />
        </div>
      </div>
      <div className="grid flex-[4] grid-cols-[1fr_280px] gap-4">
        <main className="flex flex-col items-center justify-start gap-4">
          <MapGrid map={map} players={players} onTileClick={handleTileClick} possibleMoves={possibleMoves} selectedTile={selectedTile} currentPlayerIndex={currentPlayerIndex} selectedArmyId={selectedArmyId} />
          <div className='text-center'>
              <p className='text-lg font-semibold'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
              {currentAction && <p className='text-muted-foreground'>Current Action: {currentAction}</p>}
              {selectedArmy && <p className='text-sm text-muted-foreground'>Selected Army: ID {selectedArmy.id} at ({selectedArmy.position.x}, {selectedArmy.position.y})</p>}
          </div>
        </main>
        <aside className="flex flex-col justify-start gap-4">
          <ActionsPanel onAction={handleAction} gameState={gameState} />
          <GameLog logs={log} />
          <Button onClick={handleEndTurn}>End Turn</Button>
        </aside>
      </div>
      {combatState && <CombatDialog gameState={gameState} onRoll={handleCombatRoll} onClose={handleCloseCombat} />}
      {monsterCombatState && currentTileForMonster?.monsters && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={currentTileForMonster.monsters}
          onRoll={handleMonsterCombatRoll} 
          onClose={handleCloseMonsterCombat}
          onCancel={() => {
              const newState = JSON.parse(JSON.stringify(gameState));
              newState.monsterCombatState = null;
              newState.currentAction = null;
              updateGameState(newState);
            }
          }
        />
      )}
      {positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => {
            const newState = JSON.parse(JSON.stringify(gameState));
            handleSelectResourceForPosition(newState, resource)
          }}
          onClose={() => {
              const newState = JSON.parse(JSON.stringify(gameState));
              newState.positionDialogState = null;
              newState.currentAction = null;
              updateGameState(newState);
            }
          }
        />
      )}
       {showCardsDialog && (
        <CardsDialog 
          player={currentPlayer}
          onClose={() => {
              const newState = JSON.parse(JSON.stringify(gameState));
              newState.showCardsDialog = false;
              newState.currentAction = null;
              updateGameState(newState);
            }
          }
          onUseCard={handleOpenUseCardDialog}
        />
      )}
      {stealResourceDialogState && (
        <StealResourceDialog
            players={players.filter(p => p.id !== currentPlayerIndex)}
            onSteal={handleStealResource}
            onClose={() => {
                const newState = JSON.parse(JSON.stringify(gameState));
                newState.stealResourceDialogState = null;
                updateGameState(newState);
            }}
        />
      )}
      {useCardDialogState && (
        <UseCardDialog
            cardName={useCardDialogState.cardName}
            onConfirm={() => handleUseCard(useCardDialogState.cardName)}
            onClose={() => {
                const newState = JSON.parse(JSON.stringify(gameState));
                newState.useCardDialogState = null;
                updateGameState(newState);
            }}
        />
      )}
    </div>
  );
}

    