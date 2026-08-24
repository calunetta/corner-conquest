'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import type { GameState, Army, CardName, ResourceType, Player } from '@/lib/types';
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
import { useTurnTimer } from '../hooks/useTurnTimer';
import { useToast } from '@/hooks/use-toast';

// --- State Types ---
export interface GameBoardUIState {
  selectedArmyId: number | null;
  possibleMoves: { x: number; y: number }[];
  pendingAction: PendingAction;
  isPerformingAction: boolean;
  isExiting: boolean;
  dialogs: {
    cardsPlayerId: number | null;
    abilitiesShopOpen: boolean;
    armySelection: ArmySelectionDialogState;
    attackSelection: AttackSelectionDialogState | null;
    monsterSelection: MonsterSelectionDialogState | null;
    position: PositionDialogState;
    sabotage: SabotageDialogState;
    wealthy: WealthyDialogState;
    stealResource: StealResourceDialogState;
    specialIslandRoll: SpecialIslandRollDialogState;
    confirmExit: boolean;
    hostLeave: boolean;
  };
}

const initialUIState: GameBoardUIState = {
  selectedArmyId: null,
  possibleMoves: [],
  pendingAction: null,
  isPerformingAction: false,
  isExiting: false,
  dialogs: {
    cardsPlayerId: null,
    abilitiesShopOpen: false,
    armySelection: null,
    attackSelection: null,
    monsterSelection: null,
    position: null,
    sabotage: null,
    wealthy: null,
    stealResource: null,
    specialIslandRoll: null,
    confirmExit: false,
    hostLeave: false,
  },
};

// --- Action Types ---
export type GameBoardUIAction =
  | { type: 'SET_SELECTED_ARMY'; armyId: number | null; possibleMoves?: { x: number; y: number }[] }
  | { type: 'SET_POSSIBLE_MOVES'; possibleMoves: { x: number; y: number }[] }
  | { type: 'SET_PENDING_ACTION'; pendingAction: PendingAction }
  | { type: 'SET_PERFORMING_ACTION'; isPerforming: boolean }
  | { type: 'SET_EXITING'; isExiting: boolean }
  | { type: 'TOGGLE_CARDS_DIALOG'; playerId: number | null }
  | { type: 'SET_ABILITIES_SHOP_OPEN'; open: boolean }
  | { type: 'SET_ARMY_SELECTION_DIALOG'; state: ArmySelectionDialogState }
  | { type: 'SET_ATTACK_SELECTION_DIALOG'; state: AttackSelectionDialogState | null }
  | { type: 'SET_MONSTER_SELECTION_DIALOG'; state: MonsterSelectionDialogState | null }
  | { type: 'SET_POSITION_DIALOG'; state: PositionDialogState }
  | { type: 'SET_SABOTAGE_DIALOG'; state: SabotageDialogState }
  | { type: 'SET_WEALTHY_DIALOG'; state: WealthyDialogState }
  | { type: 'SET_STEAL_RESOURCE_DIALOG'; state: StealResourceDialogState }
  | { type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG'; state: SpecialIslandRollDialogState }
  | { type: 'SET_CONFIRM_EXIT_DIALOG'; open: boolean }
  | { type: 'SET_HOST_LEAVE_DIALOG'; open: boolean }
  | { type: 'RESET_TURN_UI' };

// --- Reducer ---
export function gameBoardReducer(state: GameBoardUIState, action: GameBoardUIAction): GameBoardUIState {
  switch (action.type) {
    case 'SET_SELECTED_ARMY':
      return {
        ...state,
        selectedArmyId: action.armyId,
        possibleMoves: action.possibleMoves !== undefined ? action.possibleMoves : state.possibleMoves,
      };
    case 'SET_POSSIBLE_MOVES':
      return {
        ...state,
        possibleMoves: action.possibleMoves,
      };
    case 'SET_PENDING_ACTION':
      return {
        ...state,
        pendingAction: action.pendingAction,
      };
    case 'SET_PERFORMING_ACTION':
      return {
        ...state,
        isPerformingAction: action.isPerforming,
      };
    case 'SET_EXITING':
      return {
        ...state,
        isExiting: action.isExiting,
      };
    case 'TOGGLE_CARDS_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          cardsPlayerId: state.dialogs.cardsPlayerId === action.playerId ? null : action.playerId,
        },
      };
    case 'SET_ABILITIES_SHOP_OPEN':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          abilitiesShopOpen: action.open,
        },
      };
    case 'SET_ARMY_SELECTION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          armySelection: action.state,
        },
      };
    case 'SET_ATTACK_SELECTION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          attackSelection: action.state,
        },
      };
    case 'SET_MONSTER_SELECTION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          monsterSelection: action.state,
        },
      };
    case 'SET_POSITION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          position: action.state,
        },
      };
    case 'SET_SABOTAGE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          sabotage: action.state,
        },
      };
    case 'SET_WEALTHY_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          wealthy: action.state,
        },
      };
    case 'SET_STEAL_RESOURCE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          stealResource: action.state,
        },
      };
    case 'SET_SPECIAL_ISLAND_ROLL_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          specialIslandRoll: action.state,
        },
      };
    case 'SET_CONFIRM_EXIT_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          confirmExit: action.open,
        },
      };
    case 'SET_HOST_LEAVE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          hostLeave: action.open,
        },
      };
    case 'RESET_TURN_UI':
      return {
        ...initialUIState,
      };
    default:
      return state;
  }
}

