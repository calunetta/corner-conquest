'use client';

import React from 'react';
import type { CardName } from '@/lib/types';
import { GameAction, ResourceType } from '@/lib/types';
import { useGameBoard } from '../context/GameBoardContext';

import { CombatDialog } from '../dialogs/CombatDialog';
import { MonsterCombatDialog } from '../dialogs/MonsterCombatDialog';
import { ProductiveCardDialog } from '../dialogs/ProductiveCardDialog';
import { SpecialIslandRollDialog } from '../dialogs/SpecialIslandRollDialog';
import { PositionDialog } from '../dialogs/PositionDialog';
import { CardsDialog } from '../dialogs/CardsDialog';
import { StealResourceDialog } from '../dialogs/StealResourceDialog';
import { AbilitiesDialog } from '../dialogs/AbilitiesDialog';
import { SabotageDialog } from '../dialogs/SabotageDialog';
import { WealthyDialog } from '../dialogs/WealthyDialog';
import { ArmySelectionDialog } from '../dialogs/ArmySelectionDialog';
import { AttackSelectionDialog } from '../dialogs/AttackSelectionDialog';
import { MonsterSelectionDialog } from '../dialogs/MonsterSelectionDialog';
import { ConfirmExitDialog } from '../dialogs/ConfirmExitDialog';
import { HostLeaveDialog } from '../dialogs/HostLeaveDialog';

