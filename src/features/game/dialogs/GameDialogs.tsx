

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
import { ArmySelectionDialog } from './ArmySelectionDialog';
import { AttackSelectionDialog } from './AttackSelectionDialog';
import { ProductiveCardDialog } from './ProductiveCardDialog';
import { SpecialIslandRollDialog } from './SpecialIslandRollDialog';

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
    status,
    players
  } = gameState;
  
  const playerForCardsDialog = cardsDialogPlayerId !== null ? players.find(p => p.id === cardsDialogPlayerId) : null;
  const isViewingOwnCards = playerForCardsDialog?.id === localPlayer.id;

  return (
    <>
      {combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleAction(GameAction.CombatRoll, { useWarChief })}
          onClose={() => handleAction(GameAction.CloseCombat)}
          localPlayerId={localPlayer.id}
        />
      )}

      {isMyTurn && (
        <>
            {gameState.monsterCombatState && (
                <MonsterCombatDialog 
                    gameState={gameState} 
                    monsters={gameState.map[gameState.monsterCombatState.attackerPosition.y * gameState.settings.gridSize.cols + gameState.monsterCombatState.attackerPosition.x].monsters || []}
                    onRoll={(payload) => handleAction(GameAction.MonsterCombatRoll, payload)}
                    onClose={() => handleAction(GameAction.CloseMonsterCombat)}
                    onCancel={() => handleAction(GameAction.CancelAction)}
                />
            )}

            {gameState.positionDialogState && (
                <PositionDialog 
                    resources={gameState.positionDialogState.resources}
                    onSelect={(resource) => handleAction(GameAction.SelectResourcePosition, resource)}
                    onClose={() => handleAction(GameAction.CancelAction)}
                />
            )}

            {gameState.productiveCardDialogState?.isOpen && (
                <ProductiveCardDialog
                    state={gameState.productiveCardDialogState}
                    onConfirm={(selectedResource) => handleAction(GameAction.UseProductiveCard, { selectedResource })}
                />
            )}

             {gameState.specialIslandRollDialogState?.isOpen && (
              <SpecialIslandRollDialog
                state={gameState.specialIslandRollDialogState}
                onRoll={() => handleAction(GameAction.RollOnSpecialIsland)}
                onClose={() => handleAction(GameAction.CloseSpecialIslandDialog)}
              />
            )}

            {gameState.armySelectionDialogState?.isOpen && (
                <ArmySelectionDialog
                    state={gameState.armySelectionDialogState}
                    player={localPlayer}
                    onSelectArmy={(armyId) => handleAction(GameAction.SelectArmy, { armyId })}
                    onClose={() => handleAction(GameAction.CancelAction)}
                    isMyTurn={isMyTurn}
                />
            )}

            {gameState.attackSelectionDialogState?.isOpen && (
                <AttackSelectionDialog
                    state={gameState.attackSelectionDialogState}
                    onSelectTarget={(defenderArmyId) => handleAction(GameAction.SelectDefender, { defenderArmyId, attackingArmyId: gameState.attackSelectionDialogState!.attackingArmyId })}
                    onClose={() => handleAction(GameAction.CancelAction)}
                    isMyTurn={isMyTurn}
                />
            )}

            {gameState.abilitiesShopState?.isOpen && (
                <AbilitiesDialog
                    player={localPlayer}
                    onClose={() => handleAction(GameAction.CloseAbilitiesShop)}
                    onBuyAbility={(abilityName: AbilityName) => handleAction(GameAction.BuyAbility, { abilityName })}
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                />
            )}

            {gameState.stealResourceDialogState && (
                <StealResourceDialog
                    players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
                    onSteal={(target, resource) => handleAction(GameAction.StealResource, {targetPlayerId: target, resource: resource})}
                    onClose={() => handleAction(GameAction.CancelAction)}
                />
            )}

            {gameState.showHostLeaveDialog && (
                <HostLeaveDialog
                    isLastPlayer={gameState.players.length === 1}
                    onConfirm={onConfirmHostLeave}
                    onClose={() => handleAction(GameAction.CancelAction)}
                    gameStatus={status}
                />
            )}

            {gameState.sabotageDialogState?.isOpen && (
                <SabotageDialog
                    players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
                    onSabotage={(targetPlayerId) => handleAction(GameAction.SabotagePlayer, { targetPlayerId })}
                    onClose={() => handleAction(GameAction.CancelAction)}
                />
            )}

            {gameState.wealthyDialogState?.isOpen && (
                <WealthyDialog
                    onSelectResource={(resource) => handleAction(GameAction.GainWealth, { resource })}
                    onClose={() => handleAction(GameAction.CancelAction)}
                />
            )}
        </>
      )}
      
      {playerForCardsDialog && (
        <CardsDialog 
          player={playerForCardsDialog}
          onClose={onCloseCardsDialog}
          onUseCard={(cardName: CardName) => {
            handleAction(GameAction.UseCard, { cardName });
            onCloseCardsDialog();
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}
    </>
  );
}
