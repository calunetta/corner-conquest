

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
  handleSharedAction: (action: GameAction, payload?: any) => Promise<void>;
  cardsDialogPlayerId: number | null;
  onCloseCardsDialog: () => void;
  abilitiesShopOpen: boolean;
  onCloseAbilitiesShop: () => void;
};

export function GameDialogs({ 
    gameState, 
    localPlayer, 
    isMyTurn, 
    onConfirmHostLeave,
    handleSharedAction,
    cardsDialogPlayerId,
    onCloseCardsDialog,
    abilitiesShopOpen,
    onCloseAbilitiesShop,
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
          onRoll={(useWarChief) => handleSharedAction(GameAction.CombatRoll, { useWarChief, army: localPlayer.armies.find(a => a.id === combatState.attackingArmyId) })}
          onClose={() => handleSharedAction(GameAction.CloseCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {isMyTurn && (
        <>
            {gameState.monsterCombatState && (
                <MonsterCombatDialog 
                    gameState={gameState} 
                    monsters={gameState.map[gameState.monsterCombatState.attackerPosition.y * gameState.settings.gridSize.cols + gameState.monsterCombatState.attackerPosition.x].monsters || []}
                    onRoll={(payload) => handleSharedAction(GameAction.MonsterCombatRoll, { ...payload, army: localPlayer.armies.find(a => a.position.x === gameState.monsterCombatState?.attackerPosition.x && a.position.y === gameState.monsterCombatState?.attackerPosition.y)})}
                    onClose={() => handleSharedAction(GameAction.CloseMonsterCombat)}
                    onCancel={() => {}}
                />
            )}

            {gameState.positionDialogState && (
                <PositionDialog 
                    resources={gameState.positionDialogState.resources}
                    onSelect={(resource) => handleSharedAction(GameAction.SelectResourcePosition, { resource, army: localPlayer.armies.find(a => a.position.x === gameState.positionDialogState?.x && a.position.y === gameState.positionDialogState?.y)})}
                    onClose={() => handleSharedAction(GameAction.CancelAction)}
                />
            )}

            {gameState.productiveCardDialogState?.isOpen && (
                <ProductiveCardDialog
                    state={gameState.productiveCardDialogState}
                    onConfirm={(selectedResource) => handleSharedAction(GameAction.UseProductiveCard, { selectedResource })}
                />
            )}

             {gameState.specialIslandRollDialogState?.isOpen && (
              <SpecialIslandRollDialog
                state={gameState.specialIslandRollDialogState}
                onRoll={() => handleSharedAction(GameAction.RollOnSpecialIsland)}
                onClose={() => handleSharedAction(GameAction.CloseSpecialIslandDialog)}
              />
            )}

            {gameState.armySelectionDialogState?.isOpen && (
                <ArmySelectionDialog
                    state={gameState.armySelectionDialogState}
                    player={localPlayer}
                    onSelectArmy={(armyId) => handleSharedAction(GameAction.SelectArmy, { armyId })}
                    onClose={() => {}}
                    isMyTurn={isMyTurn}
                />
            )}

            {gameState.attackSelectionDialogState?.isOpen && (
                <AttackSelectionDialog
                    state={gameState.attackSelectionDialogState}
                    onSelectTarget={(defenderArmyId) => handleSharedAction(GameAction.SelectDefender, { defenderArmyId, attackingArmyId: gameState.attackSelectionDialogState!.attackingArmyId })}
                    onClose={() => {}}
                    isMyTurn={isMyTurn}
                />
            )}

            {abilitiesShopOpen && (
                <AbilitiesDialog
                    player={localPlayer}
                    onClose={onCloseAbilitiesShop}
                    onBuyAbility={(abilityName: AbilityName) => handleSharedAction(GameAction.BuyAbility, { abilityName })}
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                />
            )}

            {gameState.stealResourceDialogState && (
                <StealResourceDialog
                    players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
                    onSteal={(target, resource) => handleSharedAction(GameAction.StealResource, {targetPlayerId: target, resource: resource})}
                    onClose={() => handleSharedAction(GameAction.CancelAction)}
                />
            )}

            {gameState.showHostLeaveDialog && (
                <HostLeaveDialog
                    isLastPlayer={gameState.players.length === 1}
                    onConfirm={onConfirmHostLeave}
                    onClose={() => {}}
                    gameStatus={status}
                />
            )}

            {gameState.sabotageDialogState?.isOpen && (
                <SabotageDialog
                    players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
                    onSabotage={(targetPlayerId) => handleSharedAction(GameAction.SabotagePlayer, { targetPlayerId })}
                    onClose={() => {}}
                />
            )}

            {gameState.wealthyDialogState?.isOpen && (
                <WealthyDialog
                    onSelectResource={(resource) => handleSharedAction(GameAction.GainWealth, { resource })}
                    onClose={() => {}}
                />
            )}
        </>
      )}
      
      {playerForCardsDialog && (
        <CardsDialog 
          player={playerForCardsDialog}
          onClose={onCloseCardsDialog}
          onUseCard={(cardName: CardName) => {
            handleSharedAction(GameAction.UseCard, { cardName });
            onCloseCardsDialog();
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}
    </>
  );
}
