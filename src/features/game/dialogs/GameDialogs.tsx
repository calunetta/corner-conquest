
'use client';
import type { GameState, Player, CardName, AbilityName } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { CombatDialog } from './CombatDialog';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import { PositionDialog } from './PositionDialog';
import { CardsDialog } from './CardsDialog';
import { StealResourceDialog } from './StealResourceDialog';
import { UseCardDialog } from './UseCardDialog';
import { HostLeaveDialog } from './HostLeaveDialog';
import { AbilitiesDialog } from './AbilitiesDialog';
import { SabotageDialog } from './SabotageDialog';
import { WealthyDialog } from './WealthyDialog';
import { CollectDialog } from './CollectDialog';
import { ArmySelectionDialog } from './ArmySelectionDialog';
import { AttackSelectionDialog } from './AttackSelectionDialog';
import { MAP_COLS } from '@/lib/game-logic';

type GameDialogsProps = {
  gameState: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  onConfirmHostLeave: () => void;
  locallyDismissedDialogs: (keyof GameState)[];
  handleAction: (action: GameAction, payload?: any) => Promise<void>;
  cardsDialogPlayerId: number | null;
  onCloseCardsDialog: () => void;
};

export function GameDialogs({ 
    gameState, 
    localPlayer, 
    isMyTurn, 
    onConfirmHostLeave,
    locallyDismissedDialogs,
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
    useCardDialogState, 
    showHostLeaveDialog, 
    abilitiesShopState,
    sabotageDialogState,
    wealthyDialogState,
    armySelectionDialogState,
    attackSelectionDialogState,
    status,
    players
  } = gameState;
  
  const isDialogVisible = (key: keyof GameState) => {
    return !!gameState[key] && !locallyDismissedDialogs.includes(key);
  }
  
  const isAttacker = isMyTurn && (!!combatState || !!monsterCombatState);

  const playerForCardsDialog = cardsDialogPlayerId !== null ? players.find(p => p.id === cardsDialogPlayerId) : null;

  return (
    <>
      {isDialogVisible('combatState') && combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleAction(GameAction.CombatRoll, { useWarChief })}
          onClose={() => isAttacker ? handleAction(GameAction.CloseCombat) : handleAction(GameAction.CloseCombatViewer)}
          isAttacker={isAttacker}
        />
      )}
      {isDialogVisible('monsterCombatState') && monsterCombatState && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={gameState.map[monsterCombatState.attackerPosition.y * MAP_COLS + monsterCombatState.attackerPosition.x].monsters || []}
          onRoll={(payload) => handleAction(GameAction.MonsterCombatRoll, payload)}
          onClose={() => isAttacker ? handleAction(GameAction.CloseMonsterCombat) : handleAction(GameAction.CloseMonsterCombatViewer)}
          onCancel={() => handleAction(GameAction.CancelAction)}
          isAttacker={isAttacker}
        />
      )}
      {isDialogVisible('positionDialogState') && positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleAction(GameAction.SelectResourcePosition, resource)}
          onClose={() => handleAction(GameAction.CancelAction)}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('collectDialogState') && collectDialogState?.isOpen && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleAction(GameAction.ConfirmCollection, { useProductive })}
            onClose={() => handleAction(GameAction.CancelAction)}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('armySelectionDialogState') && armySelectionDialogState?.isOpen && (
        <ArmySelectionDialog
            state={armySelectionDialogState}
            player={localPlayer}
            onSelectArmy={(armyId) => handleAction(GameAction.SelectArmy, { armyId })}
            onClose={() => handleAction(GameAction.CancelAction)}
            isMyTurn={isMyTurn}
        />
      )}
       {isDialogVisible('attackSelectionDialogState') && attackSelectionDialogState?.isOpen && (
        <AttackSelectionDialog
            state={attackSelectionDialogState}
            onSelectTarget={(defenderArmyId) => handleAction(GameAction.SelectDefender, { defenderArmyId, attackingArmyId: attackSelectionDialogState.attackingArmyId })}
            onClose={() => handleAction(GameAction.CancelAction)}
            isMyTurn={isMyTurn}
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
      {isDialogVisible('abilitiesShopState') && abilitiesShopState?.isOpen && (
        <AbilitiesDialog
          player={localPlayer}
          onClose={() => handleAction(GameAction.CloseAbilitiesShop)}
          onBuyAbility={(abilityName: AbilityName) => handleAction(GameAction.BuyAbility, { abilityName })}
          gameState={gameState}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('stealResourceDialogState') && stealResourceDialogState && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(target, resource) => handleAction(GameAction.StealResource, {targetPlayerId: target, resource: resource})}
          onClose={() => handleAction(GameAction.CancelAction)}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('useCardDialogState') && useCardDialogState && (
        <UseCardDialog
          cardName={useCardDialogState.cardName}
          onConfirm={() => handleAction(GameAction.ConfirmUseCard, { cardName: useCardDialogState.cardName })}
          onClose={() => handleAction(GameAction.CancelAction)}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('showHostLeaveDialog') && showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={gameState.players.length === 1}
            onConfirm={onConfirmHostLeave}
            onClose={() => handleAction(GameAction.CancelAction)}
            gameStatus={status}
        />
      )}
      {isDialogVisible('sabotageDialogState') && sabotageDialogState?.isOpen && (
        <SabotageDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSabotage={(targetPlayerId) => handleAction(GameAction.SabotagePlayer, { targetPlayerId })}
          onClose={() => handleAction(GameAction.CancelAction)}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('wealthyDialogState') && wealthyDialogState?.isOpen && (
        <WealthyDialog
          onSelectResource={(resource) => handleAction(GameAction.GainWealth, { resource })}
          onClose={() => handleAction(GameAction.CancelAction)}
          isMyTurn={isMyTurn}
        />
      )}
    </>
  );
}

    
