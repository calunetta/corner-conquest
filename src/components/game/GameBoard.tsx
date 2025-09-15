'use client';
import { useState, useEffect } from 'react';
import type { GameState, GameAction, ResourceType, IslandResource, Monster, Army } from '@/lib/types';
import { initializeGame } from '@/lib/game-logic';
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


function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function generateMonsters(): Monster[] {
    const monsters: Monster[] = [];
    const hasBigMonster = Math.random() < 0.2; // 20% chance for a big monster scenario

    if (hasBigMonster) {
        // Add one big monster and one small monster, ensuring they are different
        const bigMonsterRand = Math.random();
        const bigMonsterType = bigMonsterRand < 0.75 ? 'cub' : 'huge'; // 3:1 cub vs huge for big
        monsters.push({
            id: 'big',
            type: bigMonsterType,
            level: bigMonsterType === 'cub' ? 3 : 4
        });

        const littleMonsterRand = Math.random();
        const littleMonsterType = littleMonsterRand < 0.625 ? 'cub' : 'huge'; // 5:3 cub vs huge for little
        monsters.push({
            id: 'little',
            type: littleMonsterType,
            level: littleMonsterType === 'cub' ? 1 : 2
        });

    } else {
        // One or two little monsters
        const numMonsters = Math.random() < 0.7 ? 1 : 2; // 70% for 1 monster, 30% for 2

        if (numMonsters === 1) {
            const littleMonsterRand = Math.random();
            const littleMonsterType = littleMonsterRand < 0.625 ? 'cub' : 'huge';
            monsters.push({
                id: 'little',
                type: littleMonsterType,
                level: littleMonsterType === 'cub' ? 1 : 2
            });
        } else {
            // Two different little monsters
            monsters.push({
                id: 'little',
                type: 'cub',
                level: 1
            });
            monsters.push({
                id: 'little',
                type: 'huge',
                level: 2
            });
        }
    }

    return monsters;
}


