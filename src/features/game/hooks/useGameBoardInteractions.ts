'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import type { GameState, Army, CardName, ResourceType } from '@/lib/types';
import { GameAction, IslandType, CardName as CardNameEnum } from '@/lib/types';
import type {
  PendingAction,
  ArmySelectionDialogState,
  AttackSelectionDialogState,
  PositionDialogState,
  SabotageDialogState,
  WealthyDialogState,
  StealResourceDialogState,
  MonsterSelectionDialogState,
  SpecialIslandRollDialogState,
} from '../types';
import { getPossibleMoves } from '@/lib/actions/movement';
import { handleGameAction, handlePlayerExit } from '@/lib/actions';
import { startGame } from '@/lib/game-initializer';
import { useToast } from '@/hooks/use-toast';

interface UseGameBoardInteractionsProps {
  gameId: string;
  playerId: string | null;
  serverGameState: GameState | null;
  localPlayerFromServer: GameState['players'][0] | null;
  isMyTurn: boolean;
  isHost: boolean;
  setGameState: (state: GameState, action: GameAction, payload?: any) => Promise<void>;
  onExit: () => void;
}

export function useGameBoardInteractions({
  gameId,
  playerId,
  serverGameState,
  localPlayerFromServer,
  isMyTurn,
  isHost,
  setGameState,
  onExit,
}: UseGameBoardInteractionsProps) {
  const { toast } = useToast();

  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [selectedArmyId, setSelectedArmyId] = useState<number | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<{ x: number; y: number }[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // Dialog States
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
  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [showHostLeaveDialog, setShowHostLeaveDialog] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

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

  const onAction = useCallback(
    async (action: GameAction, payload?: any) => {
      if (isPerformingAction) return;

      let stateToUpdate = isMyTurn && localGameState ? localGameState : serverGameState;

      if (!stateToUpdate) {
        console.warn(`Attempted to perform action ${action} with no state available. Aborting.`);
        return;
      }

      if (action === GameAction.EndTurn) {
        if (localGameState) {
          await setGameState(localGameState, action, payload);
          setLocalGameState(null);
        }
        return;
      }

      if (action === GameAction.InitiateCombat && payload?.target?.type === 'monster') {
        const result = handleGameAction({ action, gameState: stateToUpdate, payload });
        if (result.state) setLocalGameState(result.state);
        return;
      }

      const realTimeActions: readonly GameAction[] = [
        GameAction.InitiateCombat,
        GameAction.CombatRoll,
        GameAction.CloseCombat,
        GameAction.MonsterCombatRoll,
        GameAction.CloseMonsterCombat,
        GameAction.HostLeave,
        GameAction.CloseSpecialIslandDialog,
        GameAction.RollOnSpecialIsland,
        GameAction.UseProductiveCard,
      ];

      if (realTimeActions.includes(action)) {
        const result = handleGameAction({ action, gameState: stateToUpdate, payload });
        if (result.state) {
          setLocalGameState(result.state);
        }
        await setGameState(stateToUpdate, action, payload);
      } else {
        const result = handleGameAction({ action, gameState: stateToUpdate, payload });
        if (result.state) {
          setLocalGameState(result.state);
        }
      }
    },
    [isPerformingAction, isMyTurn, localGameState, serverGameState, setGameState]
  );

  const handleLocalAction = useCallback(
    (action: GameAction, payload?: any) => {
      if (!localGameState || !isMyTurn) return;

      switch (action) {
        case GameAction.local_DeselectArmy:
          setSelectedArmyId(null);
          break;
        case GameAction.local_CancelAction: {
          const cancelPayload: any = { cardName: payload?.cardName };
          if (!cancelPayload.cardName) {
            if (pendingAction) {
              cancelPayload.cardName = pendingAction.cardName;
            } else if (localPlayer?.reinforceActive) {
              cancelPayload.cardName = CardNameEnum.Reinforce;
            } else if (localPlayer?.efficientActive) {
              cancelPayload.cardName = CardNameEnum.Efficient;
            } else if (localPlayer?.masterBuilderActive) {
              cancelPayload.cardName = CardNameEnum.MasterBuilder;
            } else if (localPlayer?.hasExtraMove) {
              cancelPayload.cardName = CardNameEnum.ExtraMove;
            }
          }
          if (pendingAction?.type === 'scout') cancelPayload.scoutedTiles = pendingAction.scoutedTiles;
          setPendingAction(null);
          onAction(GameAction.CancelAction, cancelPayload);
          break;
        }
        case GameAction.local_ShowCards:
          setCardsDialogPlayerId(prev => (prev === payload.playerId ? null : payload.playerId));
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
        case GameAction.local_Attack: {
          if (!localGameState || !localPlayer) return;
          const { army } = payload;
          if (!army) return;

          const currentTile = localGameState.map[army.position.y * localGameState.settings.gridSize.cols + army.position.x];
          const otherPlayersOccupants = currentTile.occupants.filter(o => o.playerId !== localPlayer.id);
          const monsters = currentTile.monsters || [];

          if (otherPlayersOccupants.length > 0) {
            const defenderPlayer = localGameState.players.find(p => p.id === otherPlayersOccupants[0].playerId);
            if (!defenderPlayer) return;
            const defendingArmies = otherPlayersOccupants
              .map(o => defenderPlayer.armies.find(a => a.id === o.armyId))
              .filter((a): a is Army => !!a);

            if (defendingArmies.length === 1) {
              onAction(GameAction.InitiateCombat, {
                attackingArmyId: army.id,
                target: { type: 'player', defenderId: defenderPlayer.id, defendingArmyId: defendingArmies[0].id },
              });
            } else {
              setAttackSelectionDialog({ attackingArmyId: army.id, defendingPlayer: defenderPlayer, armies: defendingArmies });
            }
          } else if (monsters.length > 0) {
            if (monsters.length === 1) {
              onAction(GameAction.InitiateCombat, { attackingArmyId: army.id, target: { type: 'monster', monsterName: monsters[0].name } });
            } else {
              setMonsterSelectionDialog({ attackingArmyId: army.id, monsters });
            }
          }
          break;
        }
        case GameAction.local_Position: {
          if (!gameStateForDisplay) return;
          const { army: posArmy } = payload;
          const tile = gameStateForDisplay.map[posArmy.position.y * gameStateForDisplay.settings.gridSize.cols + posArmy.position.x];
          const availableResources = tile?.resources.filter(
            resource => !(tile.positionedBy || []).some(p => p.resource === resource.type)
          );
          if (availableResources && availableResources.length > 0) {
            setPositionDialog({ x: posArmy.position.x, y: posArmy.position.y, resources: availableResources, armyId: posArmy.id });
          } else {
            toast({ title: 'No available spots', description: 'All resource spots on this island are occupied.', variant: 'destructive' });
          }
          break;
        }
        case GameAction.local_UseCard: {
          try {
            const { cardName } = payload;
            const player = localGameState.players[localGameState.currentPlayerIndex];

            if (!player.specialCards.includes(cardName)) {
              throw new Error(`You do not have the ${cardName} card.`);
            }
            if (player.actionsThisTurn.includes(GameAction.UseCard)) {
              throw new Error('You can only use one card per turn.');
            }

            const multiStepCards: CardName[] = ['Scout', 'Sabotage', 'Wealthy', 'Steal Resource'];
            const result = handleGameAction({ action: GameAction.UseCard, gameState: localGameState, payload: { cardName } });

            if (result.state) {
              setLocalGameState(result.state);

              if (multiStepCards.includes(cardName)) {
                setPendingAction({
                  type: cardName.toLowerCase().replace(/ /g, '-') as any,
                  cardName,
                  ...(cardName === 'Scout' ? { count: 3, scoutedTiles: [] } : {}),
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
        }
        default:
          console.warn('Unhandled local action:', action);
      }
    },
    [localGameState, onAction, pendingAction, toast, isMyTurn, gameStateForDisplay, localPlayer]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArmyId !== null) {
          handleLocalAction(GameAction.local_DeselectArmy);
        } else if (
          pendingAction ||
          localPlayer?.reinforceActive ||
          localPlayer?.efficientActive ||
          localPlayer?.masterBuilderActive ||
          localPlayer?.hasExtraMove
        ) {
          handleLocalAction(GameAction.local_CancelAction);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArmyId, pendingAction, handleLocalAction, localPlayer]);

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
        const unactedArmies = armiesOnClickedTile;
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

  const handleStartGame = async () => {
    if (!serverGameState || !isHost) return;
    toast({ title: 'Game Started!', description: 'Let the conquest begin!' });
    const startedGame = startGame(serverGameState, localPlayer?.name || 'The host');
    setGameState(startedGame, GameAction.EndTurn, {});
  };

  const handleConfirmExit = async () => {
    setShowConfirmExitDialog(false);
    if (!localPlayerFromServer) return;
    setIsExiting(true);
    try {
      await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    } catch (error) {
      console.error('Error exiting game:', error);
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
      console.error('Error host leaving game:', error);
    } finally {
      onExit();
    }
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

  return {
    gameStateForDisplay,
    localPlayer,
    selectedArmy,
    selectedArmyId,
    setSelectedArmyId,
    possibleMoves,
    pendingAction,
    setPendingAction,
    isExiting,
    onAction,
    handleLocalAction,
    handleTileClick,
    handleStartGame,
    handleExitClick,
    handleConfirmExit,
    handleConfirmHostLeave,
    // Dialog states & setters
    cardsDialogPlayerId,
    setCardsDialogPlayerId,
    abilitiesShopOpen,
    setAbilitiesShopOpen,
    armySelectionDialog,
    setArmySelectionDialog,
    attackSelectionDialog,
    setAttackSelectionDialog,
    monsterSelectionDialog,
    setMonsterSelectionDialog,
    positionDialog,
    setPositionDialog,
    sabotageDialog,
    setSabotageDialog,
    wealthyDialog,
    setWealthyDialog,
    stealResourceDialog,
    setStealResourceDialog,
    specialIslandRollDialog,
    setSpecialIslandRollDialog,
    showConfirmExitDialog,
    setShowConfirmExitDialog,
    showHostLeaveDialog,
    setShowHostLeaveDialog,
  };
}