export function GameDialogManager() {
  const {
    uiState,
    dispatch,
    gameState,
    localPlayer,
    isMyTurn,
    onAction,
    onLocalAction,
    handleConfirmExit,
    handleConfirmHostLeave,
  } = useGameBoard();

  const { dialogs, selectedArmyId } = uiState;
  const isProductiveDialogActive = gameState.productiveDialogState?.playerId === localPlayer.id;

  const playerForCardsDialog =
    dialogs.cardsPlayerId !== null ? gameState.players.find(p => p.id === dialogs.cardsPlayerId) : null;
  const isViewingOwnCards = playerForCardsDialog?.id === localPlayer.id;

  const productiveDialogOptions = React.useMemo(() => {
    if (!isProductiveDialogActive || !localPlayer || !gameState) return [];
    const resourceCounts: { resource: ResourceType; amount: number }[] = [];
    for (const pos of localPlayer.positions) {
      const tile = gameState.map[pos.y * gameState.settings.gridSize.cols + pos.x];
      const resourceSpot = tile?.resources.find(r => r.type === pos.resource);
      const amount = resourceSpot?.amount || 1;
      const existing = resourceCounts.find(r => r.resource === pos.resource);
      if (existing) {
        existing.amount += amount;
      } else {
        resourceCounts.push({ resource: pos.resource, amount });
      }
    }
    return resourceCounts;
  }, [isProductiveDialogActive, localPlayer, gameState]);

  return (
    <>
      {dialogs.confirmExit && (
        <ConfirmExitDialog
          onConfirm={handleConfirmExit}
          onClose={() => dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: false })}
        />
      )}

      <HostLeaveDialog
        open={dialogs.hostLeave}
        onClose={() => dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: false })}
        onConfirm={handleConfirmHostLeave}
        isLastPlayer={gameState.players.length <= 1}
        gameStatus={gameState.status}
      />

      {/* SHARED DIALOGS */}
      {gameState.combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={payload => onAction(GameAction.CombatRoll, payload)}
          onClose={() => onAction(GameAction.CloseCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {gameState.monsterCombatState && (
        <MonsterCombatDialog
          gameState={gameState}
          onRoll={payload => onAction(GameAction.MonsterCombatRoll, payload)}
          onClose={() => onAction(GameAction.CloseMonsterCombat)}
          onCancel={() => onAction(GameAction.CloseMonsterCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {isMyTurn && isProductiveDialogActive && (
        <ProductiveCardDialog
          state={{ isOpen: true, options: productiveDialogOptions }}
          onConfirm={selectedResource => {
            onAction(GameAction.UseProductiveCard, { selectedResource });
          }}
        />
      )}

      {isMyTurn && dialogs.specialIslandRoll?.isOpen && (
        <SpecialIslandRollDialog
          state={dialogs.specialIslandRoll}
          onRoll={async () => {
            const roll = Math.floor(Math.random() * 6) + 1;
            let cardDrawn: CardName | null = null;
            if (roll === 3 || roll === 6) {
              const currentDeck = gameState?.specialCardsDeck || [];
              const currentDiscard = gameState?.discardPile || [];
              if (currentDeck.length > 0) {
                cardDrawn = currentDeck[0];
              } else if (currentDiscard.length > 0) {
                cardDrawn = currentDiscard[0];
              }
              await onAction(GameAction.RollOnSpecialIsland, { roll });
            }
            dispatch({
              type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG',
              state: { ...dialogs.specialIslandRoll!, roll, cardDrawn },
            });
          }}
          onClose={() => dispatch({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: null })}
        />
      )}

      {/* LOCAL DIALOGS */}
      {isMyTurn && (
        <>
          {dialogs.position && (
            <PositionDialog
              resources={dialogs.position.resources}
              onSelect={resource => {
                onAction(GameAction.SelectResourcePosition, { resource, armyId: dialogs.position!.armyId });
                dispatch({ type: 'SET_POSITION_DIALOG', state: null });
              }}
              onClose={() => dispatch({ type: 'SET_POSITION_DIALOG', state: null })}
            />
          )}

          {dialogs.armySelection && (
            <ArmySelectionDialog
              state={dialogs.armySelection}
              player={localPlayer}
              selectedArmyId={selectedArmyId}
              onSelectArmy={armyId => {
                if (selectedArmyId === armyId) {
                  dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
                } else {
                  dispatch({ type: 'SET_SELECTED_ARMY', armyId });
                }
                dispatch({ type: 'SET_ARMY_SELECTION_DIALOG', state: null });
              }}
              onClose={() => dispatch({ type: 'SET_ARMY_SELECTION_DIALOG', state: null })}
              isMyTurn={isMyTurn}
            />
          )}

          {dialogs.attackSelection && (
            <AttackSelectionDialog
              state={dialogs.attackSelection}
              onSelectTarget={defenderArmyId => {
                if (dialogs.attackSelection) {
                  onAction(GameAction.InitiateCombat, {
                    attackingArmyId: dialogs.attackSelection.attackingArmyId,
                    target: {
                      type: 'player',
                      defenderId: dialogs.attackSelection.defendingPlayer.id,
                      defendingArmyId: defenderArmyId,
                    },
                  });
                }
                dispatch({ type: 'SET_ATTACK_SELECTION_DIALOG', state: null });
              }}
              onClose={() => dispatch({ type: 'SET_ATTACK_SELECTION_DIALOG', state: null })}
              isMyTurn={isMyTurn}
            />
          )}

          {dialogs.monsterSelection && (
            <MonsterSelectionDialog
              state={dialogs.monsterSelection}
              onSelectTarget={monsterName => {
                if (dialogs.monsterSelection) {
                  onAction(GameAction.InitiateCombat, {
                    attackingArmyId: dialogs.monsterSelection.attackingArmyId,
                    target: { type: 'monster', monsterName },
                  });
                }
                dispatch({ type: 'SET_MONSTER_SELECTION_DIALOG', state: null });
              }}
              onClose={() => dispatch({ type: 'SET_MONSTER_SELECTION_DIALOG', state: null })}
              isMyTurn={isMyTurn}
            />
          )}

          {dialogs.abilitiesShopOpen && (
            <AbilitiesDialog
              player={localPlayer}
              onClose={() => dispatch({ type: 'SET_ABILITIES_SHOP_OPEN', open: false })}
              onBuyAbility={abilityName => onAction(GameAction.BuyAbility, { abilityName })}
              gameState={gameState}
              isMyTurn={isMyTurn}
            />
          )}

          {dialogs.stealResource?.isOpen && (
            <StealResourceDialog
              players={gameState.players.filter(p => p.id !== localPlayer.id)}
              onSteal={(target, resource) => {
                onAction(GameAction.StealResource, { targetPlayerId: target, resource });
                dispatch({ type: 'SET_STEAL_RESOURCE_DIALOG', state: null });
                dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
              }}
              onClose={() => {
                dispatch({ type: 'SET_STEAL_RESOURCE_DIALOG', state: null });
                dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
              }}
            />
          )}

          {dialogs.sabotage?.isOpen && (
            <SabotageDialog
              players={gameState.players.filter(p => p.id !== localPlayer.id)}
              onSabotage={targetPlayerId => {
                onAction(GameAction.SabotagePlayer, { targetPlayerId });
                dispatch({ type: 'SET_SABOTAGE_DIALOG', state: null });
                dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
              }}
              onClose={() => {
                dispatch({ type: 'SET_SABOTAGE_DIALOG', state: null });
                dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
              }}
            />
          )}

          {dialogs.wealthy?.isOpen && (
            <WealthyDialog
              onSelectResource={resource => {
                onAction(GameAction.GainWealth, { resource });
                dispatch({ type: 'SET_WEALTHY_DIALOG', state: null });
                dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
              }}
              onClose={() => {
                dispatch({ type: 'SET_WEALTHY_DIALOG', state: null });
                dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
              }}
            />
          )}
        </>
      )}

      {playerForCardsDialog && (
        <CardsDialog
          player={playerForCardsDialog}
          onClose={() => dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: null })}
          onUseCard={(cardName: CardName) => {
            dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: null });
            onLocalAction(GameAction.local_UseCard, { cardName });
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}
    </>
  );
}
