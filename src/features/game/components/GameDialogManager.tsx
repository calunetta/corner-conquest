'use client';

import React from 'react';
import type { GameState, Player, CardName, ResourceType } from '@/lib/types';
import { GameAction } from '@/lib/types';
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

interface GameDialogManagerProps {
  gameState: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  selectedArmyId: number | null;
  pendingAction: PendingAction;
  onAction: (action: GameAction, payload?: any) => void;
  onLocalAction: (action: GameAction, payload?: any) => void;
  setSelectedArmyId: (id: number | null) => void;
  setPendingAction: (action: PendingAction) => void;

  // Dialog States & Setters
  cardsDialogPlayerId: number | null;
  setCardsDialogPlayerId: (id: number | null) => void;
  abilitiesShopOpen: boolean;
  setAbilitiesShopOpen: (open: boolean) => void;
  armySelectionDialog: ArmySelectionDialogState;
  setArmySelectionDialog: (state: ArmySelectionDialogState) => void;
  attackSelectionDialog: AttackSelectionDialogState | null;
  setAttackSelectionDialog: (state: AttackSelectionDialogState | null) => void;
  monsterSelectionDialog: MonsterSelectionDialogState | null;
  setMonsterSelectionDialog: (state: MonsterSelectionDialogState | null) => void;
  positionDialog: PositionDialogState;
  setPositionDialog: (state: PositionDialogState) => void;
  sabotageDialog: SabotageDialogState;
  setSabotageDialog: (state: SabotageDialogState) => void;
  wealthyDialog: WealthyDialogState;
  setWealthyDialog: (state: WealthyDialogState) => void;
  stealResourceDialog: StealResourceDialogState;
  setStealResourceDialog: (state: StealResourceDialogState) => void;
  specialIslandRollDialog: SpecialIslandRollDialogState;
  setSpecialIslandRollDialog: React.Dispatch<React.SetStateAction<SpecialIslandRollDialogState>>;

  // Exit dialogs
  showConfirmExitDialog: boolean;
  setShowConfirmExitDialog: (show: boolean) => void;
  showHostLeaveDialog: boolean;
  setShowHostLeaveDialog: (show: boolean) => void;
  onConfirmExit: () => void | Promise<void>;
  onConfirmHostLeave: () => Promise<void>;
}

export function GameDialogManager({
  gameState,
  localPlayer,
  isMyTurn,
  selectedArmyId,
  pendingAction,
  onAction,
  onLocalAction,
  setSelectedArmyId,
  setPendingAction,
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
  onConfirmExit,
  onConfirmHostLeave,
}: GameDialogManagerProps) {
  const isProductiveDialogActive = gameState.productiveDialogState?.playerId === localPlayer.id;
  const playerForCardsDialog =
    cardsDialogPlayerId !== null ? gameState.players.find(p => p.id === cardsDialogPlayerId) : null;
  const isViewingOwnCards = playerForCardsDialog?.id === localPlayer.id;

  const productiveDialogOptions = React.useMemo(() => {
    if (!isProductiveDialogActive || !localPlayer || !gameState) return [];
    const resourceCounts: { resource: ResourceType; amount: number }[] = [];
    const baseAmount = gameState.settings.baseResourceAmount;
    resourceCounts.push({ resource: 'gems' as ResourceType, amount: baseAmount });
    resourceCounts.push({ resource: 'iron' as ResourceType, amount: baseAmount });
    resourceCounts.push({ resource: 'wheat' as ResourceType, amount: baseAmount });
    for (const pos of localPlayer.positions) {
      const existing = resourceCounts.find(r => r.resource === pos.resource);
      if (existing) {
        existing.amount += 1;
      } else {
        resourceCounts.push({ resource: pos.resource, amount: 1 });
      }
    }
    return resourceCounts;
  }, [isProductiveDialogActive, localPlayer, gameState]);

  return (
    <>
      {showConfirmExitDialog && (
        <ConfirmExitDialog onConfirm={onConfirmExit} onClose={() => setShowConfirmExitDialog(false)} />
      )}

      <HostLeaveDialog
        open={showHostLeaveDialog}
        onClose={() => setShowHostLeaveDialog(false)}
        onConfirm={onConfirmHostLeave}
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

      {isMyTurn && specialIslandRollDialog?.isOpen && (
        <SpecialIslandRollDialog
          state={specialIslandRollDialog}
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
            setSpecialIslandRollDialog(prev => (prev ? { ...prev, roll, cardDrawn } : null));
          }}
          onClose={() => setSpecialIslandRollDialog(null)}
        />
      )}

      {/* LOCAL DIALOGS */}
      {isMyTurn && (
        <>
          {positionDialog && (
            <PositionDialog
              resources={positionDialog.resources}
              onSelect={resource => {
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
              onSelectArmy={armyId => {
                if (selectedArmyId === armyId) {
                  setSelectedArmyId(null);
                } else {
                  setSelectedArmyId(armyId);
                }
                setArmySelectionDialog(null);
              }}
              onClose={() => setArmySelectionDialog(null)}
              isMyTurn={isMyTurn}
            />
          )}

          {attackSelectionDialog && (
            <AttackSelectionDialog
              state={attackSelectionDialog}
              onSelectTarget={defenderArmyId => {
                if (attackSelectionDialog) {
                  onAction(GameAction.InitiateCombat, {
                    attackingArmyId: attackSelectionDialog.attackingArmyId,
                    target: {
                      type: 'player',
                      defenderId: attackSelectionDialog.defendingPlayer.id,
                      defendingArmyId: defenderArmyId,
                    },
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
              onSelectTarget={monsterName => {
                if (monsterSelectionDialog) {
                  onAction(GameAction.InitiateCombat, {
                    attackingArmyId: monsterSelectionDialog.attackingArmyId,
                    target: { type: 'monster', monsterName },
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
              onBuyAbility={abilityName => onAction(GameAction.BuyAbility, { abilityName })}
              gameState={gameState}
              isMyTurn={isMyTurn}
            />
          )}

          {stealResourceDialog?.isOpen && (
            <StealResourceDialog
              players={gameState.players.filter(p => p.id !== localPlayer.id)}
              onSteal={(target, resource) => {
                onAction(GameAction.StealResource, { targetPlayerId: target, resource });
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
              players={gameState.players.filter(p => p.id !== localPlayer.id)}
              onSabotage={targetPlayerId => {
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
              onSelectResource={resource => {
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
            onLocalAction(GameAction.local_UseCard, { cardName });
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}
    </>
  );
}
