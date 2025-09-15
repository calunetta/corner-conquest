'use client';
import { useState, useEffect } from 'react';
import type { GameAction } from '@/lib/types';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Loader2, ArrowLeft, Play } from 'lucide-react';
import { GameDialogs } from './GameDialogs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import * as GameActions from '@/lib/game-actions';
import { startGame } from '@/lib/game-initializer';

type GameBoardProps = {
  gameId: string;
  onExit: () => void;
};

export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { playerId } = usePlayer();
  const { gameState, setGameState, isMyTurn, localPlayer, isHost, isLoading } = useGameEngine(gameId, playerId);
  const { toast } = useToast();
  
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  
  const handleAction = async (action: GameAction) => {
    if (!gameState || !localPlayer) return;
    
    if (isMyTurn) {
      try {
          let newState = { ...gameState };
          
          const selectedArmy = GameActions.getSelectedArmy(newState);
          if (!selectedArmy && !['deploy', 'buy-card', 'upgrade', 'show-cards', 'end-turn'].includes(action)) {
              toast({ title: 'No Army Selected', description: 'You must select an army before performing this action.', variant: 'destructive'});
              return;
          }

          switch(action) {
              case 'position':
                  newState = GameActions.handlePositionAction(newState);
                  break;
              case 'collect':
                  newState = GameActions.handleCollectAction(newState);
                  break;
              case 'deploy':
                  newState = GameActions.handleDeployAction(newState);
                  break;
              case 'buy-card':
                  newState = GameActions.handleBuyCardAction(newState);
                  break;
              case 'upgrade':
                  newState = GameActions.handleUpgradeAction(newState);
                  break;
              case 'attack':
                  newState = GameActions.handleAttackAction(newState);
                  break;
              case 'end-turn':
                  newState = GameActions.handleEndTurn(newState);
                  break;
              case 'show-cards':
                  // This action can be triggered by any player at any time
                  break;
              default:
                  newState = { ...newState, currentAction: action };
          }
          if (action === 'show-cards') {
            setGameState({ ...gameState, showCardsDialogForPlayer: localPlayer.id });
          } else {
            setGameState(newState);
          }
      } catch (error: any) {
          toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
      }
    } else {
        if (action === 'show-cards') {
            setGameState({ ...gameState, showCardsDialogForPlayer: localPlayer.id });
        } else {
            toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
        }
    }
  };
  
  const handleTileClick = (x: number, y: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing') return;
    const newState = GameActions.handleTileClick(gameState, x, y);
    setGameState(newState);
  };
  
  const handleStartGame = async () => {
    if (!gameState || !isHost) return;
    const newState = startGame(gameState, localPlayer?.name || 'The host');
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    setGameState(newState);
  };

  const handleExitGame = async () => {
    if (!gameState || !localPlayer) return;

    if (isHost && gameState.status === 'waiting') {
        setGameState({ ...gameState, showHostLeaveDialog: true });
        return;
    }

    setIsExiting(true);
    const success = await GameActions.handlePlayerExit({
      gameId,
      gameState,
      localPlayer,
      isHost,
      onExit,
    });
    setIsExiting(false);
    if (!success) {
      toast({ title: "Cannot Leave", description: "You cannot leave a game that is in progress.", variant: "destructive" });
    }
  }

  if (isLoading || !gameState || !localPlayer) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, log, possibleMoves, selectedTile, selectedArmyId, status, maxPlayers } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const canStartGame = status === 'waiting' && players.length > 1;

  return (
    <div className="relative flex h-screen w-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleExitGame} disabled={isExiting || status === 'playing'}>
            {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
          </Button>
          <h1 className="text-2xl font-bold">Corner Conquest</h1>
        </div>
        {isHost && canStartGame && (
          <Button onClick={handleStartGame}><Play /> Start Game Now</Button>
        )}
      </div>

      <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
        <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
            <h2 className="text-lg font-semibold">Player Information</h2>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                    {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
                </Button>
            </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {players.map(p => (
                 <PlayerInfo key={p.id} player={p} isCurrentPlayer={currentPlayerIndex === p.id} />
              ))}
              {status === 'waiting' && Array.from({ length: maxPlayers - players.length}).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-muted-foreground">Waiting for player...</div>
              ))}
            </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <main className="flex flex-col items-center justify-start gap-4 overflow-hidden">
          <MapGrid 
            map={gameState.map} 
            players={players} 
            onTileClick={handleTileClick} 
            possibleMoves={possibleMoves} 
            selectedTile={selectedTile} 
            currentPlayerId={currentPlayer.id} 
            selectedArmyId={selectedArmyId} 
          />
          <div className='text-center'>
            {status === 'waiting' ? (
              <p className='text-lg font-semibold text-accent'>Waiting for players... ({players.length}/{maxPlayers})</p>
            ) : (
              <>
                <p className='text-lg font-semibold'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                {gameState.currentAction && <p className='text-muted-foreground'>Current Action: {gameState.currentAction}</p>}
              </>
            )}
          </div>
        </main>
        <aside className="flex flex-col justify-start gap-4">
          <ActionsPanel onAction={handleAction} gameState={gameState} isMyTurn={isMyTurn && status === 'playing'} />
          <GameLog logs={log} />
        </aside>
      </div>

      <GameDialogs 
        gameState={gameState} 
        setGameState={setGameState} 
        localPlayer={localPlayer}
        isMyTurn={isMyTurn}
      />
    </div>
  );
}
