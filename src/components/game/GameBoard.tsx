


'use client';
import { useState, useEffect, useRef } from 'react';
import type { GameAction, GameState } from '@/lib/types';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Loader2, ArrowLeft, Play, Trophy } from 'lucide-react';
import { GameDialogs } from './GameDialogs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import * as GameActions from '@/lib/game-actions';
import { startGame } from '@/lib/game-initializer';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

const TURN_DURATION = 120; // 2 minutes in seconds

type GameBoardProps = {
    gameId: string;
    onExit: () => void;
};


export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { playerId } = usePlayer();
  const { gameState, setGameState, isMyTurn, localPlayer, isHost, isLoading } = useGameEngine(gameId, playerId);
  const { toast, dismiss } = useToast();
  const isMobile = useIsMobile();
  
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [activeInstructionToastId, setActiveInstructionToastId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (gameState?.status === 'playing' && isMyTurn) {
      setTimeLeft(TURN_DURATION); // Reset timer at the start of your turn

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
            if (prevTime <= 1) {
                clearInterval(timerRef.current!);
                handleAction('end-turn');
                return 0;
            }
            return prevTime - 1;
        });
      }, 1000);

    } else {
        // Not my turn or game not playing, clear interval
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setTimeLeft(TURN_DURATION);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, gameState?.status, gameState?.turn, gameState?.currentPlayerIndex]);

  useEffect(() => {
    if (timeLeft === 0 && isMyTurn) {
        toast({ title: "Time's up!", description: "Your turn has ended automatically."});
    }
  // handleAction is not stable, so we disable the lint rule here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isMyTurn]);

  // Effect to show teleport instructions via toast
  useEffect(() => {
    // Clean up previous toast if it exists
    if (activeInstructionToastId) {
        dismiss(activeInstructionToastId);
        setActiveInstructionToastId(null);
    }
    
    if (gameState?.teleportState && isMyTurn) {
      if (gameState.teleportState.armyId === null) {
        // This check prevents showing the toast again if it was just shown.
        if (gameState.currentAction !== 'teleport-initiated') {
            const { id } = toast({ title: 'Teleport: Step 1', description: 'Select an army on the map to teleport.' });
            setActiveInstructionToastId(id);
            setGameState({...gameState, currentAction: 'teleport-initiated'});
        }
      } else {
        const { id } = toast({ title: 'Teleport: Step 2', description: 'Now, select any destination tile on the map.' });
        setActiveInstructionToastId(id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.teleportState, isMyTurn]);

   useEffect(() => {
    if (gameState?.status === 'playing') {
        const winner = gameState.players.find(p => p.victoryPoints >= gameState.settings.victoryPointGoal);
        if (winner && !gameState.winner) {
            setGameState({ ...gameState, winner, status: 'finished' });
        }
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [gameState?.players, gameState?.status, gameState?.settings.victoryPointGoal]);
  
  const handleAction = async (action: GameAction) => {
    if (!gameState || !localPlayer) return;
    
    if (action === 'cancel-action') {
        const { newState, toastMessage } = GameActions.handleCancelAction(gameState);
        if (toastMessage) {
            toast({ title: "Action Cancelled", description: toastMessage });
        }
        setGameState(newState);
        return;
    }

    if (action === 'show-cards') {
        setGameState({ ...gameState, showCardsDialogForPlayer: localPlayer.id });
        return;
    }
    
    if (action === 'open-abilities-shop') {
        try {
            setGameState(GameActions.handleOpenAbilitiesShop(gameState));
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        return;
    }

    if (!isMyTurn) {
      toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
      return;
    }
    
    try {
        let newState = { ...gameState };
        
        const selectedArmy = GameActions.getSelectedArmy(newState);
        if (!selectedArmy && !['deploy', 'buy-card', 'upgrade', 'end-turn', 'use-card', 'show-cards', 'open-abilities-shop'].includes(action)) {
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
            case 'use-card':
                // This case is handled inside the CardsDialog for now
                break;
            case 'teleport':
                 // This action is handled by the CardsDialog to initiate teleport mode
                 break;
            default:
                newState = { ...newState, currentAction: action };
        }
        setGameState(newState);
    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleTileClick = (x: number, y: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing') return;
    try {
        const newState = GameActions.handleTileClick(gameState, x, y, localPlayer?.id ?? -1);
        if (activeInstructionToastId) {
            dismiss(activeInstructionToastId);
            setActiveInstructionToastId(null);
        }
        setGameState(newState);
    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    }
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
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, log, possibleMoves, selectedTile, selectedArmyId, status, maxPlayers, teleportState, scoutingState, armySelectionDialogState, winner, settings } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const canStartGame = status === 'waiting' && isHost && players.length > 1;

  const gridColsMap: { [key: number]: string } = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };
  
  const gridColsClass = `grid-cols-2 ${gridColsMap[players.length] || 'md:grid-cols-4'}`;
  const isTeleporting = !!teleportState;
  const isScouting = !!scoutingState && scoutingState.count > 0;


  return (
    <div className="relative flex h-screen w-full flex-col gap-2 overflow-auto p-2 sm:gap-4 sm:p-4">
      {status !== 'finished' && (
        <>
            {status === 'waiting' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="outline" size="icon" onClick={handleExitGame} disabled={isExiting}>
                        {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        </Button>
                        <h1 className="text-xl font-bold sm:text-2xl">Corner Conquest</h1>
                    </div>
                    {canStartGame && (
                        <Button onClick={handleStartGame}><Play /> Start Game Now</Button>
                    )}
                </div>
            ) : (
                 <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="outline" size="icon" onClick={onExit} disabled={isExiting}>
                            {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        </Button>
                        <h1 className="text-xl font-bold sm:text-2xl">{gameState.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-semibold">
                       <Trophy className="h-4 w-4 text-yellow-400" />
                       <span>VP Goal: {settings.victoryPointGoal}</span>
                    </div>
                </div>
            )}


            <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <h2 className="text-base font-semibold sm:text-lg">Player Information</h2>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div
                    className={`mt-2 grid gap-2 sm:gap-4 ${gridColsClass}`}
                    >
                    {players.map(p => (
                        <PlayerInfo key={p.id} player={p} isCurrentPlayer={currentPlayerIndex === p.id} />
                    ))}
                    {status === 'waiting' && Array.from({ length: maxPlayers - players.length}).map((_, i) => (
                        <div key={`empty-${i}`} className="flex h-full min-h-24 items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-sm text-muted-foreground sm:min-h-28 sm:text-base">Waiting for player...</div>
                    ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        
            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                <main className="flex flex-col items-center justify-start gap-2 overflow-hidden sm:gap-4">
                <MapGrid 
                    map={gameState.map} 
                    players={players} 
                    onTileClick={handleTileClick} 
                    possibleMoves={isTeleporting && teleportState.armyId !== null ? gameState.map.flat().map(t => ({x: t.x, y: t.y})) : possibleMoves} 
                    selectedTile={selectedTile} 
                    currentPlayerId={currentPlayer.id} 
                    selectedArmyId={selectedArmyId}
                    isTeleporting={isTeleporting}
                    isScouting={isScouting}
                />
                <div className='text-center'>
                    {status === 'waiting' ? (
                    <p className='text-base font-semibold text-accent sm:text-lg'>Waiting for players... ({players.length}/{maxPlayers})</p>
                    ) : armySelectionDialogState?.isOpen ? (
                    <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>Select an army to command</p>
                    ) : (
                    <>
                        {isTeleporting && isMyTurn ? (
                            <div className="flex flex-col items-center gap-2">
                                <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                    {teleportState.armyId === null ? 'Teleport: Select an army to move' : 'Teleport: Select a destination tile'}
                                </p>
                            </div>
                        ) : isScouting && isMyTurn ? (
                            <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                Scout: Reveal a hidden tile ({scoutingState.count} remaining)
                            </p>
                        ) : (
                            <>
                                <p className='text-base font-semibold sm:text-lg'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                                {gameState.currentAction && <p className='text-sm text-muted-foreground sm:text-base'>Current Action: {gameState.currentAction}</p>}
                            </>
                        )}
                    </>
                    )}
                </div>
                </main>
                <aside className="flex flex-col justify-start gap-4">
                <ActionsPanel 
                    onAction={handleAction} 
                    gameState={gameState} 
                    isMyTurn={isMyTurn && status === 'playing'}
                    timeLeft={timeLeft}
                    turnDuration={TURN_DURATION}
                />
                <GameLog logs={log} />
                </aside>
            </div>
        </>
      )}

      {winner && (
        <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className='text-center text-2xl'>Game Over!</AlertDialogTitle>
                    <AlertDialogDescription className='text-center text-lg'>
                        <span style={{color: winner.color}} className="font-bold">{winner.name}</span> wins the game!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='py-4 text-center'>
                     <Trophy className="mx-auto h-24 w-24 text-yellow-400" />
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onExit}>Return to Lobby</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      <GameDialogs 
        gameState={gameState} 
        setGameState={setGameState} 
        localPlayer={localPlayer}
        isMyTurn={isMyTurn}
      />
    </div>
  );
}
