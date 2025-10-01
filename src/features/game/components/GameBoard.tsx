

'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameState, Army, Monster } from '@/lib/types';
import type { PendingAction, ArmySelectionDialogState, AttackSelectionDialogState, PositionDialogState, SabotageDialogState, WealthyDialogState, StealResourceDialogState, MonsterSelectionDialogState } from '../types';
import { GameAction, CardName, IslandType, MAP_COLS } from '@/lib/types';
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
    localPlayer: localPlayerFromServer, 
    isHost, 
    isLoading 
  } = useGameEngine(gameId, playerId);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [selectedArmyId, setSelectedArmyId] = useState<number | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<{ x: number, y: number }[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  
  const [cardsDialogPlayerId, setCardsDialogPlayerId] = useState<number | null>(null);
  const [abilitiesShopOpen, setAbilitiesShopOpen] = useState(false);
  const [armySelectionDialog, setArmySelectionDialog] = useState<ArmySelectionDialogState>(null);
  const [attackSelectionDialog, setAttackSelectionDialog] = useState<AttackSelectionDialogState | null>(null);
  const [monsterSelectionDialog, setMonsterSelectionDialog] = useState<MonsterSelectionDialogState | null>(null);
  const [positionDialog, setPositionDialog] = useState<PositionDialogState>(null);
  const [sabotageDialog, setSabotageDialog] = useState<SabotageDialogState>(null);
  const [wealthyDialog, setWealthyDialog] = useState<WealthyDialogState>(null);
  const [stealResourceDialog, setStealResourceDialog] = useState<StealResourceDialogState>(null);


  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [showHostLeaveDialog, setShowHostLeaveDialog] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const gameStateForDisplay = isMyTurn && localGameState ? localGameState : serverGameState;
  
  const localPlayer = useMemo(() => {
    if (!gameStateForDisplay || !playerId) return null;
    return gameStateForDisplay.players.find(p => p.playerId === playerId) || null;
  }, [gameStateForDisplay, playerId]);

  useEffect(() => {
    if (isMyTurn && serverGameState && !localGameState) {
        let localCopy = cloneDeep(serverGameState);
        
        if (localCopy.players[localCopy.currentPlayerIndex]?.dialogState?.productiveCard?.isOpen) {
             // Defer creating local state until productive dialog is handled
        } else {
            setLocalGameState(localCopy);
        }
    } else if (!isMyTurn && localGameState) {
        setLocalGameState(null);
    }
  }, [isMyTurn, serverGameState, localGameState]);

  const productiveCardDialog = gameStateForDisplay?.players.find(p => p.id === gameStateForDisplay.currentPlayerIndex)?.dialogState?.productiveCard;
  const specialIslandRollDialog = gameStateForDisplay?.players.find(p => p.id === gameStateForDisplay.currentPlayerIndex)?.dialogState?.specialIslandRoll;

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

  useEffect(() => {
    if (!isMyTurn) {
        setSelectedArmyId(null);
        setPendingAction(null);
        setCardsDialogPlayerId(null);
        setAbilitiesShopOpen(false);
        setArmySelectionDialog(null);
        setAttackSelectionDialog(null);
        setMonsterSelectionDialog(null);
        setPositionDialog(null);
        setSabotageDialog(null);
        setWealthyDialog(null);
        setStealResourceDialog(null);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (selectedArmy && gameStateForDisplay && isMyTurn) {
        const moves = getPossibleMoves(gameStateForDisplay, selectedArmy);
        setPossibleMoves(moves);
    } else {
        setPossibleMoves([]);
    }
  }, [selectedArmy, gameStateForDisplay, isMyTurn]);

  const onAction = useCallback(async (action: GameAction, payload?: any) => {
    if (isPerformingAction) return;

    const serverActions = [
        GameAction.CombatRoll, GameAction.CloseCombat, GameAction.MonsterCombatRoll, 
        GameAction.CloseMonsterCombat, GameAction.EndTurn, GameAction.InitiateCombat,
        GameAction.HostLeave, GameAction.CloseSpecialIslandDialog, GameAction.RollOnSpecialIsland, GameAction.UseProductiveCard,
    ];
    
    const isServerAction = serverActions.includes(action);

    if (action === GameAction.EndTurn) {
        if (localGameState) {
            await setGameState(localGameState, action, payload);
            setLocalGameState(null); // Clear local state after ending turn
        }
        return;
    }
    
    const stateToUpdate = isMyTurn ? localGameState : serverGameState;

    if (!stateToUpdate) {
        console.warn(`Attempted to perform action ${action} with no state available. Aborting.`);
        return;
    }
    
    if (isServerAction) {
        await setGameState(stateToUpdate, action, payload);
    } else {
        const result = handleGameAction({ action, gameState: stateToUpdate, payload });
        if (result.state) {
            setLocalGameState(result.state);
        }
    }
  }, [isPerformingAction, isMyTurn, toast, setGameState, localGameState, serverGameState]);


  const handleLocalAction = useCallback((action: GameAction, payload?: any) => {
      if (!localGameState || !isMyTurn) return;
      
      switch(action) {
          case GameAction.local_DeselectArmy:
              setSelectedArmyId(null);
              if (pendingAction) {
                  onAction(GameAction.CancelAction, { cardName: pendingAction.cardName });
              }
              setPendingAction(null);
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
          case GameAction.local_Attack:
              const { army } = payload;
              if (!army || !localPlayer) return;
              
              const currentTile = localGameState.map[army.position.y * MAP_COLS + army.position.x];
              const otherPlayersOccupants = currentTile.occupants.filter(o => o.playerId !== localPlayer.id);
              const monsters = currentTile.monsters || [];

              if (otherPlayersOccupants.length > 0) {
                  const defenderPlayer = localGameState.players.find(p => p.id === otherPlayersOccupants[0].playerId);
                  if (!defenderPlayer) return;
                  const defendingArmies = otherPlayersOccupants.map(o => defenderPlayer.armies.find(a => a.id === o.armyId)).filter((a): a is Army => !!a);

                  if (defendingArmies.length === 1) {
                      onAction(GameAction.InitiateCombat, { attackingArmyId: army.id, target: { type: 'player', defenderId: defenderPlayer.id, defendingArmyId: defendingArmies[0].id } });
                  } else {
                      setAttackSelectionDialog({ attackingArmyId: army.id, defendingPlayer: defenderPlayer, armies: defendingArmies });
                  }
              } else if (monsters.length > 0) {
                  if (monsters.length === 1) {
                      onAction(GameAction.InitiateCombat, { attackingArmyId: army.id, target: { type: 'monster', monsterName: monsters[0].name } });
                  } else {
                      setMonsterSelectionDialog({ attackingArmyId: army.id, monsters: monsters });
                  }
              }
              break;
          case GameAction.local_Position:
              if (!gameStateForDisplay) return;
              const { army: posArmy } = payload;
              const tile = gameStateForDisplay.map[posArmy.position.y * gameStateForDisplay.settings.gridSize.cols + posArmy.position.x];
              const availableResources = tile?.resources.filter(resource => !(tile.positionedBy || []).some(p => p.resource === resource.type));
              if (availableResources && availableResources.length > 0) {
                  setPositionDialog({ x: posArmy.position.x, y: posArmy.position.y, resources: availableResources, armyId: posArmy.id });
              } else {
                  toast({ title: "No available spots", description: "All resource spots on this island are occupied.", variant: "destructive" });
              }
              break;
          case GameAction.local_UseCard:
            try {
              const { cardName } = payload;
              const player = localGameState.players[localGameState.currentPlayerIndex];
              
              if (!player.specialCards.includes(cardName)) {
                  throw new Error(`You do not have the ${cardName} card.`);
              }
              if (player.actionsThisTurn.includes(GameAction.UseCard)) {
                  throw new Error("You can only use one card per turn.");
              }
              
              const multiStepCards = [CardName.Teleport, CardName.Scout, CardName.Sabotage, CardName.Wealthy, CardName.StealResource];
              
              const result = handleGameAction({ action: GameAction.UseCard, gameState: localGameState, payload: { cardName } });
              
              if (result.state) {
                  setLocalGameState(result.state);

                  if (multiStepCards.includes(cardName)) {
                      setPendingAction({ type: cardName.toLowerCase().replace(/ /g, '-') as any, cardName });
                      setSelectedArmyId(null);
                      
                      if (cardName === CardName.Sabotage) setSabotageDialog({ isOpen: true });
                      else if (cardName === CardName.Wealthy) setWealthyDialog({ isOpen: true });
                      else if (cardName === CardName.StealResource) setStealResourceDialog({ isOpen: true });
                  }
              }
            } catch (error: any) {
                toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
            }
            break;
          default:
              console.warn("Unhandled local action:", action);
      }
  }, [localGameState, onAction, pendingAction, toast, isMyTurn, gameStateForDisplay, localPlayer]);
  
  const handleTileClick = async (x: number, y: number) => {
    if (!gameStateForDisplay || !isMyTurn || gameStateForDisplay.status !== 'playing' || isPerformingAction || !localPlayer) return;

    if (pendingAction?.type === 'scout') {
      const tileId = `${x}-${y}`;
      if (!localPlayer.revealedTiles.includes(tileId)) {
        await onAction(GameAction.Scout, { x, y });
        const newCount = (pendingAction as any).count - 1;
        if (newCount <= 0) {
          setPendingAction(null);
          // Now officially consume the card
          await onAction(GameAction.UseCard, { cardName: CardName.Scout, isScout: true });
        } else {
          setPendingAction({ ...pendingAction, count: newCount });
        }
      }
      return;
    }

    if (pendingAction?.type === 'teleport') {
        if(selectedArmyId === null) {
            const armiesOnClickedTile = localPlayer.armies.filter(a => a.position.x === x && a.position.y === y);
            const unactedArmies = armiesOnClickedTile; // Teleport can move any army
            if (unactedArmies.length === 1) {
              setSelectedArmyId(unactedArmies[0].id);
            } else if (unactedArmies.length > 1) {
              setArmySelectionDialog({ armies: unactedArmies, x, y });
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
        const armiesOnTile = localPlayer.armies.filter(a => a.position.x === x && a.position.y === y) ?? [];

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
            const finalState = { ...serverGameState, winner: cloneDeep(winner), status: 'finished' as const };
            setGameState(finalState, GameAction.EndTurn, {});
        }
    }
   }, [serverGameState, setGameState]);
   
  const handleStartGame = async () => {
    if (!serverGameState || !isHost) return;
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    const startedGame = startGame(serverGameState, localPlayer?.name || 'The host');
    setGameState(startedGame, GameAction.EndTurn, {}); // Using EndTurn as a generic update action
  };

  const handleExitClick = async () => {
    if (!serverGameState || !localPlayerFromServer) return;

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
    if (!localPlayerFromServer) return;
    setIsExiting(true);
    await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    onExit();
    setIsExiting(false);
  };
  
  const handleConfirmHostLeave = async () => {
    setShowHostLeaveDialog(false);
    if (!localPlayerFromServer) return;
    await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    onExit();
  };

  if (isLoading || !serverGameState || !localPlayerFromServer || !gameStateForDisplay || !localPlayer) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayerFromServer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { status, maxPlayers, winner, deathAnimations } = serverGameState;
  
  const { players, currentPlayerIndex, turn, settings, map, debugMode, log } = gameStateForDisplay;
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
                    localPlayer={localPlayer}
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
            if (pendingAction?.type === 'teleport') {
                // If we were waiting to select an army for teleport, now we are waiting for a destination.
                // handleTileClick will handle the rest.
            }
        }}
        attackSelectionDialog={attackSelectionDialog}
        onCloseAttackSelectionDialog={() => setAttackSelectionDialog(null)}
        onSelectDefender={(defenderArmyId) => {
             if (attackSelectionDialog) {
                onAction(GameAction.InitiateCombat, {
                    attackingArmyId: attackSelectionDialog.attackingArmyId,
                    target: { 
                        type: 'player', 
                        defenderId: attackSelectionDialog.defendingPlayer.id, 
                        defendingArmyId: defenderArmyId 
                    }
                });
             }
             setAttackSelectionDialog(null);
        }}
        monsterSelectionDialog={monsterSelectionDialog}
        onCloseMonsterSelectionDialog={() => setMonsterSelectionDialog(null)}
        onSelectMonster={(monsterName) => {
            if (monsterSelectionDialog) {
                onAction(GameAction.InitiateCombat, {
                    attackingArmyId: monsterSelectionDialog.attackingArmyId,
                    target: { type: 'monster', monsterName }
                });
            }
            setMonsterSelectionDialog(null);
        }}
        positionDialog={positionDialog}
        onClosePositionDialog={() => setPositionDialog(null)}
        sabotageDialog={sabotageDialog}
        onCloseSabotageDialog={() => { setSabotageDialog(null); setPendingAction(null); }}
        wealthyDialog={wealthyDialog}
        onCloseWealthyDialog={() => { setWealthyDialog(null); setPendingAction(null); }}
        stealResourceDialog={stealResourceDialog}
        onCloseStealResourceDialog={() => { setStealResourceDialog(null); setPendingAction(null); }}
        productiveCardDialog={productiveCardDialog}
        specialIslandRollDialog={specialIslandRollDialog}
      />
    </div>
  );
}

    