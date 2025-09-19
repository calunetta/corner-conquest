

'use client';
import type { GameState, Player, ResourceType, GameAction } from '@/lib/types';
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

type GameDialogsProps = {
  gameState: GameState;
  setGameState: (state: GameState | null | ((prevState: GameState | null) => GameState | null)) => Promise<void>;
  localPlayer: Player;
  isMyTurn: boolean;
  onConfirmHostLeave: () => void;
  locallyDismissedDialogs: string[];
  setLocallyDismissedDialogs: (keys: string[] | ((prev: string[]) => string[])) => void;
  handleAction: (action: GameAction, payload?: any) => Promise<void>;
};

export function GameDialogs({ 
    gameState, 
    localPlayer, 
    isMyTurn, 
    onConfirmHostLeave,
    locallyDismissedDialogs,
    handleAction,
}: GameDialogsProps) {
  const { 
    combatState, 
    monsterCombatState, 
    positionDialogState, 
    collectDialogState,
    showCardsDialogForPlayer, 
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
    return !!gameState[key] && !locallyDismissedDialogs.includes(key as string);
  }
  
  const isAttacker = isMyTurn && (!!combatState || !!monsterCombatState);

  const playerForCardsDialog = showCardsDialogForPlayer !== null ? players.find(p => p.id === showCardsDialogForPlayer) : null;

  return (
    <>
      {isDialogVisible('combatState') && combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleAction('combat-roll', useWarChief)}
          onClose={() => isAttacker ? handleAction('close-combat') : handleAction('close-combat-viewer')}
          isAttacker={isAttacker}
        />
      )}
      {isDialogVisible('monsterCombatState') && monsterCombatState && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={gameState.map[monsterCombatState.attackerPosition.y][monsterCombatState.attackerPosition.x].monsters || []}
          onRoll={(payload) => handleAction('monster-combat-roll', payload)}
          onClose={() => isAttacker ? handleAction('close-monster-combat') : handleAction('close-monster-combat-viewer')}
          onCancel={() => handleAction('cancel-action')}
          isAttacker={isAttacker}
        />
      )}
      {isDialogVisible('positionDialogState') && positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleAction('select-resource-position', resource)}
          onClose={() => handleAction('cancel-action')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('collectDialogState') && collectDialogState?.isOpen && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleAction('confirm-collection', useProductive)}
            onClose={() => handleAction('cancel-action')}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('armySelectionDialogState') && armySelectionDialogState?.isOpen && (
        <ArmySelectionDialog
            state={armySelectionDialogState}
            player={localPlayer}
            onSelectArmy={(armyId) => handleAction('select-army', armyId)}
            onClose={() => handleAction('cancel-action')}
            isMyTurn={isMyTurn}
        />
      )}
       {isDialogVisible('attackSelectionDialogState') && attackSelectionDialogState?.isOpen && (
        <AttackSelectionDialog
            state={attackSelectionDialogState}
            onSelectTarget={(defenderArmyId) => handleAction('select-defender', { defenderArmyId, attackingArmyId: attackSelectionDialogState.attackingArmyId })}
            onClose={() => handleAction('cancel-action')}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('showCardsDialogForPlayer') && playerForCardsDialog && (
        <CardsDialog 
          player={playerForCardsDialog}
          onClose={() => handleAction('close-cards')}
          onUseCard={(cardName) => handleAction('use-card', cardName)}
          canUseCards={isMyTurn && playerForCardsDialog.id === localPlayer.id}
        />
      )}
      {isDialogVisible('abilitiesShopState') && abilitiesShopState?.isOpen && (
        <AbilitiesDialog
          player={localPlayer}
          onClose={() => handleAction('close-abilities-shop')}
          onBuyAbility={(abilityName) => handleAction('buy-ability', abilityName)}
          gameState={gameState}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('stealResourceDialogState') && stealResourceDialogState && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(target, resource) => handleAction('steal-resource', {targetPlayerId: target, resource: resource})}
          onClose={() => handleAction('cancel-action')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('useCardDialogState') && useCardDialogState && (
        <UseCardDialog
          cardName={useCardDialogState.cardName}
          onConfirm={() => handleAction('confirm-use-card', useCardDialogState.cardName)}
          onClose={() => handleAction('cancel-action')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('showHostLeaveDialog') && showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={gameState.players.length === 1}
            onConfirm={onConfirmHostLeave}
            onClose={() => handleAction('cancel-action')}
            gameStatus={status}
        />
      )}
      {isDialogVisible('sabotageDialogState') && sabotageDialogState?.isOpen && (
        <SabotageDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSabotage={(targetPlayerId) => handleAction('sabotage-player', targetPlayerId)}
          onClose={() => handleAction('cancel-action')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('wealthyDialogState') && wealthyDialogState?.isOpen && (
        <WealthyDialog
          onSelectResource={(resource) => handleAction('gain-wealth', resource)}
          onClose={() => handleAction('cancel-action')}
          isMyTurn={isMyTurn}
        />
      )}
    </>
  );
}
