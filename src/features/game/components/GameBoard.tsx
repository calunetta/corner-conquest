
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameState, Army } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from '@/features/game/panels/PlayerInfo';
import { ActionsPanel } from '@/features/game/panels/ActionsPanel';
import { GameLog } from '@/features/game/panels/GameLog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Loader2, ArrowLeft, Play, Trophy } from 'lucide-react';
import { GameDialogs } from '@/features/game/dialogs/GameDialogs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import { handleGameAction, handlePlayerExit, handleConfirmHostLeave } from '@/lib/actions';
import { startGame } from '@/lib/game-initializer';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { ConfirmExitDialog } from '@/features/game/dialogs/ConfirmExitDialog';
import { MAP_COLS } from '@/lib/game-logic';

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
  const [locallyDismissedDialogs, setLocallyDismissedDialogs] = useState<(keyof GameState)[]>([]);
  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  const [selectedTile, setSelectedTile] = useState<{ x: number, y: number } | null>(null);
  const [selectedArmyId, setSelectedArmyId] = useState<number | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<{ x: number, y: number }[]>([]);
  const [currentAction, setCurrentAction] = useState<GameAction | null>(null);
  const [cardsDialogPlayerId, setCardsDialogPlayerId] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);
  
  useEffect(() => {
    if (isMyTurn) {
        setLocallyDismissedDialogs([]);
    } else {
        setSelectedArmyId(null);
        setSelectedTile(null);
        setPossibleMoves([]);
        setCurrentAction(null);
        setCardsDialogPlayerId(null);
        if (gameState) {
            // Dismiss all active dialogs locally when it's not our turn
            const dialogKeys = Object.keys(gameState).filter(k => 
                (k.endsWith('State') && gameState[k as keyof GameState] !== null) || 
                k.endsWith('Dialog')
            );
            setLocallyDismissedDialogs(dialogKeys as (keyof GameState)[]);
        }
    }
  }, [isMyTurn, gameState?.turn, gameState?.currentPlayerIndex]);

  const selectedArmy = useMemo(() => {
    if (!gameState || selectedArmyId === null) return null;
    const player = isMyTurn ? gameState.players[gameState.currentPlayerIndex] : localPlayer;
    return player?.armies.find(a => a.id === selectedArmyId) || null;
  }, [gameState, selectedArmyId, localPlayer, isMyTurn]);

  useEffect(() => {
    if (isMyTurn && gameState) {
        const myPlayer = gameState.players[gameState.currentPlayerIndex];
        if (myPlayer.armies.length > 1 && selectedArmyId !== null) {
            const armyStillExists = myPlayer.armies.some(a => a.id === selectedArmyId);
            if (!armyStillExists) {
                setSelectedArmyId(null);
                setPossibleMoves([]);
                setSelectedTile(null);
            }
        } else if (myPlayer.armies.length === 1 && selectedArmyId === null) {
             setSelectedArmyId(myPlayer.armies[0].id);
        } else if (myPlayer.armies.length === 1 && selectedArmyId !== myPlayer.armies[0].id) {
            setSelectedArmyId(myPlayer.armies[0].id);
        }
    } else if (!isMyTurn) {
        setSelectedArmyId(null);
        setSelectedTile(null);
        setPossibleMoves([]);
        setCurrentAction(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, gameState?.turn, gameState?.players]);
  
  const onAction = useCallback(async (action: GameAction, payload?: any) => {
    if (isPerformingAction) return;

    if (!isMyTurn && ![GameAction.ShowCards, GameAction.OpenAbilitiesShop, GameAction.CloseCards, GameAction.CloseAbilitiesShop].includes(action)) {
      toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
      return;
    }
    
    try {
        setIsPerformingAction(true);
        
        await setGameState((currentGameState) => {
            if (!currentGameState || !localPlayer) return currentGameState;
            
            const {newState, ...uiState} = handleGameAction({
                action,
                gameState: currentGameState,
                selectedArmyId,
                payload
            });
            
            // This part now happens inside the state setter, using the returned UI state
            if (uiState.selectedArmyId !== undefined) setSelectedArmyId(uiState.selectedArmyId);
            if (uiState.possibleMoves) setPossibleMoves(uiState.possibleMoves);
            if (uiState.currentAction !== undefined) setCurrentAction(uiState.currentAction);
            if (uiState.selectedTile !== undefined) setSelectedTile(uiState.selectedTile);

            // Reset UI state for most actions, but preserve it for dialog flows
            if (action !== GameAction.SelectArmy && action !== GameAction.SelectDefender && action !== GameAction.CancelAction) {
                const isDialogAction = Object.keys(newState).some(k => (k.endsWith('State') || k.endsWith('Dialog')) && newState[k as keyof GameState] !== null);
                if (!isDialogAction) {
                    setCurrentAction(null);
                    setPossibleMoves([]);
                    setSelectedTile(null);
                }
            }

            return newState;
        });

    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsPerformingAction(false);
    }
  }, [isPerformingAction, isMyTurn, toast, setGameState, localPlayer, selectedArmyId]);
  
  const handleTileClick = async (x: number, y: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing' || isPerformingAction) return;
    
    try {
        setIsPerformingAction(true);
        await setGameState(currentGameState => {
            if (!currentGameState) return null;

            const result = handleGameAction({
                action: GameAction.TileClick,
                gameState: currentGameState,
                selectedArmyId: selectedArmyId,
                payload: { x, y, possibleMoves }
            });
            
            const { newState, selectedArmyId: newSelectedArmyId, possibleMoves: newPossibleMoves, currentAction: newCurrentAction, selectedTile: newSelectedTile } = result;

            setSelectedArmyId(newSelectedArmyId === undefined ? selectedArmyId : newSelectedArmyId);
            setSelectedTile(newSelectedTile === undefined ? selectedTile : newSelectedTile);
            setPossibleMoves(newPossibleMoves === undefined ? possibleMoves : newPossibleMoves);
            setCurrentAction(newCurrentAction === undefined ? currentAction : newCurrentAction);

            if (activeInstructionToastId) {
                dismiss(activeInstructionToastId);
                setActiveInstructionToastId(null);
            }
            return newState;
        });
    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsPerformingAction(false);
    }
  };
  
  useEffect(() => {
    if (gameState?.status === 'playing' && isMyTurn) {
      setTimeLeft(TURN_DURATION); 

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
            if (prevTime <= 1) {
                clearInterval(timerRef.current!);
                if (isMyTurn) { // Double check it's still my turn
                    onAction(GameAction.EndTurn, null);
                }
                return 0;
            }
            return prevTime - 1;
        });
      }, 1000);

    } else {
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
    if (gameState?.status === 'finished' && timerRef.current) {
        clearInterval(timerRef.current);
    }
   }, [gameState?.status])

  useEffect(() => {
    if (timeLeft <= 0 && isMyTurn && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        toast({ title: "Time's up!", description: "Your turn has ended automatically."});
        onAction(GameAction.EndTurn, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isMyTurn]);

  useEffect(() => {
    if (activeInstructionToastId) {
        dismiss(activeInstructionToastId);
        setActiveInstructionToastId(null);
    }
    
    if (gameState?.teleportState && isMyTurn) {
      if (gameState.teleportState.armyId === null) {
        const { id } = toast({ title: 'Teleport: Step 1', description: 'Select an army on the map to teleport.' });
        setActiveInstructionToastId(id);
      } else {
        const { id } = toast({ title: 'Teleport: Step 2', description: 'Now, select any destination tile on the map.' });
        setActiveInstructionToastId(id);
      }
    } else if (gameState?.scoutingState && gameState.scoutingState.count > 0 && isMyTurn) {
        const { id } = toast({ title: 'Scout Activated', description: `Click a hidden tile to reveal it. ${gameState.scoutingState.count} reveals remaining.` });
        setActiveInstructionToastId(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.teleportState, gameState?.scoutingState, isMyTurn]);

   useEffect(() => {
    if (gameState?.status === 'playing') {
        const winner = gameState.players.find(p => p.victoryPoints >= gameState.settings.victoryPointGoal);
        if (winner && !gameState.winner) {
            setGameState(gs => gs ? { ...gs, winner, status: 'finished' } : null);
        }
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [gameState?.players, gameState?.status, gameState?.settings.victoryPointGoal]);
   
  const handleStartGame = async () => {
    if (!gameState || !isHost) return;
    const newState = startGame(gameState, localPlayer?.name || 'The host');
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    await setGameState(newState);
  };

  const handleExitClick = () => {
    if (!gameState || !localPlayer) return;

    if (isHost) {
        setGameState({ ...gameState, showHostLeaveDialog: true });
        return;
    }

    if (gameState.status === 'playing') {
        setShowConfirmExitDialog(true);
    } else {
        handleConfirmExit();
    }
  };

  const handleConfirmExit = async () => {
    setShowConfirmExitDialog(false);
    if (!localPlayer) return;
    setIsExiting(true);
    await handlePlayerExit({
      gameId,
      localPlayer,
      onExit,
    });
    setIsExiting(false);
  };

  const handleConfirmHostLeaveGame = async () => {
      if (!gameState) return;
      setIsExiting(true);
      await handleConfirmHostLeave(gameId, onExit);
      setIsExiting(false);
  }

  const handleToggleCards = (playerId: number) => {
    setCardsDialogPlayerId(prevId => prevId === playerId ? null : playerId);
  };

  if (isLoading || !gameState || !localPlayer) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, log, status, maxPlayers, teleportState, scoutingState, armySelectionDialogState, winner, settings, deathAnimations, map } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const canStartGame = status === 'waiting' && isHost && players.length > 1;

  const isTeleporting = !!teleportState;
  const isScouting = !!scoutingState && scoutingState.count > 0;

  return (
    <div className="relative flex h-screen w-full flex-col gap-2 overflow-auto p-2 sm:gap-4 sm:p-4">
      {status !== 'finished' && (
        <>
            {status === 'waiting' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="outline" size="icon" onClick={handleExitClick} disabled={isExiting}>
                        {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        </Button>
                        <h1 className="text-xl font-bold sm:text-2xl">Corner Conquest</h1>
                    </div>
                    {canStartGame && (
                        <Button onClick={handleStartGame}><Play /> Start Game</Button>
                    )}
                </div>
            ) : null}


            <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <div className='flex items-center gap-4'>
                        {status !== 'waiting' && <Button variant="outline" size="icon" onClick={handleExitClick} disabled={isExiting}>
                            {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        </Button>}
                        <h2 className="text-base font-semibold sm:text-lg">Player Information</h2>
                        {status === 'playing' && (
                            <div className="flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold">
                               <Trophy className="h-4 w-4 text-yellow-400" />
                               <span>VP Goal: {settings.victoryPointGoal}</span>
                            </div>
                        )}
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div
                    className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
                    >
                    {players.map(p => (
                        <PlayerInfo key={p.playerId} player={p} isCurrentPlayer={p.id === currentPlayerIndex} />
                    ))}
                    {status === 'waiting' && Array.from({ length: maxPlayers - players.length}).map((_, i) => (
                        <div key={`empty-${i}`} className="flex h-full min-h-24 items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-sm text-muted-foreground sm:min-h-28 sm:text-base">Waiting for player...</div>
                    ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        
            <div className="grid flex-1 grid-cols-1 justify-center gap-4 lg:grid-cols-[auto_320px]">
                <main 
                  className="relative flex items-center justify-center overflow-auto rounded-xl"
                >
                  <MapGrid 
                      map={map} 
                      players={players} 
                      onTileClick={handleTileClick} 
                      possibleMoves={isTeleporting && teleportState?.armyId !== null ? map.map(t => ({x: t.x, y: t.y})) : possibleMoves} 
                      selectedTile={selectedTile} 
                      currentPlayerId={currentPlayer.id} 
                      selectedArmyId={selectedArmyId}
                      isTeleporting={isTeleporting}
                      isScouting={isScouting}
                      deathAnimations={deathAnimations}
                      fogOfWar={settings.fogOfWar}
                      localPlayer={localPlayer}
                  />
                  <div className='pointer-events-none absolute bottom-4 right-4 z-20 rounded-lg bg-background/80 p-2 text-center shadow-md backdrop-blur-sm'>
                      {status === 'waiting' ? (
                      <p className='text-base font-semibold text-accent sm:text-lg'>Waiting for players... ({players.length}/{maxPlayers})</p>
                      ) : armySelectionDialogState?.isOpen ? (
                      <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>Select an army to command</p>
                      ) : (
                      <>
                          {isTeleporting && isMyTurn ? (
                              <div className="flex flex-col items-center gap-2">
                                  <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                      {teleportState?.armyId === null ? 'Teleport: Select an army to move' : 'Teleport: Select a destination'}
                                  </p>
                              </div>
                          ) : isScouting && isMyTurn ? (
                              <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                  Scout: Reveal a hidden tile ({scoutingState.count} remaining)
                                  </p>
                          ) : (
                              <>
                                  <p className='text-base font-semibold sm:text-lg'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                                  {currentAction && <p className='text-sm text-muted-foreground sm:text-base'>Current Action: {currentAction}</p>}
                              </>
                          )}
                      </>
                      )}
                  </div>
                </main>
                <aside className="flex flex-col justify-start gap-4">
                <ActionsPanel 
                    onAction={onAction} 
                    gameState={gameState} 
                    isMyTurn={isMyTurn && status === 'playing'}
                    timeLeft={timeLeft}
                    turnDuration={TURN_DURATION}
                    currentAction={currentAction}
                    selectedArmy={selectedArmy}
                    onToggleCards={handleToggleCards}
                    cardsDialogPlayerId={cardsDialogPlayerId}
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
      
      {showConfirmExitDialog && (
          <ConfirmExitDialog 
            onConfirm={handleConfirmExit}
            onClose={() => setShowConfirmExitDialog(false)}
          />
      )}

      <GameDialogs 
        gameState={gameState} 
        localPlayer={localPlayer}
        isMyTurn={isMyTurn}
        onConfirmHostLeave={handleConfirmHostLeaveGame}
        locallyDismissedDialogs={locallyDismissedDialogs}
        handleAction={onAction}
        cardsDialogPlayerId={cardsDialogPlayerId}
        onCloseCardsDialog={() => setCardsDialogPlayerId(null)}
      />
    </div>
  );
}

    
