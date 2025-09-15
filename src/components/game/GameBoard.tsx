'use client';
import { useState, useEffect } from 'react';
import type { GameState, GameAction, ResourceType, IslandResource, Monster, Army, FirestoreGameState, Player } from '@/lib/types';
import { initializeGame, unflattenMap, flattenMap } from '@/lib/game-logic';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Loader2, ArrowLeft, Play } from 'lucide-react';
import { CombatDialog } from './CombatDialog';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import { PositionDialog } from './PositionDialog';
import { CardsDialog } from './CardsDialog';
import { StealResourceDialog } from './StealResourceDialog';
import { UseCardDialog } from './UseCardDialog';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { usePlayer } from '@/hooks/use-player';

type GameBoardProps = {
  gameId: string;
  onExit: () => void;
};


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


export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { toast } = useToast();
  const [toastsToShow, setToastsToShow] = useState<{ title: string; description: string; variant?: "destructive" | "default" }[]>([]);
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(true);
  const { playerId, username } = usePlayer();

  useEffect(() => {
    if (!gameId) return;
    const gameDocRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameDocRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const firestoreState = docSnapshot.data() as FirestoreGameState;
        setGameState({
          ...firestoreState,
          map: unflattenMap(firestoreState.map, firestoreState.mapSize),
        });
      } else {
        console.warn(`Game document ${gameId} not found!`);
        onExit(); // Game doesn't exist, go back to lobby
      }
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive'});
    });

    return () => unsubscribe();
  }, [gameId, toast, onExit]);
  
  const updateGameState = async (state: GameState) => {
    const gameDocRef = doc(db, 'games', gameId);
    
    // This check is now handled by handleStartGame or when the lobby is full
    // if (state.turn > 0 && state.status === 'waiting') {
    //     state.status = 'playing';
    // }

    const sanitizedMap = state.map.map(row => row.map(tile => ({
        ...tile,
        positionedBy: tile.positionedBy || [],
        monsters: tile.monsters || [],
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
    if (!gameState || !playerId) return;
    
    const { players, currentPlayerIndex, status } = gameState;
    const currentPlayer = players[currentPlayerIndex];

    if (status === 'waiting') {
        toast({ title: "Game Not Started", description: "Waiting for more players or for the host to start the game.", variant: 'destructive' });
        return;
    }

    if (currentPlayer.playerId !== localPlayer?.playerId) {
        toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
        return;
    }
    
    if (action === 'end-turn') {
        handleEndTurn();
        return;
    }
    
    const { selectedArmyId } = gameState;
    const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;

    const newState = JSON.parse(JSON.stringify(gameState)); // Deep clone
    newState.currentAction = action;

    if (!selectedArmy && !['deploy', 'buy-card', 'upgrade', 'show-cards', 'end-turn'].includes(action)) {
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
        newState.showCardsDialogForPlayer = currentPlayer.id;
        updateGameState(newState);
    } else {
       updateGameState(newState);
    }
    
  };

  const handleStartGame = () => {
    if (!gameState || !isHost) return;

    const newState = JSON.parse(JSON.stringify(gameState));
    newState.status = 'playing';
    newState.turn = 1; // Start the first turn
    newState.log.push(`${localPlayer?.name} has started the game! It's now ${newState.players[0].name}'s turn.`);
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    updateGameState(newState);
  };
  
  const handleOpenUseCardDialog = (cardName: string) => {
    if (!gameState) return;
    const newState = JSON.parse(JSON.stringify(gameState));
    newState.useCardDialogState = { cardName };
    newState.showCardsDialogForPlayer = null; // Close card list to show confirmation
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
        updateGameState(newState);
        return;
    }

    const cardIndex = player.specialCards.indexOf(cardName);
    if (cardIndex === -1) {
        toast({ title: "Card Error", description: `You do not have the ${cardName} card.`, variant: 'destructive' });
        newState.useCardDialogState = null;
        updateGameState(newState);
        return;
    }
    
    player.actionsThisTurn.push('use-card');
    player.specialCards.splice(cardIndex, 1);

    if (cardName === 'Extra Move') {
        player.hasExtraMove = true;
        newState.log.push(`${player.name} used the 'Extra Move' card!`);
        toast({ title: 'Card Used!', description: 'You have an extra move this turn.' });
    } else if (cardName === 'Steal Resource') {
        newState.stealResourceDialogState = { targetPlayerId: null };
    }
    
    newState.useCardDialogState = null;
    newState.showCardsDialogForPlayer = null;
    updateGameState(newState);
  };

  const handleStealResource = (targetPlayerId: number, resource: ResourceType) => {
    if (!gameState) return;
    const newState = JSON.parse(JSON.stringify(gameState));
    const { players, currentPlayerIndex } = newState;
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players.find(p => p.id === targetPlayerId);

    if (!targetPlayer) return;
    
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

    currentPlayer.lastAction = 'use-card';
    newState.stealResourceDialogState = null;
    updateGameState(newState);
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
    if (player.lastAction === 'move') {
      toast({ title: 'Cannot Collect', description: 'You cannot collect resources after moving in the same turn.', variant: 'destructive'});
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
            state.currentAction = null;
            updateGameState(state);
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
    if (!gameState || !playerId) return;
    const { status } = gameState;
     if (status === 'waiting') return;

    const newState = JSON.parse(JSON.stringify(gameState));
    const { players, currentPlayerIndex, selectedArmyId, possibleMoves } = newState;
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.playerId !== localPlayer?.playerId) return;

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
    } else {
      // clear selection
      newState.selectedArmyId = null;
      newState.selectedTile = null;
      newState.possibleMoves = [];
      newState.currentAction = null;
      updateGameState(newState);
    }
  };

  const handlePositionAction = (state: GameState) => {
    const { selectedArmyId, players, currentPlayerIndex, map } = state;
    const player = players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army) return;

    if (player.lastAction === 'move') {
      toast({ title: 'Cannot Position', description: 'You cannot position an army after moving in the same turn.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
      return;
    }

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
    state.currentAction = null;
    updateGameState(state);
  };

  const handleMoveAction = (newState: GameState, x: number, y: number) => {
    const { currentPlayerIndex, map, selectedArmyId, specialCardsDeck } = newState;
    const player = newState.players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army) return;
    
    const currentPos = army.position;
    const oldTile = newState.map[currentPos.y][currentPos.x];
    
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== army.id);
    
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
        player.hasExtraMove = false;
        player.lastAction = null; // Allow another action
        const logMsg = `${player.name} used their extra move. They can perform another action.`;
        newState.log.push(logMsg);
        toast({ title: 'Extra Move Used', description: 'You can now perform another action.'});
    } else {
        player.lastAction = 'move';
    }
    
    newState.currentAction = null;
    newState.possibleMoves = [];
    newState.selectedTile = {x, y}; // Keep tile selected after move
    updateGameState(newState);
  }

  const handleAttackAction = (state: GameState) => {
    const { currentPlayerIndex, players, map, selectedArmyId } = state;
    const attacker = players[currentPlayerIndex];
    const army = attacker.armies.find(a => a.id === selectedArmyId);
    if (!army) return;

    if (attacker.lastAction === 'move') {
      toast({ title: 'Cannot Attack', description: 'You cannot attack after moving in the same turn.', variant: 'destructive'});
      state.currentAction = null;
      updateGameState(state);
      return;
    }

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
    
    if (winnerId === null) {
        newState.combatState = null;
        newState.currentAction = null;
        updateGameState(newState);
        return;
    }
    
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players.find(p => p.id === winnerId);
    const loser = players.find(p => p.id === loserId);

    if (!winner || !loser) {
        newState.combatState = null;
        newState.currentAction = null;
        updateGameState(newState);
        return;
    }
    
    const attackingArmy = players[attackerId].armies.find(a => a.id === selectedArmyId);
    if (!attackingArmy) {
      newState.combatState = null;
      newState.currentAction = null;
      updateGameState(newState);
      return;
    }

    const combatTile = map[attackingArmy.position.y][attackingArmy.position.x];
    const loserOccupantInfo = combatTile.occupants.find(o => o.playerId === loserId);
    
    if (loserOccupantInfo) {
        const losingArmy = loser.armies.find(a => a.id === loserOccupantInfo.armyId);
        
        if (losingArmy) {
            const baseTile = map.flat().find(t => t.type === 'base' && t.owner === loserId);
            if (baseTile) {
                const oldPos = losingArmy.position;
                
                combatTile.occupants = combatTile.occupants.filter(o => !(o.armyId === losingArmy.id && o.playerId === loserId));
                
                losingArmy.position = {x: baseTile.x, y: baseTile.y};
                map[baseTile.y][baseTile.x].occupants.push({playerId: loserId, armyId: losingArmy.id});
                
                const positionIndex = loser.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
                if (positionIndex > -1) {
                    const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                     if (map[oldPos.y][oldPos.x].positionedBy) {
                        map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x].positionedBy!.filter(p => !(p.playerId === loserId && p.resource === removedPosition.resource));
                    }
                }
            }
        }
    }


    const logMsg = `${winner.name} defeated ${loser.name}! ${loser.name}'s army was sent back to their base.`;
    newState.log.push(logMsg);
    toast({ title: 'Combat Over!', description: logMsg });
    
    newState.combatState = null;
    newState.currentAction = null;
    players[attackerId].lastAction = 'attack';
    updateGameState(newState);
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
    const attacker = players.find(p => p.id === monsterCombatState.attackerId);
    if (!attacker) return;
    
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
          
          map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(o => !(o.playerId === attacker.id && o.armyId === attackingArmy.id));
          
          attackingArmy.position = {x: baseTile.x, y: baseTile.y};
          map[baseTile.y][baseTile.x].occupants.push({playerId: attacker.id, armyId: attackingArmy.id});
          
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
    newState.currentAction = null;
    attacker.lastAction = 'attack';
    updateGameState(newState);
  }

  const handleEndTurn = () => {
    if (!gameState) return;
    const state = JSON.parse(JSON.stringify(gameState));
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

  if (!gameState || !playerId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">Joining game session...</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, map, log, currentAction, possibleMoves, selectedTile, combatState, monsterCombatState, positionDialogState, showCardsDialogForPlayer, selectedArmyId, stealResourceDialogState, useCardDialogState, status, maxPlayers } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const localPlayer = players.find(p => p.playerId === playerId);

  if (!localPlayer) {
      return (
         <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4 text-lg">You are not in this game. Returning to lobby...</p>
         </div>
      );
  }

  const isMyTurn = currentPlayer.id === localPlayer.id;
  const isHost = localPlayer.id === 0;

  const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const currentTileForMonster = selectedArmy ? map[selectedArmy.position.y][selectedArmy.position.x] : null;

  return (
    <div className="relative flex h-screen w-full flex-col gap-4 overflow-auto p-4">
       <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onExit}><ArrowLeft /></Button>
          <h1 className="text-2xl font-bold">Corner Conquest</h1>
        </div>
        {isHost && status === 'waiting' && players.length > 1 && players.length < maxPlayers && (
            <Button onClick={handleStartGame}><Play /> Start Game Now</Button>
        )}
      </div>
      
      <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
        <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
            <h2 className="text-lg font-semibold">Player Information</h2>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                    {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
                    <span className="sr-only">Toggle Player Info</span>
                </Button>
            </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {players.map(p => (
                 <PlayerInfo key={p.id} player={p} isCurrentPlayer={currentPlayerIndex === p.id} />
              ))}
              {Array.from({ length: gameState.maxPlayers - players.length}).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-muted-foreground">Waiting for player...</div>
              ))}
            </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <main className="flex flex-col items-center justify-start gap-4 overflow-hidden">
          <MapGrid map={map} players={players} onTileClick={handleTileClick} possibleMoves={possibleMoves} selectedTile={selectedTile} currentPlayerId={currentPlayer.id} selectedArmyId={selectedArmyId} />
           <div className='text-center'>
                {status === 'waiting' ? (
                     <p className='text-lg font-semibold text-accent'>Waiting for more players... ({players.length}/{maxPlayers})</p>
                ) : (
                    <>
                        <p className='text-lg font-semibold'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                        {currentAction && <p className='text-muted-foreground'>Current Action: {currentAction}</p>}
                        {selectedArmy && <p className='text-sm text-muted-foreground'>Selected Army: ID {selectedArmy.id} at ({selectedArmy.position.x}, {selectedArmy.position.y})</p>}
                    </>
                )}
           </div>
        </main>
        <aside className="flex flex-col justify-start gap-4">
          <ActionsPanel onAction={handleAction} gameState={gameState} isMyTurn={isMyTurn} />
          <GameLog logs={log} />
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
       {showCardsDialogForPlayer === localPlayer.id && (
        <CardsDialog 
          player={localPlayer}
          onClose={() => {
              const newState = JSON.parse(JSON.stringify(gameState));
              newState.showCardsDialogForPlayer = null;
              newState.currentAction = null;
              updateGameState(newState);
            }
          }
          onUseCard={handleOpenUseCardDialog}
        />
      )}
      {stealResourceDialogState && isMyTurn && (
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
      {useCardDialogState && isMyTurn && (
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