// --- Context Definition ---
export interface GameBoardContextType {
  uiState: GameBoardUIState;
  dispatch: React.Dispatch<GameBoardUIAction>;
  gameState: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  isHost: boolean;
  selectedArmy: Army | null;
  turnTimer: {
    timeLeft: number;
    formattedTime: string;
    turnDuration: number;
    isExpiring: boolean;
    percentage: number;
  };
  onAction: (action: GameAction, payload?: any) => Promise<void>;
  onLocalAction: (action: GameAction, payload?: any) => void;
  handleTileClick: (x: number, y: number) => Promise<void>;
  handleStartGame: () => Promise<void>;
  handleExitClick: () => Promise<void>;
  handleConfirmExit: () => Promise<void>;
  handleConfirmHostLeave: () => Promise<void>;
}

const GameBoardContext = createContext<GameBoardContextType | null>(null);

export function useGameBoard(): GameBoardContextType {
  const context = useContext(GameBoardContext);
  if (!context) {
    throw new Error('useGameBoard must be used within a GameBoardProvider');
  }
  return context;
}

// --- Provider Component ---
interface GameBoardProviderProps {
  children: React.ReactNode;
  gameId: string;
  playerId: string | null;
  serverGameState: GameState;
  localPlayerFromServer: Player;
  isMyTurn: boolean;
  isHost: boolean;
  setGameState: (state: GameState, action: GameAction, payload?: any) => Promise<void>;
  onExit: () => void;
}

