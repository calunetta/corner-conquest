
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameState, Army, CardName } from '@/lib/types';
import type { PendingAction, ArmySelectionDialogState, AttackSelectionDialogState, PositionDialogState, SabotageDialogState, WealthyDialogState, StealResourceDialogState, ProductiveCardDialogState, SpecialIslandRollDialogState } from '../types';
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
import { handleGameAction, handlePlayerExit } from '@/lib/actions';
import { startGame } from '@/lib/game-initializer';
import { useIsMobile } from '@/hooks/use-is-mobile';
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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
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
  const [attackSelectionDialog, setAttackSelectionDialog] = useState<AttackSelectionDialogState>(null);
  const [positionDialog, setPositionDialog] = useState<PositionDialogState>(null);
  const [sabotageDialog, setSabotageDialog] = useState<SabotageDialogState>(null);
  const [wealthyDialog, setWealthyDialog] = useState<WealthyDialogState>(null);
  const [stealResourceDialog, setStealResourceDialog] = useState<StealResourceDialogState>(null);
  const [productiveCardDialog, setProductiveCardDialog] = useState<ProductiveCardDialogState>(null);
  const [specialIslandRollDialog, setSpecialIslandRollDialog] = useState<SpecialIslandRollDialogState>(null);

  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [showHostLeaveDialog, setShowHostLeaveDialog] = useState(false);

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

  // This effect clears local state when the turn changes
  useEffect(() => {
    if (!isMyTurn) {
        setSelectedArmyId(null);
        setPossibleMoves([]);
        setPendingAction(null);
        setCardsDialogPlayerId(null);
        setAbilitiesShopOpen(false);
        setArmySelectionDialog(null);
        setAttackSelectionDialog(null);
        setPositionDialog(null);
        setSabotageDialog(null);
        setWealthyDialog(null);
        setStealResourceDialog(null);
        setProductiveCardDialog(null);
        setSpecialIslandRollDialog(null);
    } else {
        // Auto-select army if it's my turn and I only have one
        if (localPlayer?.armies.length === 1 && selectedArmyId === null) {
            setSelectedArmyId(localPlayer.armies[0].id);
        }
    }
  }, [isMyTurn, localPlayer]);
  
  useEffect(() => {
    if (selectedArmy && gameState && isMyTurn) {
        const moves = getPossibleMoves(gameState, selectedArmy);
        setPossibleMoves(moves);
    } else {
        setPossibleMoves([]);
    }
  }, [selectedArmy, gameState, isMyTurn]);

  // Unified action handler for all actions, delegating to local or shared handlers.
  const onAction = useCallback(async (action: GameAction, payload?: any) => {
    if (isPerformingAction) return;

    const allowedOffTurnActions = [GameAction.CombatRoll, GameAction.CloseCombat, GameAction.MonsterCombatRoll, GameAction.CloseMonsterCombat, GameAction.RollOnSpecialIsland, GameAction.CloseSpecialIslandDialog];
    if (!isMyTurn && !allowedOffTurnActions.includes(action)) {
        toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
        return;
    }
    
    try {
        setIsPerformingAction(true);
        const result = await setGameState(gs => handleGameAction({ action, gameState: gs, payload }));

        // Handle UI side-effects returned from actions (e.g. opening dialogs)
        if (result?.newAttackSelectionDialogState) {
          setAttackSelectionDialog(result.newAttackSelectionDialogState);
        }
        if (result?.specialIslandRoll) {
            setSpecialIslandRollDialog({ isOpen: true, roll: result.specialIslandRoll.roll, cardDrawn: result.specialIslandRoll.cardDrawn });
        }

    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsPerformingAction(false);
    }
  }, [isPerformingAction, isMyTurn, toast, setGameState]);

  const handleLocalAction = useCallback(async (action: GameAction, payload?: any) => {
      switch(action) {
          case GameAction.local_DeselectArmy:
              setSelectedArmyId(null);
              setPendingAction(null); // Deselection should cancel any pending action
              break;
          case GameAction.local_CancelAction:
              if(pendingAction) {
                  setPendingAction(null);
              } else if (localPlayer?.hasExtraMove) {
                  await onAction(GameAction.CancelAction); // Dispatch shared action to clear flags
              }
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
              const { army } = payload;
              const tile = gameState?.map[army.position.y * gameState.settings.gridSize.cols + army.position.x];
              const availableResources = tile?.resources.filter(resource => !(tile.positionedBy || []).some(p => p.resource === resource.type));
              if (availableResources && availableResources.length > 0) {
                  setPositionDialog({ x: army.position.x, y: army.position.y, resources: availableResources, armyId: army.id });
              } else {
                  toast({ title: "No available spots", description: "All resource spots on this island are occupied.", variant: "destructive" });
              }
              break;
          case GameAction.local_UseCard:
              const { cardName } = payload;
              if (!localPlayer?.specialCards.includes(cardName)) {
                  toast({ title: "Card not found", description: `You do not have the ${cardName} card.`, variant: "destructive" });
                  return;
              }
              if (localPlayer.actionsThisTurn.includes(GameAction.UseCard)) {
                  toast({ title: "Action not allowed", description: "You can only use one card per turn.", variant: "destructive" });
                  return;
              }
              
              if (cardName === CardName.Teleport) {
                  setPendingAction({ type: 'teleport', cardName });
                  setSelectedArmyId(null);
              } else if (cardName === CardName.Scout) {
                  setPendingAction({ type: 'scout', cardName, count: 3 });
              } else if (cardName === CardName.Sabotage) {
                  setSabotageDialog({ isOpen: true });
              } else if (cardName === CardName.Wealthy) {
                  setWealthyDialog({ isOpen: true });
              } else if (cardName === CardName.StealResource) {
                  setStealResourceDialog({ isOpen: true });
              } else {
                   await onAction(GameAction.UseCard, payload); // For cards with immediate effects
              }
              break;
          default:
              console.warn("Unhandled local action:", action);
      }
  }, [gameState, localPlayer, onAction, pendingAction, toast]);
  
  const handleTileClick = async (x: number, y: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing' || isPerformingAction) return;

    // --- Local Pending Action Handling (Scout, Teleport) ---
    if (pendingAction?.type === 'scout') {
      const tileId = `${x}-${y}`;
      if (!localPlayer?.revealedTiles.includes(tileId)) {
        await onAction(GameAction.Scout, { x, y }); // Dispatch shared action to update revealed tiles
        const newCount = pendingAction.count - 1;
        if (newCount <= 0) {
          await onAction(GameAction.UseCard, { cardName: pendingAction.cardName, isScout: true }); // Consume the card
          setPendingAction(null);
        } else {
          setPendingAction({ ...pendingAction, count: newCount });
        }
      }
      return;
    }

    if (pendingAction?.type === 'teleport') {
      if (selectedArmyId !== null && selectedArmy) {
        await onAction(GameAction.Move, { army: selectedArmy, x, y, isTeleport: true });
        setPendingAction(null);
        setSelectedArmyId(null);
      } else {
        const armiesOnTile = localPlayer?.armies.filter(a => a.position.x === x && a.position.y === y) ?? [];
        if (armiesOnTile.length === 1) {
          setSelectedArmyId(armiesOnTile[0].id);
        } else if (armiesOnTile.length > 1) {
          setArmySelectionDialog({ armies: armiesOnTile, x, y });
        }
      }
      return;
    }
    
    // --- Standard Tile Click Logic (Move or Select) ---
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
            setSelectedArmyId(null);
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
  }, [isMyTurn, gameState?.status, gameState?.turn, onAction]);
  
   useEffect(() => {
    if (gameState?.status === 'finished' && timerRef.current) {
        clearInterval(timerRef.current);
    }
   }, [gameState?.status]);


   useEffect(() => {
    if (gameState?.status === 'playing') {
        const winner = gameState.players.find(p => p.victoryPoints >= gameState.settings.victoryPointGoal);
        if (winner && !gameState.winner) {
            setGameState(gs => gs ? { ...gs, winner: cloneDeep(winner), status: 'finished' } : null);
        }
    }
   }, [gameState?.players, gameState?.status, gameState?.settings.victoryPointGoal, setGameState]);
   
  const handleStartGame = async () => {
    if (!gameState || !isHost) return;
    const newState = startGame(gameState, localPlayer?.name || 'The host');
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    await setGameState(() => newState);
  };

  const handleExitClick = async () => {
    if (!gameState || !localPlayer) return;

    if (isHost) {
        setShowHostLeaveDialog(true);
        return;
    }

    if (gameState.status === 'playing') {
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
    onExit(); // Navigate back to lobby
    setIsExiting(false);
  };
  
  const handleConfirmHostLeave = async () => {
    setShowHostLeaveDialog(false);
    await handlePlayerExit(gameId, localPlayer!.playerId);
    onExit();
  };

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
                      selectedTile={selectedArmy?.position}
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
                    onLocalAction={handleLocalAction}
                    localPlayer={localPlayer}
                    gameState={gameState} 
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
        isLastPlayer={players.length === 1}
        gameStatus={status}
      />

      <GameDialogs 
        gameState={gameState} 
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
        onCloseProductiveCardDialog={() => setProductiveCardDialog(null)}
        specialIslandRollDialog={specialIslandRollDialog}
        onCloseSpecialIslandRollDialog={() => setSpecialIslandRollDialog(null)}
      />
    </div>
  );
}
