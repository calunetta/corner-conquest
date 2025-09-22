
'use client';
import type { GameState, Player, CardName, AbilityName } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { CombatDialog } from './CombatDialog';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import { PositionDialog } from './PositionDialog';
import { CardsDialog } from './CardsDialog';
import { StealResourceDialog } from './StealResourceDialog';
import { HostLeaveDialog } from './HostLeaveDialog';
import { AbilitiesDialog } from './AbilitiesDialog';
import { SabotageDialog } from './SabotageDialog';
import { WealthyDialog } from './WealthyDialog';
import { CollectDialog } from './CollectDialog';
import { ArmySelectionDialog } from './ArmySelectionDialog';
import { AttackSelectionDialog } from './AttackSelectionDialog';

type GameDialogsProps = {
  gameState: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  onConfirmHostLeave: () => void;
  handleAction: (action: GameAction, payload?: any) => Promise<void>;
  cardsDialogPlayerId: number | null;
  onCloseCardsDialog: () => void;
};

export function GameDialogs({ 
    gameState, 
    localPlayer, 
    isMyTurn, 
    onConfirmHostLeave,
    handleAction,
    cardsDialogPlayerId,
    onCloseCardsDialog
}: GameDialogsProps) {
  const { 
    combatState, 
    monsterCombatState, 
    positionDialogState, 
    collectDialogState,
    stealResourceDialogState, 
    showHostLeaveDialog, 
    abilitiesShopState,
    sabotageDialogState,
    wealthyDialogState,
    armySelectionDialogState,
    attackSelectionDialogState,
    status,
    players
  } = gameState;
  
  const playerForCardsDialog = cardsDialogPlayerId !== null ? players.find(p => p.id === cardsDialogPlayerId) : null;

  return (
    <>
      {combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleAction(GameAction.CombatRoll, { useWarChief })}
          onClose={() => handleAction(GameAction.CloseCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {isMyTurn && monsterCombatState && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={gameState.map[monsterCombatState.attackerPosition.y * gameState.settings.gridSize.cols + monsterCombatState.attackerPosition.x].monsters || []}
          onRoll={(payload) => handleAction(GameAction.MonsterCombatRoll, payload)}
          onClose={() => handleAction(GameAction.CloseMonsterCombat)}
          onCancel={() => handleAction(GameAction.CancelAction)}
        />
      )}

      {isMyTurn && positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleAction(GameAction.SelectResourcePosition, resource)}
          onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}

      {isMyTurn && collectDialogState?.isOpen && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleAction(GameAction.ConfirmCollection, { useProductive })}
            onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}

      {isMyTurn && armySelectionDialogState?.isOpen && (
        <ArmySelectionDialog
            state={armySelectionDialogState}
            player={localPlayer}
            onSelectArmy={(armyId) => handleAction(GameAction.SelectArmy, { armyId })}
            onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}

       {isMyTurn && attackSelectionDialogState?.isOpen && (
        <AttackSelectionDialog
            state={attackSelectionDialogState}
            onSelectTarget={(defenderArmyId) => handleAction(GameAction.SelectDefender, { defenderArmyId, attackingArmyId: attackSelectionDialogState.attackingArmyId })}
            onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}

      {playerForCardsDialog && (
        <CardsDialog 
          player={playerForCardsDialog}
          onClose={onCloseCardsDialog}
          onUseCard={(cardName: CardName) => {
            handleAction(GameAction.UseCard, { cardName });
            onCloseCardsDialog();
          }}
          canUseCards={isMyTurn && playerForCardsDialog.id === localPlayer.id}
        />
      )}

      {isMyTurn && abilitiesShopState?.isOpen && (
        <AbilitiesDialog
          player={localPlayer}
          onClose={() => handleAction(GameAction.CloseAbilitiesShop)}
          onBuyAbility={(abilityName: AbilityName) => handleAction(GameAction.BuyAbility, { abilityName })}
          gameState={gameState}
        />
      )}

      {isMyTurn && stealResourceDialogState && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(target, resource) => handleAction(GameAction.StealResource, {targetPlayerId: target, resource: resource})}
          onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}
      
      {isMyTurn && showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={gameState.players.length === 1}
            onConfirm={onConfirmHostLeave}
            onClose={() => handleAction(GameAction.CancelAction)}
            gameStatus={status}
        />
      )}

      {isMyTurn && sabotageDialogState?.isOpen && (
        <SabotageDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSabotage={(targetPlayerId) => handleAction(GameAction.SabotagePlayer, { targetPlayerId })}
          onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}

      {isMyTurn && wealthyDialogState?.isOpen && (
        <WealthyDialog
          onSelectResource={(resource) => handleAction(GameAction.GainWealth, { resource })}
          onClose={() => handleAction(GameAction.CancelAction)}
        />
      )}
    </>
  );
}

    