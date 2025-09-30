

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
  attackSelectionDialog: AttackSelectionDialogState | null;
  onCloseAttackSelectionDialog: () => void;
  positionDialog: PositionDialogState;
  onClosePositionDialog: () => void;
  sabotageDialog: SabotageDialogState;
  onCloseSabotageDialog: () => void;
  wealthyDialog: WealthyDialogState;
  onCloseWealthyDialog: () => void;
  stealResourceDialog: StealResourceDialogState;
  onCloseStealResourceDialog: () => void;
  productiveCardDialog: ProductiveCardDialogState | null;
  onCloseProductiveCardDialog: () => void;
  specialIslandRollDialog: SpecialIslandRollDialogState | null;
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
    monsterCombatState,
  } = gameState;
  
  const playerForCardsDialog = cardsDialogPlayerId !== null ? gameState.players.find(p => p.id === cardsDialogPlayerId) : null;
  const isViewingOwnCards = playerForCardsDialog?.id === localPlayer.id;

  return (
    <>
      {/* SHARED DIALOGS (visible to multiple players) */}
      {combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => onAction(GameAction.CombatRoll, { useWarChief })}
          onClose={() => onAction(GameAction.CloseCombat)}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayer.id}
        />
      )}

      {monsterCombatState && (
          <MonsterCombatDialog 
              gameState={gameState}
              onRoll={(payload) => onAction(GameAction.MonsterCombatRoll, payload)}
              onClose={() => onAction(GameAction.CloseMonsterCombat)}
              onCancel={() => onLocalAction(GameAction.local_CancelAction)}
          />
      )}

      {/* LOCAL DIALOGS (visible only to the current player) */}
      {isMyTurn && (
        <>
            {productiveCardDialog?.isOpen && (
                <ProductiveCardDialog
                    state={productiveCardDialog}
                    onConfirm={(selectedResource) => {
                      onAction(GameAction.UseProductiveCard, { selectedResource });
                      onCloseProductiveCardDialog();
                    }}
                />
            )}

            {specialIslandRollDialog?.isOpen && (
              <SpecialIslandRollDialog
                state={specialIslandRollDialog}
                onRoll={() => {
                  onAction(GameAction.RollOnSpecialIsland);
                }}
                onClose={() => {
                  onCloseSpecialIslandRollDialog();
                }}
              />
            )}

            {positionDialog && (
                <PositionDialog 
                    resources={positionDialog.resources}
                    onSelect={(resource) => {
                      onAction(GameAction.SelectResourcePosition, { resource, armyId: positionDialog.armyId });
                      onClosePositionDialog();
                    }}
                    onClose={onClosePositionDialog}
                />
            )}

            {armySelectionDialog && (
                <ArmySelectionDialog
                    state={armySelectionDialog}
                    player={localPlayer}
                    onSelectArmy={onSelectArmyFromDialog}
                    onClose={onCloseArmySelectionDialog}
                    isMyTurn={isMyTurn}
                />
            )}

            {attackSelectionDialog && (
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

            {abilitiesShopOpen && (
                <AbilitiesDialog
                    player={gameState.players[gameState.currentPlayerIndex]}
                    onClose={onCloseAbilitiesShop}
                    onBuyAbility={(abilityName) => onAction(GameAction.BuyAbility, { abilityName })}
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                />
            )}

            {stealResourceDialog?.isOpen && (
                <StealResourceDialog
                    players={gameState.players.filter(p => p.id !== localPlayer.id)}
                    onSteal={(target, resource) => {
                        onAction(GameAction.StealResource, {targetPlayerId: target, resource: resource});
                        onCloseStealResourceDialog();
                    }}
                    onClose={onCloseStealResourceDialog}
                />
            )}

            {sabotageDialog?.isOpen && (
                <SabotageDialog
                    players={gameState.players.filter(p => p.id !== localPlayer.id)}
                    onSabotage={(targetPlayerId) => {
                        onAction(GameAction.SabotagePlayer, { targetPlayerId });
                        onCloseSabotageDialog();
                    }}
                    onClose={onCloseSabotageDialog}
                />
            )}

            {wealthyDialog?.isOpen && (
                <WealthyDialog
                    onSelectResource={(resource) => {
                        onAction(GameAction.GainWealth, { resource });
                        onCloseWealthyDialog();
                    }}
                    onClose={onCloseWealthyDialog}
                />
            )}
        </>
      )}
      
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
