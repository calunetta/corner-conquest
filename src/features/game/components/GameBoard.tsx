
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameState, Army } from '@/lib/types';
import type { PendingAction, ArmySelectionDialogState, AttackSelectionDialogState, PositionDialogState, SabotageDialogState, WealthyDialogState, StealResourceDialogState } from '../types';
import { GameAction, CardName } from '@/lib/types';
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
import { handleGameAction, handlePlayerExit } from '@/lib/actions';
import { startGame } from '@/lib/game-initializer';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ConfirmExitDialog } from '@/features/game/dialogs/ConfirmExitDialog';
import { HostLeaveDialog } from '@/features/game/dialogs/HostLeaveDialog';
import { getPossibleMoves } from '@/lib/actions/movement';
import { cloneDeep } from 'lodash';

const TURN_DURATION = 120; // 2 minutes in seconds

type GameBoardProps = {
    gameId: string;
    onExit: () => void;
};


export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { playerId } = usePlayer();
  const { 
    gameState: serverGameState, 
    setGameState, 
    isMyTurn, 
    localPlayer, 
    isHost, 
    isLoading 
  } = useGameEngine(gameId, playerId);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // --- Local Game State for current player's turn ---
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);

  // --- Global UI State ---
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  // --- Local UI State (Managed entirely on the client) ---
  const [selectedArmyId, setSelectedArmyId] = useState<number | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<{ x: number, y: number }[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  
  // Dialog Visibility State (local UI)
  const [cardsDialogPlayerId, setCardsDialogPlayerId] = useState<number | null>(null);
  const [abilitiesShopOpen, setAbilitiesShopOpen] = useState(false);
  const [armySelectionDialog, setArmySelectionDialog] = useState<ArmySelectionDialogState>(null);
  const [attackSelectionDialog, setAttackSelectionDialog] = useState<AttackSelectionDialogState | null>(null);
  const [positionDialog, setPositionDialog] = useState<PositionDialogState>(null);
  const [sabotageDialog, setSabotageDialog] = useState<SabotageDialogState>(null);
  const [wealthyDialog, setWealthyDialog] = useState<WealthyDialogState>(null);
  const [stealResourceDialog, setStealResourceDialog] = useState<StealResourceDialogState>(null);


  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [showHostLeaveDialog, setShowHostLeaveDialog] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // The GameState to render. Use local state if it's my turn, otherwise use server state.
  const gameStateForDisplay = isMyTurn && localGameState ? localGameState : serverGameState;

  useEffect(() => {
    // When it becomes my turn, create a local copy of the state to modify.
    if (isMyTurn && serverGameState && !localGameState) {
        let localCopy = cloneDeep(serverGameState);
        setLocalGameState(localCopy);
    } else if (!isMyTurn && localGameState) {
        // When it's not my turn, clear the local state.
        setLocalGameState(null);
    }
  }, [isMyTurn, serverGameState, localGameState]);

  const productiveCardDialog = gameStateForDisplay?.players[gameStateForDisplay.currentPlayerIndex]?.dialogState?.productiveCard;
  const specialIslandRollDialog = gameStateForDisplay?.players[gameStateForDisplay.currentPlayerIndex]?.dialogState?.specialIslandRoll;

  const selectedArmy = useMemo(() => {
    if (!gameStateForDisplay || selectedArmyId === null || !localPlayer) return null;
    const player = gameStateForDisplay.players.find(p => p.id === localPlayer.id);
    return player?.armies.find(a => a.id === selectedArmyId) || null;
  }, [gameStateForDisplay, selectedArmyId, localPlayer]);
  
  const sortedPlayers = useMemo(() => {
    if (!gameStateForDisplay?.players) return [];
    return [...gameStateForDisplay.players].sort((a, b) => a.id - b.id);
  }, [gameStateForDisplay?.players]);


  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);

  // This effect clears local UI state when the turn changes
  useEffect(() => {
    if (!isMyTurn) {
        setSelectedArmyId(null);
        setPendingAction(null);
        setCardsDialogPlayerId(null);
        setAbilitiesShopOpen(false);
        setArmySelectionDialog(null);
        setAttackSelectionDialog(null);
        setPositionDialog(null);
        setSabotageDialog(null);
        setWealthyDialog(null);
        setStealResourceDialog(null);
    } else if (localGameState) {
        // Auto-select army if it's my turn and I only have one
        const myArmies = localGameState.players[localGameState.currentPlayerIndex].armies;
        if (myArmies.length === 1 && selectedArmyId === null && myArmies.every(a => !a.hasActed)) {
            setSelectedArmyId(myArmies[0].id);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, localGameState]);

  useEffect(() => {
    if (selectedArmy && gameStateForDisplay && isMyTurn) {
        const moves = getPossibleMoves(gameStateForDisplay, selectedArmy);
        setPossibleMoves(moves);
    } else {
        setPossibleMoves([]);
    }
  }, [selectedArmy, gameStateForDisplay, isMyTurn]);

  // This function now handles both local and server actions
  const onAction = useCallback(async (action: GameAction, payload?: any) => {
    if (isPerformingAction) return;

    // These actions MUST be synchronized in real-time
    const serverActions = [
        GameAction.CombatRoll, GameAction.CloseCombat, GameAction.MonsterCombatRoll, 
        GameAction.CloseMonsterCombat, GameAction.EndTurn, GameAction.SelectDefender, GameAction.Attack,
        GameAction.HostLeave, GameAction.CloseSpecialIslandDialog, GameAction.RollOnSpecialIsland
    ];
    
    if (!isMyTurn && !serverActions.includes(action)) {
        toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
        return;
    }
    
    try {
        setIsPerformingAction(true);
        
        let stateToUpdate = serverActions.includes(action) ? (action === GameAction.EndTurn ? localGameState : serverGameState) : localGameState;
        let isLocalUpdate = !serverActions.includes(action);
        
        if (action === GameAction.CancelAction && localGameState) {
            // CancelAction always acts on the local state first to refund card usage
            stateToUpdate = localGameState;
            isLocalUpdate = true;
        }

        if (!stateToUpdate) {
             console.warn(`Attempted to perform action ${action} with no state available. Aborting.`);
             setIsPerformingAction(false);
             return;
        }

        if (isLocalUpdate) {
             const result = handleGameAction({ action, gameState: stateToUpdate, payload });
             if(result.state) {
                 setLocalGameState(result.state);
             }
        } else {
            const result = await setGameState(stateToUpdate, (gs) => handleGameAction({ action, gameState: gs, payload }));
            if (result?.newAttackSelectionDialogState) {
                setAttackSelectionDialog(result.newAttackSelectionDialogState);
            }
            if(action === GameAction.EndTurn) {
                setLocalGameState(null); // Clear local state after committing turn
            }
        }
    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
        console.error("Action Error:", error);
    } finally {
        setIsPerformingAction(false);
    }
  }, [isPerformingAction, isMyTurn, toast, setGameState, localGameState, serverGameState]);


  const handleLocalAction = useCallback((action: GameAction, payload?: any) => {
      // These actions only affect the local UI, not the game state itself.
      switch(action) {
          case GameAction.local_DeselectArmy:
              setSelectedArmyId(null);
              if (pendingAction) {
                  onAction(GameAction.CancelAction, { cardName: pendingAction.cardName });
                  setPendingAction(null);
              }
              break;
          case GameAction.local_CancelAction:
              setPendingAction(null);
              onAction(GameAction.CancelAction, { cardName: pendingAction?.cardName });
              break;
          case GameAction.local_ShowCards:
              setCardsDialogPlayerId(prev => prev === payload.playerId ? null : payload.playerId);
              break;
          case GameAction.local_CloseCards:
              setCardsDialogPlayerId(null);
              break;
          case GameAction.local_OpenAbilitiesShop:
              setAbilitiesShopOpen(true);
              break;
          case GameAction.local_CloseAbilitiesShop:
              setAbilitiesShopOpen(false);
              break;
          case GameAction.local_Position:
              if (!gameStateForDisplay) return;
              const { army } = payload;
              const tile = gameStateForDisplay.map[army.position.y * gameStateForDisplay.settings.gridSize.cols + army.position.x];
              const availableResources = tile?.resources.filter(resource => !(tile.positionedBy || []).some(p => p.resource === resource.type));
              if (availableResources && availableResources.length > 0) {
                  setPositionDialog({ x: army.position.x, y: army.position.y, resources: availableResources, armyId: army.id });
              } else {
                  toast({ title: "No available spots", description: "All resource spots on this island are occupied.", variant: "destructive" });
              }
              break;
          case GameAction.local_UseCard:
              if (!localGameState) return;
              const { cardName } = payload;
              const currentPlayer = localGameState.players[localGameState.currentPlayerIndex];
              
              if (!currentPlayer.specialCards.includes(cardName)) {
                  toast({ title: "Card not found", description: `You do not have the ${cardName} card.`, variant: "destructive" });
                  return;
              }
              if (currentPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
                  toast({ title: "Action not allowed", description: "You can only use one card per turn.", variant: "destructive" });
                  return;
              }
              
              if (cardName === CardName.Teleport) {
                  setPendingAction({ type: 'teleport', cardName });
                  setSelectedArmyId(null);
                  onAction(GameAction.UseCard, payload);
              } else if (cardName === CardName.Scout) {
                  setPendingAction({ type: 'scout', cardName, count: 3 });
                  onAction(GameAction.UseCard, payload);
              } else if (cardName === CardName.Sabotage) {
                  setSabotageDialog({ isOpen: true });
                  onAction(GameAction.UseCard, payload);
              } else if (cardName === CardName.Wealthy) {
                  setWealthyDialog({ isOpen: true });
                  onAction(GameAction.UseCard, payload);
              } else if (cardName === CardName.StealResource) {
                  setStealResourceDialog({ isOpen: true });
                  onAction(GameAction.UseCard, payload);
              } else {
                   onAction(GameAction.UseCard, payload);
              }
              break;
          default:
              console.warn("Unhandled local action:", action);
      }
  }, [gameStateForDisplay, localGameState, onAction, pendingAction, toast]);
  
  const handleTileClick = async (x: number, y: number) => {
    if (!gameStateForDisplay || !isMyTurn || gameStateForDisplay.status !== 'playing' || isPerformingAction) return;

    if (pendingAction?.type === 'scout') {
      const tileId = `${x}-${y}`;
      if (!localPlayer?.revealedTiles.includes(tileId)) {
        await onAction(GameAction.Scout, { x, y });
        const newCount = pendingAction.count - 1;
        if (newCount <= 0) {
          setPendingAction(null);
        } else {
          setPendingAction({ ...pendingAction, count: newCount });
        }
      }
      return;
    }

    if (pendingAction?.type === 'teleport') {
        if(selectedArmyId === null) {
            const armiesOnClickedTile = localPlayer?.armies.filter(a => a.position.x === x && a.position.y === y) || [];
            const unactedArmies = armiesOnClickedTile.filter(a => !a.hasActed);
            if (unactedArmies.length === 1) {
              setSelectedArmyId(unactedArmies[0].id);
            } else if (unactedArmies.length > 1) {
              setArmySelectionDialog({ armies: unactedArmies, x, y });
            } else {
               toast({ title: 'Army Exhausted', description: 'This army has already acted and cannot be teleported.', variant: 'destructive'});
            }
        } else if (selectedArmy) {
            await onAction(GameAction.Move, { army: selectedArmy, x, y, isTeleport: true });
            setPendingAction(null);
            setSelectedArmyId(null);
        }
        return;
    }
    
    const isPossibleMove = possibleMoves.some(p => p.x === x && p.y === y);
    if (selectedArmy && isPossibleMove) {
        await onAction(GameAction.Move, { army: selectedArmy, x, y });
        setSelectedArmyId(null);
    } else {
        const armiesOnTile = localPlayer?.armies.filter(a => a.position.x === x && a.position.y === y) ?? [];

        if (armiesOnTile.length === 1) {
            setSelectedArmyId(armiesOnTile[0].id);
        } else if (armiesOnTile.length > 1) {
            setArmySelectionDialog({ armies: armiesOnTile, x, y });
        } else {
            if (pendingAction) {
                onAction(GameAction.CancelAction, { cardName: pendingAction.cardName });
            }
            setSelectedArmyId(null);
            setPendingAction(null);
        }
    }
  };
  
  useEffect(() => {
    if (serverGameState?.status === 'playing' && isMyTurn) {
      setTimeLeft(TURN_DURATION); 

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
            if (prevTime <= 1) {
                clearInterval(timerRef.current!);
                onAction(GameAction.EndTurn);
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
  }, [isMyTurn, serverGameState?.status, serverGameState?.turn, onAction]);
  
   useEffect(() => {
    if (serverGameState?.status === 'finished' && timerRef.current) {
        clearInterval(timerRef.current);
    }
   }, [serverGameState?.status]);


   useEffect(() => {
    if (serverGameState?.status === 'playing') {
        const winner = serverGameState.players.find(p => p.victoryPoints >= serverGameState.settings.victoryPointGoal);
        if (winner && !serverGameState.winner) {
            setGameState(serverGameState, (gs) => gs ? { ...gs, winner: cloneDeep(winner), status: 'finished' } : null);
        }
    }
   }, [serverGameState, setGameState]);
   
  const handleStartGame = async () => {
    if (!serverGameState || !isHost) return;
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    await setGameState(serverGameState, (gs) => startGame(gs!, localPlayer?.name || 'The host'));
  };

  const handleExitClick = async () => {
    if (!serverGameState || !localPlayer) return;

    if (isHost) {
        setShowHostLeaveDialog(true);
        return;
    }

    if (serverGameState.status === 'playing') {
        setShowConfirmExitDialog(true);
    } else {
        await handleConfirmExit();
    }
  };

  const handleConfirmExit = async () => {
    setShowConfirmExitDialog(false);
    if (!localPlayer) return;
    setIsExiting(true);
    await handlePlayerExit(gameId, localPlayer.playerId);
    onExit();
    setIsExiting(false);
  };
  
  const handleConfirmHostLeave = async () => {
    setShowHostLeaveDialog(false);
    if (!localPlayer) return;
    await handlePlayerExit(gameId, localPlayer.playerId);
    onExit();
  };

  if (isLoading || !serverGameState || !localPlayer || !gameStateForDisplay) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { status, maxPlayers, winner, deathAnimations } = serverGameState;
  
  const { players, currentPlayerIndex, turn, settings, map, debugMode, log } = gameStateForDisplay;
  const currentPlayer = players[currentPlayerIndex];
  const localPlayerForPanel = players.find(p => p.id === localPlayer.id)!;


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
                        <h1 className="text-xl font-bold sm:text-2xl">{gameStateForDisplay.name}</h1>
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
                      selectedTile={selectedArmy?.position}
                      isTeleporting={isTeleporting}
                      isScoutTarget={isScouting}
                      deathAnimations={deathAnimations}
                      fogOfWar={settings.fogOfWar}
                      localPlayer={localPlayer}
                      globallyRevealedTiles={serverGameState.players.reduce((acc, p) => { p.revealedTiles.forEach(t => acc.add(t)); return acc; }, new Set<string>())}
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
                                  <p className='text-base font-semibold sm:text-lg'>Turn {turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                              </>
                          )}
                      </>
                      )}
                  </div>
                </main>
                <aside className="flex flex-col justify-start gap-4">
                <ActionsPanel 
                    onAction={onAction}
                    onLocalAction={handleLocalAction}
                    localPlayer={localPlayerForPanel}
                    gameState={gameStateForDisplay} 
                    isMyTurn={isMyTurn && status === 'playing'}
                    timeLeft={timeLeft}
                    turnDuration={TURN_DURATION}
                    selectedArmy={selectedArmy}
                    pendingAction={pendingAction}
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
      
      <HostLeaveDialog
        open={showHostLeaveDialog}
        onClose={() => setShowHostLeaveDialog(false)}
        onConfirm={handleConfirmHostLeave}
        isLastPlayer={players.length <= 1}
        gameStatus={status}
      />

      <GameDialogs 
        gameState={gameStateForDisplay}
        localPlayer={localPlayer}
        isMyTurn={isMyTurn}
        onAction={onAction}
        onLocalAction={handleLocalAction}
        cardsDialogPlayerId={cardsDialogPlayerId}
        onCloseCardsDialog={() => setCardsDialogPlayerId(null)}
        abilitiesShopOpen={abilitiesShopOpen}
        onCloseAbilitiesShop={() => setAbilitiesShopOpen(false)}
        armySelectionDialog={armySelectionDialog}
        onCloseArmySelectionDialog={() => setArmySelectionDialog(null)}
        onSelectArmyFromDialog={(armyId) => {
            setSelectedArmyId(armyId);
            setArmySelectionDialog(null);
        }}
        attackSelectionDialog={attackSelectionDialog}
        onCloseAttackSelectionDialog={() => setAttackSelectionDialog(null)}
        positionDialog={positionDialog}
        onClosePositionDialog={() => setPositionDialog(null)}
        sabotageDialog={sabotageDialog}
        onCloseSabotageDialog={() => setSabotageDialog(null)}
        wealthyDialog={wealthyDialog}
        onCloseWealthyDialog={() => setWealthyDialog(null)}
        stealResourceDialog={stealResourceDialog}
        onCloseStealResourceDialog={() => setStealResourceDialog(null)}
        productiveCardDialog={productiveCardDialog}
        specialIslandRollDialog={specialIslandRollDialog}
      />
    </div>
  );
}
