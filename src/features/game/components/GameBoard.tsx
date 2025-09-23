

'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameState, Army, CardName } from '@/lib/types';
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
import { ConfirmExitDialog } from '@/features/game/dialogs/ConfirmExitDialog';
import { getPossibleMoves } from '@/lib/actions/movement';
import { cloneDeep } from 'lodash';

const TURN_DURATION = 120; // 2 minutes in seconds

type GameBoardProps = {
    gameId: string;
    onExit: () => void;
};

export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { playerId } = usePlayer();
  const { gameState, setGameState, isMyTurn, localPlayer, isHost, isLoading, globallyRevealedTiles } = useGameEngine(gameId, playerId);
  const { toast, dismiss } = useToast();
  const isMobile = useIsMobile();
  
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [activeInstructionToastId, setActiveInstructionToastId] = useState<string | null>(null);
  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  // --- Local UI State ---
  const [selectedTile, setSelectedTile] = useState<{ x: number, y: number } | null>(null);
  const [selectedArmyId, setSelectedArmyId] = useState<number | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<{ x: number, y: number }[]>([]);
  
  // Pending Action State (local UI)
  type PendingAction = { type: 'teleport', cardName: CardName } | { type: 'scout', cardName: CardName, count: number } | null;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // Dialog Visibility State (local UI)
  const [cardsDialogPlayerId, setCardsDialogPlayerId] = useState<number | null>(null);
  const [abilitiesShopOpen, setAbilitiesShopOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedArmy = useMemo(() => {
    if (!gameState || selectedArmyId === null || !localPlayer) return null;
    return localPlayer.armies.find(a => a.id === selectedArmyId) || null;
  }, [gameState, selectedArmyId, localPlayer]);
  
  const sortedPlayers = useMemo(() => {
    if (!gameState?.players) return [];
    return [...gameState.players].sort((a, b) => a.id - b.id);
  }, [gameState?.players]);


  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);
  
  useEffect(() => {
    if (gameState && gameState.autoSelectArmyFor?.playerId === localPlayer?.id) {
        setSelectedArmyId(gameState.autoSelectArmyFor.armyId);
        // We need to clear this from the state so it doesn't re-trigger on every render
        setGameState(gs => gs ? { ...gs, autoSelectArmyFor: null } : null);
    } else if (!isMyTurn) {
        setSelectedArmyId(null);
        setSelectedTile(null);
        setPossibleMoves([]);
        setPendingAction(null);
        setCardsDialogPlayerId(null);
    }
  }, [isMyTurn, gameState, localPlayer?.id, setGameState]);
  
  useEffect(() => {
    if (selectedArmy && gameState && isMyTurn) {
        const moves = getPossibleMoves(gameState, selectedArmy);
        setPossibleMoves(moves);
        setSelectedTile(selectedArmy.position);
    } else {
        setPossibleMoves([]);
    }
  }, [selectedArmyId, gameState, selectedArmy, isMyTurn]);

  // --- NEW: Local Action Handler ---
  const handleLocalAction = (action: GameAction, payload?: any) => {
    switch(action) {
      case GameAction.DeselectArmy:
        setSelectedArmyId(null);
        setSelectedTile(null);
        setPossibleMoves([]);
        setPendingAction(null);
        break;
      case GameAction.CancelAction:
        setSelectedArmyId(null);
        setSelectedTile(null);
        setPossibleMoves([]);
        setPendingAction(null);
        // If an action was provisionally marked as used, we need to refund it.
        // This requires a shared state update.
        if (localPlayer?.actionsThisTurn.includes(GameAction.UseCard)) {
            setGameState(gs => {
                if (!gs) return null;
                const player = gs.players[gs.currentPlayerIndex];
                const cardUseIndex = player.actionsThisTurn.indexOf(GameAction.UseCard);
                if (cardUseIndex > -1) {
                    player.actionsThisTurn.splice(cardUseIndex, 1);
                }
                player.hasExtraMove = false;
                return {...gs};
            })
        }
        break;
      case GameAction.ShowCards:
        setCardsDialogPlayerId(prev => prev === payload.playerId ? null : payload.playerId);
        break;
      case GameAction.CloseCards:
        setCardsDialogPlayerId(null);
        break;
      case GameAction.OpenAbilitiesShop:
        setAbilitiesShopOpen(true);
        break;
      case GameAction.CloseAbilitiesShop:
        setAbilitiesShopOpen(false);
        break;
      case GameAction.UseCard:
        // Handle cards that initiate a local UI flow
        if (payload.cardName === CardName.Teleport) {
          setPendingAction({ type: 'teleport', cardName: CardName.Teleport });
        } else if (payload.cardName === CardName.Scout) {
          setPendingAction({ type: 'scout', cardName: CardName.Scout, count: 3 });
        } else {
          // For cards with immediate shared effects
          onAction(action, payload);
        }
        break;
      default:
        console.warn("Unhandled local action:", action);
    }
  }
  
  // --- REFACTORED: Shared Action Handler ---
  const onAction = useCallback(async (action: GameAction, payload?: any) => {
    if (isPerformingAction) return;

    if (!isMyTurn && ![GameAction.ShowCards, GameAction.CloseCards].includes(action)) {
      toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
      return;
    }
    
    try {
        setIsPerformingAction(true);
        await setGameState((currentGameState) => {
            if (!currentGameState || !localPlayer) return currentGameState;
            return handleGameAction({
                action,
                gameState: currentGameState,
                payload
            });
        });

    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsPerformingAction(false);
    }
  }, [isPerformingAction, isMyTurn, toast, setGameState, localPlayer]);
  
  const handleTileClick = async (x: number, y: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing' || isPerformingAction) return;

    // Handle pending Scout action
    if (pendingAction?.type === 'scout') {
      const tileId = `${x}-${y}`;
      if (!localPlayer?.revealedTiles.includes(tileId)) {
        await setGameState(gs => {
          if(!gs) return null;
          const player = gs.players[gs.currentPlayerIndex];
          player.revealedTiles.push(tileId);
          gs.log.push(`${player.name} revealed a tile at (${x},${y}) with Scout.`);
          return {...gs};
        });
        const newCount = pendingAction.count - 1;
        if (newCount <= 0) {
          setPendingAction(null);
           await onAction(GameAction.UseCard, { cardName: pendingAction.cardName }); // Consume card
        } else {
          setPendingAction({ ...pendingAction, count: newCount });
        }
      }
      return;
    }

    // Handle pending Teleport action
    if (pendingAction?.type === 'teleport') {
      if (selectedArmyId !== null) {
        // Step 2: Army is selected, now select destination
        await onAction(GameAction.Move, { army: selectedArmy, x, y });
        await onAction(GameAction.UseCard, { cardName: pendingAction.cardName }); // Consume card
        setPendingAction(null);
        setSelectedArmyId(null);
      } else {
        // Step 1: No army selected, select one now
        const armiesOnTile = gameState.map[y * MAP_COLS + x].occupants
            .filter(o => o.playerId === localPlayer?.id)
            .map(o => localPlayer?.armies.find(a => a.id === o.armyId))
            .filter((army): army is Army => !!army);

        if (armiesOnTile.length === 1) {
          setSelectedArmyId(armiesOnTile[0].id);
        } else if (armiesOnTile.length > 1) {
          // Open selection dialog (This part would need a local dialog state)
        }
      }
      return;
    }
    
    // Default tile click logic (move or select)
    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);
    if (selectedArmy && isPossibleMove) {
        await onAction(GameAction.Move, { army: selectedArmy, x, y });
        setSelectedArmyId(null); // Deselect after move
    } else {
        const armiesOnTile = gameState.map[y * MAP_COLS + x].occupants
            .filter(o => o.playerId === localPlayer?.id)
            .map(o => localPlayer?.armies.find(a => a.id === o.armyId))
            .filter((army): army is Army => !!army);

        if (armiesOnTile.length === 1) {
            setSelectedArmyId(armiesOnTile[0].id);
        } else {
            setSelectedArmyId(null);
            // open army selection dialog
        }
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
                if (isMyTurn) { 
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
    
    if (isMyTurn && pendingAction?.type === 'teleport') {
      if (selectedArmyId === null) {
        const { id } = toast({ title: 'Teleport: Step 1', description: 'Select an army on the map to teleport.' });
        setActiveInstructionToastId(id);
      } else {
        const { id } = toast({ title: 'Teleport: Step 2', description: 'Now, select any destination tile on the map.' });
        setActiveInstructionToastId(id);
      }
    } else if (isMyTurn && pendingAction?.type === 'scout') {
        const { id } = toast({ title: 'Scout Activated', description: `Click a hidden tile to reveal it. ${pendingAction.count} reveals remaining.` });
        setActiveInstructionToastId(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, selectedArmyId, isMyTurn]);

   useEffect(() => {
    if (gameState?.status === 'playing') {
        const winner = gameState.players.find(p => p.victoryPoints >= gameState.settings.victoryPointGoal);
        if (winner && !gameState.winner) {
            setGameState(gs => gs ? { ...gs, winner: cloneDeep(winner), status: 'finished' } : null);
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
        handleConfirmHostLeaveGame();
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

  if (isLoading || !gameState || !localPlayer) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, log, status, maxPlayers, winner, settings, deathAnimations, map, debugMode } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const canStartGame = status === 'waiting' && isHost && players.length > 1;
  const isTeleporting = pendingAction?.type === 'teleport';
  const isScouting = pendingAction?.type === 'scout';

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
                        {status === 'playing' && <Button variant="outline" size="icon" onClick={handleExitClick} disabled={isExiting}>
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
                    {sortedPlayers.map(p => (
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
                      possibleMoves={isTeleporting && selectedArmyId !== null ? map.map(t => ({x: t.x, y: t.y})) : possibleMoves} 
                      selectedTile={selectedTile} 
                      isTeleporting={isTeleporting}
                      isScoutTarget={isScouting}
                      deathAnimations={deathAnimations}
                      fogOfWar={settings.fogOfWar}
                      localPlayer={localPlayer}
                      globallyRevealedTiles={globallyRevealedTiles}
                      debugMode={debugMode}
                  />
                  <div className='pointer-events-none absolute bottom-4 right-4 z-20 rounded-lg bg-background/80 p-2 text-center shadow-md backdrop-blur-sm'>
                      {status === 'waiting' ? (
                      <p className='text-base font-semibold text-accent sm:text-lg'>Waiting for players... ({players.length}/{maxPlayers})</p>
                      ) : (
                      <>
                          {isTeleporting && isMyTurn ? (
                              <div className="flex flex-col items-center gap-2">
                                  <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                      {selectedArmyId === null ? 'Teleport: Select an army to move' : 'Teleport: Select a destination'}
                                  </p>
                              </div>
                          ) : isScouting && isMyTurn ? (
                              <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                  Scout: Reveal a hidden tile ({pendingAction?.count} remaining)
                                  </p>
                          ) : (
                              <>
                                  <p className='text-base font-semibold sm:text-lg'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                              </>
                          )}
                      </>
                      )}
                  </div>
                </main>
                <aside className="flex flex-col justify-start gap-4">
                <ActionsPanel 
                    onAction={onAction} 
                    handleLocalAction={handleLocalAction}
                    localPlayer={localPlayer}
                    gameState={gameState} 
                    isMyTurn={isMyTurn && status === 'playing'}
                    timeLeft={timeLeft}
                    turnDuration={TURN_DURATION}
                    selectedArmy={selectedArmy}
                    pendingAction={pendingAction}
                    cardsDialogPlayerId={cardsDialogPlayerId}
                    abilitiesShopOpen={abilitiesShopOpen}
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
        handleSharedAction={onAction}
        cardsDialogPlayerId={cardsDialogPlayerId}
        onCloseCardsDialog={() => handleLocalAction(GameAction.CloseCards)}
        abilitiesShopOpen={abilitiesShopOpen}
        onCloseAbilitiesShop={() => handleLocalAction(GameAction.CloseAbilitiesShop)}
      />
    </div>
  );
}
