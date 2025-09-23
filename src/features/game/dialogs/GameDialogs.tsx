
'use client';
import type { GameState, Player, CardName, AbilityName, Army, IslandResource, ArmySelectionDialogState, AttackSelectionDialogState, SabotageDialogState, PositionDialogState, WealthyDialogState, StealResourceDialogState, ProductiveCardDialogState, SpecialIslandRollDialogState } from '@/lib/types';
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
import { handlePlayerExit } from '@/lib/actions/player';

type GameDialogsProps = {
  gameState: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  onAction: (action: GameAction, payload?: any) => Promise<void>;
  
  // Local dialog states managed by GameBoard
  showHostLeaveDialog: boolean;
  onCloseHostLeaveDialog: () => void;
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
  productiveCardDialogState: ProductiveCardDialogState | null;
  specialIslandRollDialogState: SpecialIslandRollDialogState | null;
};

export function GameDialogs({ 
    gameState, 
    localPlayer, 
    isMyTurn, 
    onAction,
    showHostLeaveDialog,
    onCloseHostLeaveDialog,
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
    productiveCardDialogState,
    specialIslandRollDialogState,
}: GameDialogsProps) {
  const { 
    combatState, 
    status,
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
              onRoll={(payload) => onAction(GameAction.MonsterCombatRoll, { ...payload, army: localPlayer.armies.find(a => a.position.x === monsterCombatState?.attackerPosition.x && a.position.y === monsterCombatState?.attackerPosition.y)})}
              onClose={() => onAction(GameAction.CloseMonsterCombat)}
              onCancel={() => onAction(GameAction.CancelAction)}
          />
      )}

      {/* LOCAL DIALOGS (visible only to the current player) */}

      {productiveCardDialogState?.isOpen && isMyTurn && (
          <ProductiveCardDialog
              state={productiveCardDialogState}
              onConfirm={(selectedResource) => onAction(GameAction.UseProductiveCard, { selectedResource })}
          />
      )}

      {specialIslandRollDialogState?.isOpen && isMyTurn && (
        <SpecialIslandRollDialog
          state={specialIslandRollDialogState}
          onRoll={() => onAction(GameAction.RollOnSpecialIsland)}
          onClose={() => onAction(GameAction.CloseSpecialIslandDialog)}
        />
      )}

      {isMyTurn && (
        <>
            {positionDialog && (
                <PositionDialog 
                    resources={positionDialog.resources}
                    onSelect={(resource) => {
                      const army = localPlayer.armies.find(a => a.id === positionDialog.armyId);
                      onAction(GameAction.SelectResourcePosition, { resource, army });
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
                    player={localPlayer}
                    onClose={onCloseAbilitiesShop}
                    onBuyAbility={(abilityName: AbilityName) => onAction(GameAction.BuyAbility, { abilityName })}
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                />
            )}

            {stealResourceDialog?.isOpen && (
                <StealResourceDialog
                    players={players.filter(p => p.id !== localPlayer.id)}
                    onSteal={(target, resource) => onAction(GameAction.StealResource, {targetPlayerId: target, resource: resource})}
                    onClose={onCloseStealResourceDialog}
                />
            )}

            {sabotageDialog?.isOpen && (
                <SabotageDialog
                    players={players.filter(p => p.id !== localPlayer.id)}
                    onSabotage={(targetPlayerId) => onAction(GameAction.SabotagePlayer, { targetPlayerId })}
                    onClose={onCloseSabotageDialog}
                />
            )}

            {wealthyDialog?.isOpen && (
                <WealthyDialog
                    onSelectResource={(resource) => onAction(GameAction.GainWealth, { resource })}
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
            onAction(GameAction.UseCard, { cardName });
          }}
          canUseCards={isMyTurn && isViewingOwnCards}
        />
      )}
      
      {showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={players.length === 1}
            onConfirm={() => onAction(GameAction.HostLeave)}
            onClose={onCloseHostLeaveDialog}
            gameStatus={status}
        />
      )}
    </>
  );
}
