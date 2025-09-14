'use client';
import { useState, useEffect } from 'react';
import type { GameState, GameAction } from '@/lib/types';
import { initializeGame } from '@/lib/game-logic';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { GameHeader } from './GameHeader';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateMonsterEncounter } from '@/ai/flows/monster-encounter-generation';
import { Loader2 } from 'lucide-react';

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
    const { currentPlayerIndex, players } = gameState;
    const currentPlayer = players[currentPlayerIndex];

    const newState = deepClone(gameState);
    newState.currentAction = action;

    if(action === 'move') {
      const {x, y} = currentPlayer.position;
      newState.selectedTile = {x, y};
      const moves = [];
      for(let i = -2; i <= 2; i++) {
        for(let j = -2; j <= 2; j++) {
          if(Math.abs(i) + Math.abs(j) <= 2 && (i !== 0 || j !== 0)) {
            const newX = x + i;
            const newY = y + j;
            if(newX >= 0 && newX < newState.map.length && newY >= 0 && newY < newState.map.length) {
              moves.push({x: newX, y: newY});
            }
          }
        }
      }
      newState.possibleMoves = moves;
    } else {
      newState.possibleMoves = [];
      newState.selectedTile = null;
    }
    
    setGameState(newState);
  };

  const handleTileClick = (x: number, y: number) => {
    if (!gameState || gameState.currentAction !== 'move') return;

    const isPossibleMove = gameState.possibleMoves.some(p => p.x === x && p.y === y);
    if (!isPossibleMove) return;

    const newState = deepClone(gameState);
    const { currentPlayerIndex } = newState;
    const player = newState.players[currentPlayerIndex];
    
    const oldPos = player.position;
    newState.map[oldPos.y][oldPos.x].occupants = newState.map[oldPos.y][oldPos.x].occupants.filter(id => id !== player.id);
    
    player.position = { x, y };
    newState.map[y][x].occupants.push(player.id);
    player.lastAction = 'move';
    
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
  };
  
  const endTurn = (state: GameState) => {
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

  const { players, currentPlayerIndex, map, log, currentAction, possibleMoves, selectedTile } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="grid h-full w-full grid-cols-[320px_1fr_320px] grid-rows-[auto_1fr] gap-6 p-6">
      <div className="col-span-3">
        <GameHeader />
      </div>
      <aside className="col-start-1 row-start-2 flex flex-col justify-between gap-6">
        <PlayerInfo player={players[0]} isCurrentPlayer={currentPlayerIndex === 0} />
        <PlayerInfo player={players[2]} isCurrentPlayer={currentPlayerIndex === 2} />
      </aside>
      <main className="col-start-2 row-start-2 flex flex-col items-center justify-center gap-4">
        <MapGrid map={map} players={players} onTileClick={handleTileClick} possibleMoves={possibleMoves} selectedTile={selectedTile} />
        <div className='text-center'>
            <p className='text-lg font-semibold'>Turn {gameState.turn}: <span className='text-primary'>{currentPlayer.name}'s turn</span></p>
            {currentAction && <p className='text-muted-foreground'>Current Action: {currentAction}</p>}
        </div>
      </main>
      <aside className="col-start-3 row-start-2 flex flex-col justify-between gap-6">
        <PlayerInfo player={players[1]} isCurrentPlayer={currentPlayerIndex === 1} />
        <div className='flex flex-col gap-6'>
          <ActionsPanel onAction={handleAction} lastAction={currentPlayer.lastAction} currentAction={currentAction} />
          <GameLog logs={log} />
          <Button onClick={handleEndTurn}>End Turn</Button>
        </div>
        <PlayerInfo player={players[3]} isCurrentPlayer={currentPlayerIndex === 3} />
      </aside>
    </div>
  );
}
