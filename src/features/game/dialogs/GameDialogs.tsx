
'use client';
import type { GameState, Player, CardName, Army } from '@/lib/types';
import type { ArmySelectionDialogState, AttackSelectionDialogState, SabotageDialogState, PositionDialogState, WealthyDialogState, StealResourceDialogState, ProductiveCardDialogState, SpecialIslandRollDialogState } from '../types';
import { GameAction } from '@/lib/types';
import { CombatDialog } from './CombatDialog';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import { PositionDialog } from './PositionDialog';
import { CardsDialog } from './CardsDialog';
import { StealResourceDialog } from './StealResourceDialog';
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
  onAction: (action: GameAction, payload?: any) => Promise<void>;
  onLocalAction: (action: GameAction, payload?: any) => void;
  
  // Local dialog states managed by GameBoard
  cardsDialogPlayerId: number | null;
  onCloseCardsDialog: () => void;
  abilitiesShopOpen: boolean;
  onCloseAbilitiesShop: () => void;
  armySelectionDialog: ArmySelectionDialogState;
  onCloseArmySelectionDialog: () => void;
  onSelectArmyFromDialog: (armyId: number) => void;
  attackSelectionDialog: AttackSelectionDialogState;
  onCloseAttackSelectionDialog: () => void;
  positionDialog: PositionDialogState;
  onClosePositionDialog: () => void;
  sabotageDialog: SabotageDialogState;
  onCloseSabotageDialog: () => void;
  wealthyDialog: WealthyDialogState;
  onCloseWealthyDialog: () => void;
  stealResourceDialog: StealResourceDialogState;
  onCloseStealResourceDialog: () => void;
  productiveCardDialog: ProductiveCardDialogState;
  onCloseProductiveCardDialog: () => void;
  specialIslandRollDialog: SpecialIslandRollDialogState;
  onCloseSpecialIslandRollDialog: () => void;
};

export function GameDialogs({ 
    gameState, 
    localPlayer, 
    isMyTurn, 
    onAction,
    onLocalAction,
    cardsDialogPlayerId,
    onCloseCardsDialog,
    abilitiesShopOpen,
    onCloseAbilitiesShop,
    armySelectionDialog,
    onCloseArmySelectionDialog,
    onSelectArmyFromDialog,
    attackSelectionDialog,
    onCloseAttackSelectionDialog,
    positionDialog,
    onClosePositionDialog,
    sabotageDialog,
    onCloseSabotageDialog,
    wealthyDialog,
    onCloseWealthyDialog,
    stealResourceDialog,
    onCloseStealResourceDialog,
    productiveCardDialog,
    onCloseProductiveCardDialog,
    specialIslandRollDialog,
    onCloseSpecialIslandRollDialog,
}: GameDialogsProps) {
  const { 
    combatState, 
    players,
    monsterCombatState,
  } = gameState;
  
  const playerForCardsDialog = cardsDialogPlayerId !== null ? players.find(p => p.id === cardsDialogPlayerId) : null;
  const isViewingOwnCards = playerForCardsDialog?.id === localPlayer.id;

  return (
    <>
      {/* SHARED DIALOGS (visible to multiple players) */}
      {combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => onAction(GameAction.CombatRoll, { useWarChief, army: localPlayer.armies.find(a => a.id === combatState.attackingArmyId) })}
          onClose={() => onAction(GameAction.CloseCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {monsterCombatState && (
          <MonsterCombatDialog 
              gameState={gameState} 
              monsters={gameState.map[monsterCombatState.attackerPosition.y * gameState.settings.gridSize.cols + monsterCombatState.attackerPosition.x].monsters || []}
              onRoll={(payload) => onAction(GameAction.MonsterCombatRoll, payload)}
              onClose={() => onAction(GameAction.CloseMonsterCombat)}
              onCancel={() => onLocalAction(GameAction.local_CancelAction)}
          />
      )}

      {/* LOCAL DIALOGS (visible only to the current player) */}

        <>
            {productiveCardDialog?.isOpen && isMyTurn && (
                <ProductiveCardDialog
                    state={productiveCardDialog}
                    onConfirm={(selectedResource) => {
                      onAction(GameAction.UseProductiveCard, { selectedResource });
                      onCloseProductiveCardDialog();
                    }}
                />
            )}

            {specialIslandRollDialog?.isOpen && isMyTurn && (
              <SpecialIslandRollDialog
                state={specialIslandRollDialog}
                onRoll={() => onAction(GameAction.RollOnSpecialIsland)}
                onClose={() => {
                  onAction(GameAction.CloseSpecialIslandDialog);
                  onCloseSpecialIslandRollDialog();
                }}
              />
            )}

            {positionDialog && isMyTurn &&(
                <PositionDialog 
                    resources={positionDialog.resources}
                    onSelect={(resource) => {
                      const army = localPlayer.armies.find(a => a.id === positionDialog.armyId);
                      onAction(GameAction.SelectResourcePosition, { resource, army });
                      onClosePositionDialog();
                    }}
                    onClose={onClosePositionDialog}
                />
            )}

            {armySelectionDialog && isMyTurn && (
                <ArmySelectionDialog
                    state={armySelectionDialog}
                    player={localPlayer}
                    onSelectArmy={onSelectArmyFromDialog}
                    onClose={onCloseArmySelectionDialog}
                    isMyTurn={isMyTurn}
                />
            )}

            {attackSelectionDialog && isMyTurn && (
                <AttackSelectionDialog
                    state={attackSelectionDialog}
                    onSelectTarget={(defenderArmyId: number) => {
                        if (attackSelectionDialog) {
                            onAction(GameAction.SelectDefender, {
                                defenderArmyId,
                                attackingArmyId: attackSelectionDialog.attackingArmyId,
                            });
                        }
                        onCloseAttackSelectionDialog();
                    }}
                    onClose={onCloseAttackSelectionDialog}
                    isMyTurn={isMyTurn}
                />
            )}

            {abilitiesShopOpen && isMyTurn &&(
                <AbilitiesDialog
                    player={localPlayer}
                    onClose={onCloseAbilitiesShop}
                    onBuyAbility={(abilityName) => onAction(GameAction.BuyAbility, { abilityName })}
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                />
            )}

            {stealResourceDialog?.isOpen && isMyTurn && (
                <StealResourceDialog
                    players={players.filter(p => p.id !== localPlayer.id)}
                    onSteal={(target, resource) => {
                        onAction(GameAction.StealResource, {targetPlayerId: target, resource: resource});
                        onCloseStealResourceDialog();
                    }}
                    onClose={onCloseStealResourceDialog}
                />
            )}

            {sabotageDialog?.isOpen && isMyTurn && (
                <SabotageDialog
                    players={players.filter(p => p.id !== localPlayer.id)}
                    onSabotage={(targetPlayerId) => {
                        onAction(GameAction.SabotagePlayer, { targetPlayerId });
                        onCloseSabotageDialog();
                    }}
                    onClose={onCloseSabotageDialog}
                />
            )}

            {wealthyDialog?.isOpen && isMyTurn && (
                <WealthyDialog
                    onSelectResource={(resource) => {
                        onAction(GameAction.GainWealth, { resource });
                        onCloseWealthyDialog();
                    }}
                    onClose={onCloseWealthyDialog}
                />
            )}
        </>
      
      {playerForCardsDialog && (
        <CardsDialog 
          player={playerForCardsDialog}
          onClose={onCloseCardsDialog}
          onUseCard={(cardName: CardName) => {
            onCloseCardsDialog();
            onLocalAction(GameAction.local_UseCard, { cardName });
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}
    </>
  );
}
