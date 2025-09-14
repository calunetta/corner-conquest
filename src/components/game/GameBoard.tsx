'use client';
import { useState, useEffect } from 'react';
import type { GameState, GameAction, Island, ResourceType } from '@/lib/types';
import { initializeGame } from '@/lib/game-logic';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateMonsterEncounter } from '@/ai/flows/monster-encounter-generation';
import { Loader2 } from 'lucide-react';
import { CombatDialog } from './CombatDialog';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function GameBoard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setGameState(initializeGame());
  }, []);

  const handleAction = (action: GameAction) => {
    if (!gameState) return;
    const { currentPlayerIndex, players, map } = gameState;
    const currentPlayer = players[currentPlayerIndex];

    const newState = deepClone(gameState);
    newState.currentAction = action;

    if (action === 'move') {
      const { x, y } = currentPlayer.position;
      newState.selectedTile = { x, y };
      const moves = [];
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
      newState.possibleMoves = moves;
    } else if (action === 'farm') {
      newState.possibleMoves = [];
      newState.selectedTile = null;
      const farmableTiles = [];
      // Player can farm on any resource tile they currently occupy
      for(let y = 0; y < map.length; y++) {
        for(let x = 0; x < map[y].length; x++) {
          const tile = map[y][x];
          if(tile.occupants.includes(currentPlayer.id) && (tile.type === 'resource' || tile.type === 'base')) {
            farmableTiles.push({x, y});
          }
        }
      }
      newState.possibleMoves = farmableTiles;
    } else if (action === 'mine') {
      handleMineAction(newState);
    } else if (action === 'deploy') {
      handleDeployAction(newState);
    } else if (action === 'buy-card') {
      handleBuyCardAction(newState);
    } else if (action === 'attack') {
      handleAttackAction(newState);
    } else {
      newState.possibleMoves = [];
      newState.selectedTile = null;
    }
    
    setGameState(newState);
  };
  
  const handleDeployAction = (state: GameState) => {
    const { currentPlayerIndex, players } = state;
    const player = players[currentPlayerIndex];
    if (player.resources.food >= player.nextArmyCost && player.armySize < 5) {
      player.resources.food -= player.nextArmyCost;
      player.armySize += 1;
      player.nextArmyCost += 1;
      player.lastAction = 'deploy';
      const logMsg = `${player.name} deployed a new army! They now have ${player.armySize} armies.`;
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

  const handleMineAction = (state: GameState) => {
    const { currentPlayerIndex, players, map } = state;
    const player = players[currentPlayerIndex];
    const currentTile = map[player.position.y][player.position.x];

    if ((currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0) {
      let minedResources: Partial<Record<ResourceType, number>> = {};
      currentTile.resources.forEach(resource => {
        player.resources[resource]++;
        minedResources[resource] = (minedResources[resource] || 0) + 1;
      });
      
      const logMsgs = Object.entries(minedResources).map(([resource, amount]) => `${player.name} mined ${amount} ${resource}.`);
      const logMsg = logMsgs.join(' ');
      state.log.push(logMsg);
      toast({ title: 'Mined Resources!', description: logMsg });
      
      currentTile.resources = [];
      player.lastAction = 'mine';
      endTurn(state);
    } else {
      toast({ title: 'Cannot Mine', description: 'You can only mine on a resource island with available resources.', variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
    }
  };

  const handleTileClick = (x: number, y: number) => {
    if (!gameState || !gameState.currentAction) return;

    const isPossibleMove = gameState.possibleMoves.some(p => p.x === x && p.y === y);
    if (!isPossibleMove) return;
    
    const newState = deepClone(gameState);
    
    if (gameState.currentAction === 'move') {
      handleMoveAction(newState, x, y);
    } else if (gameState.currentAction === 'farm') {
      handleFarmAction(newState, x, y);
    }
  };

  const handleFarmAction = (state: GameState, x: number, y: number) => {
    const { currentPlayerIndex } = state;
    const player = state.players[currentPlayerIndex];
    const selectedTile = state.map[y][x];
    
    if (selectedTile.type !== 'resource' && selectedTile.type !== 'base') {
        toast({ title: 'Cannot Farm', description: 'You can only farm on resource or base islands.', variant: 'destructive'});
        state.currentAction = null;
        setGameState(state);
        return;
    }

    if (player.farmPosition) {
      const oldFarmTile = state.map[player.farmPosition.y][player.farmPosition.x];
      if (oldFarmTile) {
        oldFarmTile.farmedBy = undefined;
      }
    }

    player.farmPosition = { x, y };
    selectedTile.farmedBy = player.id;
    player.lastAction = 'farm';

    const logMsg = `${player.name} has established a farm at ${x},${y}.`;
    state.log.push(logMsg);
    toast({ title: 'Farm Established!', description: logMsg });
    
    endTurn(state);
  }

  const handleMoveAction = (newState: GameState, x: number, y: number) => {
    const { currentPlayerIndex } = newState;
    const player = newState.players[currentPlayerIndex];
    
    const oldPos = player.position;
    newState.map[oldPos.y][oldPos.x].occupants = newState.map[oldPos.y][oldPos.x].occupants.filter(id => id !== player.id);
    
    player.position = { x, y };
    newState.map[y][x].occupants.push(player.id);
    player.lastAction = 'move';
    
    // Update occupied resource tiles for the player
    const occupiedResourceTiles = [];
    for(let i=0; i < newState.map.length; i++){
        for(let j=0; j < newState.map[i].length; j++){
            const tile = newState.map[i][j];
            if(tile.occupants.includes(player.id) && (tile.type === 'resource' || tile.type === 'base')){
                occupiedResourceTiles.push({x: j, y: i});
            }
        }
    }
    player.occupiedResourceTiles = occupiedResourceTiles;


    const revealedIsland = newState.map[y][x];
    if(revealedIsland.isHidden) {
      revealedIsland.isHidden = false;
      player.victoryPoints += 1;
      const logMsg = `${player.name} discovered a new island and gets 1 VP!`;
      newState.log.push(logMsg);
      toast({ title: 'Island Discovered!', description: logMsg });
      
      if(revealedIsland.type === 'monster' && !revealedIsland.monsterDetails) {
        revealedIsland.isFetchingMonster = true;
        
        generateMonsterEncounter({ islandDescription: `A mysterious island at ${x},${y}`})
          .then(monsterDetails => {
            setGameState(prev => {
              if(!prev) return null;
              const finalState = deepClone(prev);
              const islandToUpdate = finalState.map[y][x];
              islandToUpdate.monsterDetails = monsterDetails;
              islandToUpdate.isFetchingMonster = false;
              
              const monsterLog = `${player.name} encountered a ${monsterDetails.bigMonsterType} ${monsterDetails.hasBigMonster ? 'big' : ''} monster and a ${monsterDetails.littleMonsterType} little monster!`;
              finalState.log.push(monsterLog);
              toast({ title: 'Monster Encounter!', description: monsterLog, variant: 'destructive'});
              
              return finalState;
            })
          })
      }
    }
    
    endTurn(newState);
  }

  const handleAttackAction = (state: GameState) => {
    const { currentPlayerIndex, players, map } = state;
    const attacker = players[currentPlayerIndex];
    const currentTile = map[attacker.position.y][attacker.position.x];
    const otherPlayers = currentTile.occupants.filter(id => id !== attacker.id);

    if (otherPlayers.length > 0) {
      const defenderId = otherPlayers[0]; // Attack the first other player on the tile
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
    } else {
      // Handle monster attack later
      toast({ title: 'No one to attack', description: 'There are no other players on this island.', variant: 'destructive' });
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

    const rollDice = (armySize: number) => {
      const diceCount = Math.min(armySize, 4);
      return Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    };

    combatState.attackerRolls = rollDice(attacker.armySize);
    combatState.defenderRolls = rollDice(defender.armySize);

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
    const { combatState, players, map } = newState;
    const winnerId = combatState.winnerId;
    const attacker = players[combatState.attackerId];
    const defender = players[combatState.defenderId];
    const loser = winnerId === attacker.id ? defender : attacker;

    // Move loser back to base
    const basePositions = [
      { x: 0, y: 0 },
      { x: map.length - 1, y: 0 },
      { x: 0, y: map.length - 1 },
      { x: map.length - 1, y: map.length - 1 },
    ];
    const loserBasePosition = basePositions[loser.id];
    
    const oldPos = loser.position;
    map[oldPos.y][oldPos.x].occupants = map[oldPos.y][oldPos.x].occupants.filter(id => id !== loser.id);
    
    loser.position = loserBasePosition;
    map[loserBasePosition.y][loserBasePosition.x].occupants.push(loser.id);

    const logMsg = `${players[winnerId!].name} defeated ${loser.name}! ${loser.name} was sent back to their base.`;
    newState.log.push(logMsg);
    toast({ title: 'Combat Over!', description: logMsg });
    
    newState.combatState = null;
    attacker.lastAction = 'attack';
    endTurn(newState);
  }

  const endTurn = (state: GameState) => {
    state.players.forEach(player => {
      if (player.farmPosition) {
        const farmTile = state.map[player.farmPosition.y][player.farmPosition.x];
        if (farmTile && farmTile.resources.length > 0) {
          const resourceToGain = farmTile.resources[0];
          player.resources[resourceToGain] += 1;
          const logMsg = `${player.name} gained 1 ${resourceToGain} from their farm.`;
          state.log.push(logMsg);
        }
      }
    });

    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }
    state.log.push(`It's now ${state.players[state.currentPlayerIndex].name}'s turn.`);
    state.currentAction = null;
    state.possibleMoves = [];
    state.selectedTile = null;
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

  const { players, currentPlayerIndex, map, log, currentAction, possibleMoves, selectedTile, combatState } = gameState;
  const currentPlayer = players[currentPlayerIndex];

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
          <MapGrid map={map} players={players} onTileClick={handleTileClick} possibleMoves={possibleMoves} selectedTile={selectedTile} />
          <div className='text-center'>
              <p className='text-lg font-semibold'>Turn {gameState.turn}: <span className='text-primary'>{currentPlayer.name}'s turn</span></p>
              {currentAction && <p className='text-muted-foreground'>Current Action: {currentAction}</p>}
          </div>
        </main>
        <aside className="flex flex-col justify-start gap-4">
          <ActionsPanel onAction={handleAction} gameState={gameState} />
          <GameLog logs={log} />
          <Button onClick={handleEndTurn}>End Turn</Button>
        </aside>
      </div>
      {combatState && <CombatDialog gameState={gameState} onRoll={handleCombatRoll} onClose={handleCloseCombat} />}
    </div>
  );
}