export function GameBoardProvider({
  children,
  gameId,
  playerId,
  serverGameState,
  localPlayerFromServer,
  isMyTurn,
  isHost,
  setGameState,
  onExit,
}: GameBoardProviderProps) {
  const { toast } = useToast();
  const [uiState, dispatch] = useReducer(gameBoardReducer, initialUIState);
  const [localGameState, setLocalGameState] = React.useState<GameState | null>(null);

  const gameStateForDisplay = isMyTurn && localGameState ? localGameState : serverGameState;

  const localPlayer = useMemo(() => {
    if (!gameStateForDisplay || !playerId) return localPlayerFromServer;
    return gameStateForDisplay.players.find(p => p.playerId === playerId) || localPlayerFromServer;
  }, [gameStateForDisplay, playerId, localPlayerFromServer]);

  useEffect(() => {
    if (isMyTurn && serverGameState && !localGameState) {
      setLocalGameState(cloneDeep(serverGameState));
    } else if (!isMyTurn && localGameState) {
      setLocalGameState(null);
    }
  }, [isMyTurn, serverGameState, localGameState]);

  const selectedArmy = useMemo(() => {
    if (!gameStateForDisplay || uiState.selectedArmyId === null || !localPlayer) return null;
    const player = gameStateForDisplay.players.find(p => p.id === localPlayer.id);
    return player?.armies.find(a => a.id === uiState.selectedArmyId) || null;
  }, [gameStateForDisplay, uiState.selectedArmyId, localPlayer]);

  // Reset local UI dialogs and army selection when turn ends
  useEffect(() => {
    if (!isMyTurn) {
      dispatch({ type: 'RESET_TURN_UI' });
    }
  }, [isMyTurn]);

  // Recalculate possible moves when selectedArmy changes
  useEffect(() => {
    if (selectedArmy && gameStateForDisplay && isMyTurn) {
      const moves = getPossibleMoves(gameStateForDisplay, selectedArmy);
      dispatch({ type: 'SET_POSSIBLE_MOVES', possibleMoves: moves });
    } else {
      dispatch({ type: 'SET_POSSIBLE_MOVES', possibleMoves: [] });
    }
  }, [selectedArmy, gameStateForDisplay, isMyTurn]);

  const onAction = useCallback(
    async (action: GameAction, payload?: any) => {
      if (uiState.isPerformingAction) return;

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
    [uiState.isPerformingAction, isMyTurn, localGameState, serverGameState, setGameState]
  );

  const handleLocalAction = useCallback(
    (action: GameAction, payload?: any) => {
      if (!localGameState || !isMyTurn) return;

      switch (action) {
        case GameAction.local_DeselectArmy:
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
          break;
        case GameAction.local_CancelAction: {
          const cancelPayload: any = { cardName: payload?.cardName };
          if (!cancelPayload.cardName) {
            if (uiState.pendingAction) {
              cancelPayload.cardName = uiState.pendingAction.cardName;
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
          if (uiState.pendingAction?.type === 'scout') cancelPayload.scoutedTiles = uiState.pendingAction.scoutedTiles;
          dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
          onAction(GameAction.CancelAction, cancelPayload);
          break;
        }
        case GameAction.local_ShowCards:
          dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: payload.playerId });
          break;
        case GameAction.local_CloseCards:
          dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: null });
          break;
        case GameAction.local_OpenAbilitiesShop:
          dispatch({ type: 'SET_ABILITIES_SHOP_OPEN', open: true });
          break;
        case GameAction.local_CloseAbilitiesShop:
          dispatch({ type: 'SET_ABILITIES_SHOP_OPEN', open: false });
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
              dispatch({
                type: 'SET_ATTACK_SELECTION_DIALOG',
                state: { attackingArmyId: army.id, defendingPlayer: defenderPlayer, armies: defendingArmies },
              });
            }
          } else if (monsters.length > 0) {
            if (monsters.length === 1) {
              onAction(GameAction.InitiateCombat, { attackingArmyId: army.id, target: { type: 'monster', monsterName: monsters[0].name } });
            } else {
              dispatch({ type: 'SET_MONSTER_SELECTION_DIALOG', state: { attackingArmyId: army.id, monsters } });
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
            dispatch({
              type: 'SET_POSITION_DIALOG',
              state: { x: posArmy.position.x, y: posArmy.position.y, resources: availableResources, armyId: posArmy.id },
            });
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

            if (cardName === 'Teleport') {
              dispatch({
                type: 'SET_PENDING_ACTION',
                pendingAction: {
                  type: 'teleport',
                  cardName: 'Teleport',
                },
              });
              toast({
                title: 'Teleport Activated',
                description: 'Select an army (or keep selected), then choose any destination island to teleport!',
              });
              break;
            }

            const multiStepCards: CardName[] = ['Scout', 'Sabotage', 'Wealthy', 'Steal Resource'];
            const result = handleGameAction({ action: GameAction.UseCard, gameState: localGameState, payload: { cardName } });

            if (result.state) {
              setLocalGameState(result.state);

              if (multiStepCards.includes(cardName)) {
                dispatch({
                  type: 'SET_PENDING_ACTION',
                  pendingAction: {
                    type: cardName.toLowerCase().replace(/ /g, '-') as any,
                    cardName,
                    ...(cardName === 'Scout' ? { count: 3, scoutedTiles: [] } : {}),
                  },
                });
                dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });

                if (cardName === 'Sabotage') dispatch({ type: 'SET_SABOTAGE_DIALOG', state: { isOpen: true } });
                else if (cardName === 'Wealthy') dispatch({ type: 'SET_WEALTHY_DIALOG', state: { isOpen: true } });
                else if (cardName === 'Steal Resource') dispatch({ type: 'SET_STEAL_RESOURCE_DIALOG', state: { isOpen: true } });
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
    [localGameState, onAction, uiState.pendingAction, toast, isMyTurn, gameStateForDisplay, localPlayer]
  );

  // Keyboard Escape Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (uiState.selectedArmyId !== null) {
          handleLocalAction(GameAction.local_DeselectArmy);
        } else if (
          uiState.pendingAction ||
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
  }, [uiState.selectedArmyId, uiState.pendingAction, handleLocalAction, localPlayer]);

  const handleTileClick = async (x: number, y: number) => {
    if (!gameStateForDisplay || !isMyTurn || gameStateForDisplay.status !== 'playing' || uiState.isPerformingAction || !localPlayer) return;

    if (uiState.pendingAction?.type === 'scout') {
      const tileId = `${x}-${y}`;
      if (!localPlayer.revealedTiles.includes(tileId)) {
        await onAction(GameAction.Scout, { x, y });
        const newCount = (uiState.pendingAction.count || 1) - 1;
        const newScouted = [...uiState.pendingAction.scoutedTiles, tileId];
        if (newCount <= 0) {
          dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
          await onAction(GameAction.UseCard, { cardName: 'Scout', isScout: true });
        } else {
          dispatch({
            type: 'SET_PENDING_ACTION',
            pendingAction: { ...uiState.pendingAction, count: newCount, scoutedTiles: newScouted },
          });
        }
      }
      return;
    }

    if (uiState.pendingAction?.type === 'teleport') {
      const myArmiesOnTile = localPlayer.armies.filter(a => a.position.x === x && a.position.y === y);
      if (myArmiesOnTile.length > 0 && (!selectedArmy || (selectedArmy.position.x === x && selectedArmy.position.y === y))) {
        if (myArmiesOnTile.length === 1) {
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: myArmiesOnTile[0].id });
        } else {
          dispatch({ type: 'SET_ARMY_SELECTION_DIALOG', state: { armies: myArmiesOnTile, x, y } });
        }
      } else if (selectedArmy) {
        const targetTile = gameStateForDisplay.map[y * gameStateForDisplay.settings.gridSize.cols + x];
        if (targetTile.type === IslandType.Base && targetTile.owner !== localPlayer.id) {
          toast({ title: 'Invalid Teleport', description: "Cannot teleport onto an opponent's base island.", variant: 'destructive' });
          return;
        }
        await onAction(GameAction.Move, { army: selectedArmy, x, y, isTeleport: true });
        dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
        dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
      }
      return;
    }

    const isPossibleMove = uiState.possibleMoves.some(p => p.x === x && p.y === y);
    if (selectedArmy && isPossibleMove) {
      const targetTile = gameStateForDisplay.map[y * gameStateForDisplay.settings.gridSize.cols + x];
      const isRevealedSpecial = targetTile.type === IslandType.Special && localPlayer.revealedTiles.includes(targetTile.id);
      await onAction(GameAction.Move, { army: selectedArmy, x, y });
      dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
      if (isRevealedSpecial) {
        dispatch({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: { isOpen: true, roll: null, cardDrawn: null } });
      }
    } else {
      const armiesOnTile = localPlayer.armies.filter(a => a.position.x === x && a.position.y === y) ?? [];

      if (armiesOnTile.length === 1) {
        if (uiState.selectedArmyId === armiesOnTile[0].id) {
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
        } else {
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: armiesOnTile[0].id });
        }
      } else if (armiesOnTile.length > 1) {
        dispatch({ type: 'SET_ARMY_SELECTION_DIALOG', state: { armies: armiesOnTile, x, y } });
      } else {
        if (uiState.pendingAction) {
          onAction(GameAction.CancelAction, { cardName: (uiState.pendingAction as NonNullable<PendingAction>).cardName });
        }
        dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
        dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
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
    dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: false });
    if (!localPlayerFromServer) return;
    dispatch({ type: 'SET_EXITING', isExiting: true });
    try {
      await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    } catch (error) {
      console.error('Error exiting game:', error);
    } finally {
      onExit();
      dispatch({ type: 'SET_EXITING', isExiting: false });
    }
  };

  const handleConfirmHostLeave = async () => {
    dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: false });
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
      dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: true });
      return;
    }

    if (serverGameState.status === 'playing') {
      dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: true });
    } else {
      await handleConfirmExit();
    }
  };

  const turnTimer = useTurnTimer({
    isMyTurn,
    gameStatus: serverGameState?.status || '',
    onAction,
  });

  const contextValue: GameBoardContextType = {
    uiState,
    dispatch,
    gameState: gameStateForDisplay,
    localPlayer,
    isMyTurn,
    isHost,
    selectedArmy,
    turnTimer,
    onAction,
    onLocalAction: handleLocalAction,
    handleTileClick,
    handleStartGame,
    handleExitClick,
    handleConfirmExit,
    handleConfirmHostLeave,
  };

  return <GameBoardContext.Provider value={contextValue}>{children}</GameBoardContext.Provider>;
}
