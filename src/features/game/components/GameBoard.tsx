

'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Army, CardName, ResourceType } from '@/lib/types';
import type { PendingAction, ArmySelectionDialogState, AttackSelectionDialogState, PositionDialogState, SabotageDialogState, WealthyDialogState, StealResourceDialogState, MonsterSelectionDialogState, SpecialIslandRollDialogState } from '../types';
import { GameAction, IslandType } from '@/lib/types';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from '@/features/game/panels/PlayerInfo';
import { ActionsPanel } from '@/features/game/panels/ActionsPanel';
import { GameLog } from '@/features/game/panels/GameLog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Loader2, ArrowLeft, Play, Trophy, HelpCircle } from 'lucide-react';
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
import { CombatDialog } from '../dialogs/CombatDialog';
import { MonsterCombatDialog } from '../dialogs/MonsterCombatDialog';
import { PositionDialog } from '../dialogs/PositionDialog';
import { CardsDialog } from '../dialogs/CardsDialog';
import { StealResourceDialog } from '../dialogs/StealResourceDialog';
import { AbilitiesDialog } from '../dialogs/AbilitiesDialog';
import { SabotageDialog } from '../dialogs/SabotageDialog';
import { WealthyDialog } from '../dialogs/WealthyDialog';
import { ArmySelectionDialog } from '../dialogs/ArmySelectionDialog';
import { AttackSelectionDialog } from '../dialogs/AttackSelectionDialog';
import { MonsterSelectionDialog } from '../dialogs/MonsterSelectionDialog';
import { ProductiveCardDialog } from '../dialogs/ProductiveCardDialog';
import { SpecialIslandRollDialog } from '../dialogs/SpecialIslandRollDialog';
import { TutorialBeacon } from './TutorialBeacon';

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
  const [specialIslandRollDialog, setSpecialIslandRollDialog] = useState<SpecialIslandRollDialogState>(null);

  const isProductiveDialogActive = serverGameState?.productiveDialogState?.playerId === localPlayerFromServer?.id;
  const productiveDialogOptions = useMemo(() => {
    if (!isProductiveDialogActive || !localPlayerFromServer || !serverGameState) return [];
    const resourceCounts: { resource: ResourceType; amount: number }[] = [];
    const baseAmount = serverGameState.settings.baseResourceAmount;
    resourceCounts.push({ resource: 'gems' as ResourceType, amount: baseAmount });
    resourceCounts.push({ resource: 'iron' as ResourceType, amount: baseAmount });
    resourceCounts.push({ resource: 'wheat' as ResourceType, amount: baseAmount });
    for (const pos of localPlayerFromServer.positions) {
      const existing = resourceCounts.find(r => r.resource === pos.resource);
      if (existing) {
        existing.amount += 1;
      } else {
        resourceCounts.push({ resource: pos.resource, amount: 1 });
      }
    }
    return resourceCounts;
  }, [isProductiveDialogActive, localPlayerFromServer, serverGameState]);

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
      setLocalGameState(cloneDeep(serverGameState));
    } else if (!isMyTurn && localGameState) {
      setLocalGameState(null);
    }
  }, [isMyTurn, serverGameState, localGameState]);

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
      setSpecialIslandRollDialog(null);
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

    let stateToUpdate = isMyTurn && localGameState ? localGameState : serverGameState;

    if (!stateToUpdate) {
      console.warn(`Attempted to perform action ${action} with no state available. Aborting.`);
      return;
    }

    // Server actions are batched at the end of the turn
    if (action === GameAction.EndTurn) {
      if (localGameState) {
        await setGameState(localGameState, action, payload);
        setLocalGameState(null);
      }
      return;
    }

    // For monster combat, we need to update local state first to show the dialog
    if (action === GameAction.InitiateCombat && payload?.target?.type === 'monster') {
      const result = handleGameAction({ action, gameState: stateToUpdate, payload });
      if (result.state) setLocalGameState(result.state);
      return;
    }

    const realTimeActions: readonly GameAction[] = [
      GameAction.InitiateCombat, // Only for PvP
      GameAction.CombatRoll, GameAction.CloseCombat, GameAction.MonsterCombatRoll,
      GameAction.CloseMonsterCombat, GameAction.HostLeave,
      GameAction.CloseSpecialIslandDialog, GameAction.RollOnSpecialIsland, GameAction.UseProductiveCard,
    ];

    if (realTimeActions.includes(action)) {
      const result = handleGameAction({ action, gameState: stateToUpdate, payload });
      if (result.state) {
        setLocalGameState(result.state);
      }
      await setGameState(stateToUpdate, action, payload);
    } else { // Local actions
      const result = handleGameAction({ action, gameState: stateToUpdate, payload });
      if (result.state) {
        setLocalGameState(result.state);
      }
    }
  }, [isPerformingAction, isMyTurn, localGameState, serverGameState, setGameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArmyId !== null) {
          handleLocalAction(GameAction.local_DeselectArmy);
        } else if (pendingAction || localPlayer?.reinforceActive || localPlayer?.efficientActive || localPlayer?.masterBuilderActive || localPlayer?.hasExtraMove) {
          handleLocalAction(GameAction.local_CancelAction);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArmyId, pendingAction, onAction]);


  const handleLocalAction = useCallback((action: GameAction, payload?: any) => {
    if (!localGameState || !isMyTurn) return;

    switch (action) {
      case GameAction.local_DeselectArmy:
        setSelectedArmyId(null);
        break;
      case GameAction.local_CancelAction:
        const cancelPayload: any = { cardName: payload?.cardName };
        if (!cancelPayload.cardName) {
          if (pendingAction) {
            cancelPayload.cardName = pendingAction.cardName;
          } else if (localPlayer?.reinforceActive) {
            cancelPayload.cardName = CardName.Reinforce;
          } else if (localPlayer?.efficientActive) {
            cancelPayload.cardName = CardName.Efficient;
          } else if (localPlayer?.masterBuilderActive) {
            cancelPayload.cardName = CardName.MasterBuilder;
          } else if (localPlayer?.hasExtraMove) {
            cancelPayload.cardName = CardName.ExtraMove;
          }
        }
        if (pendingAction?.type === 'scout') cancelPayload.scoutedTiles = pendingAction.scoutedTiles;
        setPendingAction(null);
        onAction(GameAction.CancelAction, cancelPayload);
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
        if (!localGameState || !localPlayer) return;
        const { army } = payload;
        if (!army) return;

        const currentTile = localGameState.map[army.position.y * localGameState.settings.gridSize.cols + army.position.x];
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

          const multiStepCards: CardName[] = ['Scout', 'Sabotage', 'Wealthy', 'Steal Resource'];

          const result = handleGameAction({ action: GameAction.UseCard, gameState: localGameState, payload: { cardName } });

          if (result.state) {
            setLocalGameState(result.state);

            if (multiStepCards.includes(cardName)) {
              setPendingAction({
                type: cardName.toLowerCase().replace(/ /g, '-') as any,
                cardName,
                ...(cardName === 'Scout' ? { count: 3, scoutedTiles: [] } : {})
              });
              setSelectedArmyId(null);

              if (cardName === 'Sabotage') setSabotageDialog({ isOpen: true });
              else if (cardName === 'Wealthy') setWealthyDialog({ isOpen: true });
              else if (cardName === 'Steal Resource') setStealResourceDialog({ isOpen: true });
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
        const newCount = (pendingAction.count || 1) - 1;
        const newScouted = [...pendingAction.scoutedTiles, tileId];
        if (newCount <= 0) {
          setPendingAction(null);
          await onAction(GameAction.UseCard, { cardName: 'Scout', isScout: true });
        } else {
          setPendingAction({ ...pendingAction, count: newCount, scoutedTiles: newScouted });
        }
      }
      return;
    }

    if (pendingAction?.type === 'teleport') {
      if (selectedArmyId === null) {
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
      const targetTile = gameStateForDisplay.map[y * gameStateForDisplay.settings.gridSize.cols + x];
      const isRevealedSpecial = targetTile.type === IslandType.Special && localPlayer.revealedTiles.includes(targetTile.id);
      await onAction(GameAction.Move, { army: selectedArmy, x, y });
      setSelectedArmyId(null);
      if (isRevealedSpecial) {
        setSpecialIslandRollDialog({ isOpen: true, roll: null, cardDrawn: null });
      }
    } else {
      const armiesOnTile = localPlayer.armies.filter(a => a.position.x === x && a.position.y === y) ?? [];

      if (armiesOnTile.length === 1) {
        if (selectedArmyId === armiesOnTile[0].id) {
          setSelectedArmyId(null);
        } else {
          setSelectedArmyId(armiesOnTile[0].id);
        }
      } else if (armiesOnTile.length > 1) {
        setArmySelectionDialog({ armies: armiesOnTile, x, y });
      } else {
        if (pendingAction) {
          onAction(GameAction.CancelAction, { cardName: (pendingAction as NonNullable<PendingAction>).cardName });
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
    setGameState(startedGame, GameAction.EndTurn, {});
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
    try {
      await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    } catch (error) {
      console.error("Error exiting game:", error);
    } finally {
      onExit();
      setIsExiting(false);
    }
  };

  const handleConfirmHostLeave = async () => {
    setShowHostLeaveDialog(false);
    if (!localPlayerFromServer) return;
    try {
      await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    } catch (error) {
      console.error("Error host leaving game:", error);
    } finally {
      onExit();
    }
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
  const playerForCardsDialog = cardsDialogPlayerId !== null ? gameStateForDisplay.players.find(p => p.id === cardsDialogPlayerId) : null;
  const isViewingOwnCards = playerForCardsDialog?.id === localPlayer.id;

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
            <div className="flex items-center justify-between rounded-md bg-black/20 backdrop-blur-md border border-white/10 p-2 shadow-sm">
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
                <TutorialBeacon
                  id="player-info"
                  title="Player Information & Goal"
                  description="This section shows your current resources, VP, and the Victory Point goal to win the game. Gather resources by positioning armies and spend them in the Shop!"
                  side="bottom"
                />
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
                {status === 'waiting' && Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex h-full min-h-24 items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-sm text-muted-foreground sm:min-h-28 sm:text-base">Waiting for player...</div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid flex-1 grid-cols-1 justify-center gap-4 lg:grid-cols-[auto_320px]">
            <main
              className="relative flex items-center justify-center overflow-auto rounded-xl bg-background/20 backdrop-blur-sm border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
            >
              <MapGrid
                map={map}
                players={players}
                onTileClick={handleTileClick}
                possibleMoves={isTeleporting && selectedArmyId !== null ? map.map(t => ({ x: t.x, y: t.y })) : possibleMoves}
                selectedTile={selectedArmy?.position || null}
                isTeleporting={isTeleporting}
                isScoutTarget={isScouting}
                deathAnimations={deathAnimations}
                fogOfWar={settings.fogOfWar}
                localPlayer={localPlayer}
                globallyRevealedTiles={serverGameState.players.reduce((acc, p) => { p.revealedTiles.forEach(t => acc.add(t)); return acc; }, new Set<string>())}
                debugMode={debugMode}
              />
              <div className="absolute top-4 left-4 z-20">
                <TutorialBeacon
                  id="map-info"
                  title="The Map & Movement"
                  description={
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Click an army to select it, then click an adjacent island to move.</li>
                      <li>Move onto Resource Islands and click "Position" to gather resources automatically every turn.</li>
                      <li>Move onto occupied islands or monsters to initiate Combat!</li>
                    </ul>
                  }
                  side="right"
                />
              </div>
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
                        <p className='text-base font-semibold sm:text-lg'>Turn {turn}: <span style={{ color: currentPlayer.color }}>{currentPlayer.name}'s turn</span></p>
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
                <span style={{ color: winner.color }} className="font-bold">{winner.name}</span> wins the game!
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

      {/* SHARED DIALOGS (visible to multiple players) */}
      {gameStateForDisplay.combatState && (
        <CombatDialog
          gameState={gameStateForDisplay}
          onRoll={(payload) => onAction(GameAction.CombatRoll, payload)}
          onClose={() => onAction(GameAction.CloseCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {gameStateForDisplay.monsterCombatState && (
        <MonsterCombatDialog
          gameState={gameStateForDisplay}
          onRoll={(payload) => onAction(GameAction.MonsterCombatRoll, payload)}
          onClose={() => onAction(GameAction.CloseMonsterCombat)}
          onCancel={() => onAction(GameAction.CloseMonsterCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer?.id ?? -1}
        />
      )}

      {isMyTurn && isProductiveDialogActive && (
        <ProductiveCardDialog
          state={{ isOpen: true, options: productiveDialogOptions }}
          onConfirm={(selectedResource) => {
            onAction(GameAction.UseProductiveCard, { selectedResource });
          }}
        />
      )}

      {isMyTurn && specialIslandRollDialog?.isOpen && (
        <SpecialIslandRollDialog
          state={specialIslandRollDialog}
          onRoll={async () => {
            const roll = Math.floor(Math.random() * 6) + 1;
            let cardDrawn: CardName | null = null;
            if (roll === 3 || roll === 6) {
              const currentDeck = gameStateForDisplay?.specialCardsDeck || [];
              const currentDiscard = gameStateForDisplay?.discardPile || [];
              if (currentDeck.length > 0) {
                cardDrawn = currentDeck[0];
              } else if (currentDiscard.length > 0) {
                cardDrawn = currentDiscard[0];
              }
              await onAction(GameAction.RollOnSpecialIsland, { roll });
            }
            setSpecialIslandRollDialog(prev => prev ? { ...prev, roll, cardDrawn } : null);
          }}
          onClose={() => {
            setSpecialIslandRollDialog(null);
          }}
        />
      )}

      {/* LOCAL DIALOGS (visible only to the current player) */}
      {isMyTurn && (
        <>
          {positionDialog && (
            <PositionDialog
              resources={positionDialog.resources}
              onSelect={(resource) => {
                onAction(GameAction.SelectResourcePosition, { resource, armyId: positionDialog.armyId });
                setPositionDialog(null);
              }}
              onClose={() => setPositionDialog(null)}
            />
          )}

          {armySelectionDialog && (
            <ArmySelectionDialog
              state={armySelectionDialog}
              player={localPlayer}
              selectedArmyId={selectedArmyId}
              onSelectArmy={(armyId) => {
                if (selectedArmyId === armyId) {
                  setSelectedArmyId(null);
                } else {
                  setSelectedArmyId(armyId);
                }
                setArmySelectionDialog(null);
                if (pendingAction?.type === 'teleport') {
                  // If we were waiting to select an army for teleport, now we are waiting for a destination.
                  // handleTileClick will handle the rest.
                }
              }}
              onClose={() => setArmySelectionDialog(null)}
              isMyTurn={isMyTurn}
            />
          )}

          {attackSelectionDialog && (
            <AttackSelectionDialog
              state={attackSelectionDialog}
              onSelectTarget={(defenderArmyId) => {
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
              onClose={() => setAttackSelectionDialog(null)}
              isMyTurn={isMyTurn}
            />
          )}

          {monsterSelectionDialog && (
            <MonsterSelectionDialog
              state={monsterSelectionDialog}
              onSelectTarget={(monsterName) => {
                if (monsterSelectionDialog) {
                  onAction(GameAction.InitiateCombat, {
                    attackingArmyId: monsterSelectionDialog.attackingArmyId,
                    target: { type: 'monster', monsterName }
                  });
                }
                setMonsterSelectionDialog(null);
              }}
              onClose={() => setMonsterSelectionDialog(null)}
              isMyTurn={isMyTurn}
            />
          )}

          {abilitiesShopOpen && (
            <AbilitiesDialog
              player={localPlayer}
              onClose={() => setAbilitiesShopOpen(false)}
              onBuyAbility={(abilityName) => onAction(GameAction.BuyAbility, { abilityName })}
              gameState={gameStateForDisplay}
              isMyTurn={isMyTurn}
            />
          )}

          {stealResourceDialog?.isOpen && (
            <StealResourceDialog
              players={gameStateForDisplay.players.filter(p => p.id !== localPlayer.id)}
              onSteal={(target, resource) => {
                onAction(GameAction.StealResource, { targetPlayerId: target, resource: resource });
                setStealResourceDialog(null);
                setPendingAction(null);
              }}
              onClose={() => {
                setStealResourceDialog(null);
                setPendingAction(null);
              }}
            />
          )}

          {sabotageDialog?.isOpen && (
            <SabotageDialog
              players={gameStateForDisplay.players.filter(p => p.id !== localPlayer.id)}
              onSabotage={(targetPlayerId) => {
                onAction(GameAction.SabotagePlayer, { targetPlayerId });
                setSabotageDialog(null);
                setPendingAction(null);
              }}
              onClose={() => {
                setSabotageDialog(null);
                setPendingAction(null);
              }}
            />
          )}

          {wealthyDialog?.isOpen && (
            <WealthyDialog
              onSelectResource={(resource) => {
                onAction(GameAction.GainWealth, { resource });
                setWealthyDialog(null);
                setPendingAction(null);
              }}
              onClose={() => {
                setWealthyDialog(null);
                setPendingAction(null);
              }}
            />
          )}
        </>
      )}

      {playerForCardsDialog && (
        <CardsDialog
          player={playerForCardsDialog}
          onClose={() => setCardsDialogPlayerId(null)}
          onUseCard={(cardName: CardName) => {
            setCardsDialogPlayerId(null);
            handleLocalAction(GameAction.local_UseCard, { cardName });
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}

    </div>
  );
}
