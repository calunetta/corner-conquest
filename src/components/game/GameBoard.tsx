'use client';
import { useState, useEffect } from 'react';
import type { GameState, GameAction, ResourceType, IslandResource } from '@/lib/types';
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
import { PositionDialog } from './PositionDialog';


function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
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
    const { players, map } = gameState;
    const currentPlayer = players[gameState.currentPlayerIndex];

    const newState = deepClone(gameState);
    newState.currentAction = action;
    newState.possibleMoves = [];
    newState.selectedTile = null;

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
    } else if (action === 'position') {
      handlePositionAction(newState, currentPlayer.position.x, currentPlayer.position.y);
    } else if (action === 'collect') {
      handleCollectAction(newState);
    } else if (action === 'deploy') {
      handleDeployAction(newState);
    } else if (action === 'buy-card') {
      handleBuyCardAction(newState);
    } else if (action === 'attack') {
      handleAttackAction(newState);
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

  const handleCollectAction = (state: GameState) => {
    const { currentPlayerIndex, players, map } = state;
    const player = players[currentPlayerIndex];
    
    const position = player.positions.find(p => p.x === player.position.x && p.y === player.position.y);

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
    if (!gameState || !gameState.currentAction) return;

    const isPossibleMove = gameState.possibleMoves.some(p => p.x === x && p.y === y);
    if (!isPossibleMove) return;
    
    const newState = deepClone(gameState);
    
    if (gameState.currentAction === 'move') {
      handleMoveAction(newState, x, y);
    }
  };

  const handlePositionAction = (state: GameState, x: number, y: number) => {
    const player = state.players[state.currentPlayerIndex];
    const tile = state.map[y][x];

    if ((tile.type !== 'resource' && tile.type !== 'base') || tile.resources.length === 0) {
        toast({ title: 'Cannot Position', description: 'You can only position on an island with resources.', variant: 'destructive'});
        state.currentAction = null;
        setGameState(state);
        return;
    }
    
    if (player.positions.some(p => p.x === x && p.y === y)) {
      toast({ title: 'Already Positioned', description: `You already have an army positioned at ${x},${y}.`, variant: 'destructive'});
      state.currentAction = null;
      setGameState(state);
      return;
    }

    if (tile.resources.length === 1) {
      handleSelectResourceForPosition(deepClone(state), tile.resources[0].type);
    } else {
      state.positionDialogState = { x, y, resources: tile.resources };
      setGameState(state);
    }
  }

  const handleSelectResourceForPosition = (state: GameState, resource: ResourceType) => {
    const { currentPlayerIndex, positionDialogState } = state;
    const player = state.players[currentPlayerIndex];
    const x = positionDialogState?.x ?? player.position.x;
    const y = positionDialogState?.y ?? player.position.y;
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
    const { currentPlayerIndex } = newState;
    const player = newState.players[currentPlayerIndex];
    
    const oldPos = player.position;
    newState.map[oldPos.y][oldPos.x].occupants = newState.map[oldPos.y][oldPos.x].occupants.filter(id => id !== player.id);
    
    const positionIndex = player.positions.findIndex(p => p.x === oldPos.x && p.y === oldPos.y);
    if (positionIndex !== -1) {
        const removedPosition = player.positions.splice(positionIndex, 1)[0];
        const oldTile = newState.map[oldPos.y][oldPos.x];
        if (oldTile.positionedBy) {
          oldTile.positionedBy = oldTile.positionedBy.filter(p => p.playerId !== player.id);
        }
        const logMsg = `${player.name} moved and is no longer collecting ${removedPosition.resource} from ${oldPos.x},${oldPos.y}.`;
        newState.log.push(logMsg);
        setToastsToShow(prev => [...prev, { title: 'Position Abandoned', description: logMsg }]);
    }

    player.position = { x, y };
    newState.map[y][x].occupants.push(player.id);
    player.lastAction = 'move';
    
    const revealedIsland = newState.map[y][x];
    if(revealedIsland.isHidden) {
      revealedIsland.isHidden = false;
      player.victoryPoints += 1;
      const logMsg = `${player.name} discovered a new island and gets 1 VP!`;
      newState.log.push(logMsg);
      setToastsToShow(prev => [...prev, { title: 'Island Discovered!', description: logMsg }]);
      
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
              setToastsToShow(prev => [...prev, { title: 'Monster Encounter!', description: monsterLog, variant: 'destructive'}]);
              
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
    } else if (currentTile.type === 'monster' && currentTile.monsterDetails) {
      // For now, let's just log a monster attack attempt.
      // We will implement monster combat later.
      toast({ title: 'Monster Attack!', description: `You are attacking the monster! This will be implemented soon.` });
      state.currentAction = null;
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

    // Clear all positions for the loser
    loser.positions = [];
    map.forEach(row => row.forEach(tile => {
      if (tile.positionedBy) {
        tile.positionedBy = tile.positionedBy.filter(p => p.playerId !== loser.id);
      }
    }));


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

    const logMsg = `${players[winnerId!].name} defeated ${loser.name}! ${loser.name} was sent back to their base and lost all positions.`;
    newState.log.push(logMsg);
    toast({ title: 'Combat Over!', description: logMsg });
    
    newState.combatState = null;
    attacker.lastAction = 'attack';
    endTurn(newState);
  }

  const endTurn = (state: GameState) => {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }

    const nextPlayer = state.players[state.currentPlayerIndex];
    if (nextPlayer.lastAction === 'move') {
        nextPlayer.lastAction = null;
    }
    
    state.log.push(`It's now ${nextPlayer.name}'s turn.`);
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

  const { players, currentPlayerIndex, map, log, currentAction, possibleMoves, selectedTile, combatState, positionDialogState } = gameState;
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
      {positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleSelectResourceForPosition(deepClone(gameState), resource)}
          onClose={() => setGameState(prev => prev ? {...prev, positionDialogState: null, currentAction: null} : null)}
        />
      )}
    </div>
  );
}