export function GameBoard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { toast } = useToast();
  const [toastsToShow, setToastsToShow] = useState<{ title: string; description: string; variant?: "destructive" | "default" }[]>([]);

  useEffect(() => {
    const newGame = initializeGame();
    setGameState(newGame);
  }, []);

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

    const newState = deepClone(gameState);
    newState.currentAction = action;

    if (!selectedArmy && action !== 'deploy' && action !== 'buy-card' && action !== 'upgrade') {
        toast({ title: 'No Army Selected', description: 'You must select an army before performing this action.', variant: 'destructive'});
        newState.currentAction = null;
        setGameState(newState);
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
    }
    
    setGameState(newState);
  };

  const handleUpgradeAction = (state: GameState) => {
    const { currentPlayerIndex, players } = state;
    const player = players[currentPlayerIndex];
    if (player.resources.iron >= 5) {
      player.resources.iron -= 5;
      player.attackPower += 1;
      player.lastAction = 'upgrade';
      const logMsg = `${player.name} upgraded their army! Attack Power is now ${player.attackPower}.`;
      state.log.push(logMsg);
      toast({ title: 'Army Upgraded!', description: logMsg });
      endTurn(state);
    } else {
      toast({ title: 'Cannot Upgrade', description: 'Not enough iron.', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
    }
  };
  
  const handleDeployAction = (state: GameState) => {
    const { currentPlayerIndex, players, map } = state;
    const player = players[currentPlayerIndex];
    const baseTile = map.flat().find(t => t.type === 'base' && t.owner === player.id);

    if (!baseTile) {
      toast({ title: 'Cannot Deploy', description: 'Base not found!', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
      return;
    }

    if (player.resources.food >= player.nextArmyCost && player.armyCount < 5) {
      player.resources.food -= player.nextArmyCost;
      player.armyCount += 1;
      const newArmyId = player.armies.length > 0 ? Math.max(...player.armies.map(a => a.id)) + 1 : 0;
      const newArmy: Army = { id: newArmyId, position: {x: baseTile.x, y: baseTile.y} };
      player.armies.push(newArmy);
      map[baseTile.y][baseTile.x].occupants.push({playerId: player.id, armyId: newArmy.id});
      
      player.nextArmyCost += 1;
      player.lastAction = 'deploy';
      const logMsg = `${player.name} deployed a new army at their base! They now have ${player.armyCount} armies.`;
      state.log.push(logMsg);
      toast({ title: 'Army Deployed!', description: logMsg });
      endTurn(state);
    } else {
      toast({ title: 'Cannot Deploy', description: 'Not enough food or at max army size.', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
    }
  }

  const handleBuyCardAction = (state: GameState) => {
    const { currentPlayerIndex, players, specialCardsDeck } = state;
    const player = players[currentPlayerIndex];
    if (player.resources.gems >= 10 && specialCardsDeck.length > 0) {
      player.resources.gems -= 10;
      const cardIndex = Math.floor(Math.random() * specialCardsDeck.length);
      const drawnCard = specialCardsDeck.splice(cardIndex, 1)[0];
      player.specialCards.push(drawnCard);
      player.lastAction = 'buy-card';
      const logMsg = `${player.name} bought a special card: ${drawnCard}!`;
      state.log.push(logMsg);
      toast({ title: 'Card Purchased!', description: logMsg });
      endTurn(state);
    } else {
      toast({ title: 'Cannot Buy Card', description: 'Not enough gems or no cards left in the deck.', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
    }
  }

  const handleCollectAction = (state: GameState) => {
    const { currentPlayerIndex, players, map, selectedArmyId } = state;
    const player = players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);
    
    if (!army) {
        toast({ title: 'Cannot Collect', description: 'No army selected.', variant: 'destructive'});
        state.currentAction = null;
        setGameState(state);
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
             setGameState(state);
        }
    } else {
      toast({ title: 'Cannot Collect', description: 'You have no army positioned on this island.', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
    }
  };

  const handleTileClick = (x: number, y: number) => {
    if (!gameState) return;
    const newState = deepClone(gameState);
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
        // Filter out moves to other players' bases or empty tiles
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
        setGameState(newState);
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
        setGameState(state);
        return;
    }
    
    if (player.positions.some(p => p.x === army.position.x && p.y === army.position.y)) {
      toast({ title: 'Already Positioned', description: `You already have an army positioned at ${army.position.x},${army.position.y}.`, variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
      return;
    }
    
    // Filter out resources already occupied by other players
    const availableResources = tile.resources.filter(resource => {
      return !tile.positionedBy?.some(p => p.resource === resource.type);
    });

    if (availableResources.length === 0) {
      toast({ title: 'Cannot Position', description: 'All resources on this island are already occupied.', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
      return;
    }
    
    state.positionDialogState = { x: army.position.x, y: army.position.y, resources: availableResources };
    setGameState(state);
  }

  const handleSelectResourceForPosition = (state: GameState, resource: ResourceType) => {
    const { currentPlayerIndex, positionDialogState, selectedArmyId } = state;
    const player = state.players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army || !positionDialogState) {
        state.positionDialogState = null;
        state.currentAction = null;
        setGameState(state);
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
    const { currentPlayerIndex, map, selectedArmyId } = newState;
    const player = newState.players[currentPlayerIndex];
    const army = player.armies.find(a => a.id === selectedArmyId);

    if (!army) return;
    
    // Reset positions if moving
    const currentPos = army.position;
    const oldTile = newState.map[currentPos.y][currentPos.x];
    
    // Remove army from old tile occupants
    oldTile.occupants = oldTile.occupants.filter(o => o.playerId !== player.id || o.armyId !== army.id);
    
    // Remove all player positions when any army moves
    newState.players.forEach(p => {
        if (p.id === player.id) {
            p.positions.forEach(pos => {
                newState.map[pos.y][pos.x].positionedBy = newState.map[pos.y][pos.x].positionedBy?.filter(pb => pb.playerId !== player.id);
            });
            p.positions = [];
        }
    });
    
    army.position = { x, y };
    newState.map[y][x].occupants.push({ playerId: player.id, armyId: army.id });
    player.lastAction = 'move';
    
    const revealedIsland = newState.map[y][x];
    if(revealedIsland.isHidden) {
      revealedIsland.isHidden = false;
      player.victoryPoints += 1;
      const logMsg = `${player.name} discovered a new island and gets 1 VP!`;
      newState.log.push(logMsg);
      setToastsToShow(prev => [...prev, { title: 'Island Discovered!', description: logMsg }]);
      
      if(revealedIsland.type === 'monster') {
          const monsters = generateMonsters();
          revealedIsland.monsters = monsters;
          
          const monsterLog = `${player.name} encountered monsters!`;
          newState.log.push(monsterLog);
          setToastsToShow(prev => [...prev, { title: 'Monster Encounter!', description: monsterLog, variant: 'destructive'}]);
      }
    }
    
    endTurn(newState);
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
      setGameState(state);
    } else if (currentTile.type === 'monster' && currentTile.monsters && currentTile.monsters.length > 0) {
      state.monsterCombatState = {
        attackerId: attacker.id,
        monster: currentTile.monsters[0],
        attackerRolls: [],
        monsterRolls: [],
        winnerId: null,
        phase: 'rolling',
      };
      state.currentAction = 'attack';
      setGameState(state);
    } else {
      toast({ title: 'No one to attack', description: 'There are no other players or monsters on this island.', variant: 'destructive' });
      state.currentAction = null;
      setGameState(state);
    }
  };

  const handleCombatRoll = () => {
    if (!gameState || !gameState.combatState) return;

    const newState = deepClone(gameState);
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
    setGameState(newState);
  };
  
  const handleCloseCombat = () => {
    if (!gameState || !gameState.combatState) return;
    
    const newState = deepClone(gameState);
    const { combatState, players, map, selectedArmyId } = newState;
    const { winnerId, attackerId, defenderId } = combatState;

    if (winnerId === null) {
      newState.combatState = null;
      endTurn(newState);
      return;
    };
    
    const loserId = winnerId === attackerId ? defenderId : attackerId;
    const winner = players[winnerId];
    const loser = players[loserId];
    
    const attackingArmy = players[attackerId].armies.find(a => a.id === selectedArmyId);
    
    if (attackingArmy) {
      const combatTile = map[attackingArmy.position.y][attackingArmy.position.x];
      const loserOccupant = combatTile.occupants.find(o => o.playerId === loserId);

      if (loserOccupant) {
        const losingArmy = loser.armies.find(a => a.id === loserOccupant.armyId);
        if (losingArmy) {
            const baseTile = map.flat().find(t => t.type === 'base' && t.owner === loserId);
            if (baseTile) {
                const oldPos = losingArmy.position;
                
                map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(o => !(o.playerId === loserId && o.armyId === losingArmy.id));
                losingArmy.position = {x: baseTile.x, y: baseTile.y};
                map[baseTile.y][baseTile.x].occupants.push({playerId: loserId, armyId: losingArmy.id});
                
                const positionIndex = loser.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
                if (positionIndex > -1) {
                    const removedPosition = loser.positions.splice(positionIndex, 1)[0];
                    map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x].positionedBy?.filter(p => p.playerId !== loserId || p.resource !== removedPosition.resource);
                }
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

  const handleMonsterCombatRoll = (monster: Monster) => {
    if (!gameState) return;

    const newState = deepClone(gameState);
    const { players } = newState;
    const attacker = players[newState.currentPlayerIndex];

    const rollDice = (count: number) => {
      const diceCount = Math.min(count, 4);
      return Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    };

    const attackerRolls = rollDice(attacker.armyCount + attacker.attackPower);
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
    };
    setGameState(newState);
  };
  
  const handleCloseMonsterCombat = () => {
    if (!gameState || !gameState.monsterCombatState || gameState.selectedArmyId === null) return;
    
    const newState = deepClone(gameState);
    const { monsterCombatState, players, map, selectedArmyId } = newState;
    const attacker = players[monsterCombatState.attackerId];
    const army = attacker.armies.find(a => a.id === selectedArmyId);
    if (!army) return;

    const currentTile = map[army.position.y][army.position.x];
    
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
      currentTile.monsters = currentTile.monsters?.filter(m => m.id !== monsterCombatState.monster.id || m.level !== monsterCombatState.monster.level);
      
      const logMsg = `${attacker.name} defeated the level ${monsterCombatState.monster.level} monster and earned ${monsterVP} VP!`;
      newState.log.push(logMsg);
      toast({ title: 'Victory!', description: logMsg });

      if (currentTile.monsters?.length === 0) {
        currentTile.type = 'resource';
      }

    } else {
      const baseTile = map.flat().find(t => t.type === 'base' && t.owner === attacker.id);
      if (baseTile) {
          const oldPos = army.position;
          map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(o => o.playerId === attacker.id && o.armyId === army.id);
          
          army.position = {x: baseTile.x, y: baseTile.y};
          map[baseTile.y][baseTile.x].occupants.push({playerId: attacker.id, armyId: army.id});
          
          const positionIndex = attacker.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
          if (positionIndex > -1) {
            const removedPosition = attacker.positions.splice(positionIndex, 1)[0];
            map[oldPos.y][oldPos.x].positionedBy = map[oldPos.y][oldPos.x].positionedBy?.filter(p => p.playerId !== attacker.id || p.resource !== removedPosition.resource);
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
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }

    const nextPlayer = state.players[state.currentPlayerIndex];
    nextPlayer.lastAction = null;
    
    state.log.push(`It's now ${nextPlayer.name}'s turn.`);
    state.currentAction = null;
    state.possibleMoves = [];
    state.selectedTile = null;
    
    // Pre-select army if only one exists
    if (nextPlayer.armies.length === 1) {
        state.selectedArmyId = nextPlayer.armies[0].id;
    } else {
        state.selectedArmyId = null;
    }

    setGameState(state);
  }

  const handleEndTurn = () => {
    if (!gameState) return;
    endTurn(deepClone(gameState));
  }

  if (!gameState) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const { players, currentPlayerIndex, map, log, currentAction, possibleMoves, selectedTile, combatState, monsterCombatState, positionDialogState, selectedArmyId } = gameState;
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
        />
      )}
      {positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => {
            const newState = deepClone(gameState);
            handleSelectResourceForPosition(newState, resource)
            setGameState(newState);
          }}
          onClose={() => setGameState(prev => prev ? {...prev, positionDialogState: null, currentAction: null} : null)}
        />
      )}
    </div>
  );
}
