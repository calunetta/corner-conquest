

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
import * as GameActions from '@/lib/game-actions';

type GameDialogsProps = {
  gameState: GameState;
  setGameState: (state: GameState | null | ((prevState: GameState | null) => GameState | null)) => void;
  localPlayer: Player;
  isMyTurn: boolean;
  onConfirmHostLeave: () => void;
  locallyDismissedDialogs: string[];
  setLocallyDismissedDialogs: (keys: string[]) => void;
  handleAction: (action: GameAction, payload?: any) => void;
};

export function GameDialogs({ 
    gameState, 
    setGameState, 
    localPlayer, 
    isMyTurn, 
    onConfirmHostLeave,
    locallyDismissedDialogs,
    setLocallyDismissedDialogs,
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
  } = gameState;

  const handleUpdate = (state: GameState) => {
    setGameState(state);
  };
  
  const handleCloseDialog = (dialogKey: keyof GameState) => {
    if (isMyTurn) {
        setGameState(gs => gs ? ({ ...gs, [dialogKey]: null }) : null);
    } else {
        setLocallyDismissedDialogs([...locallyDismissedDialogs, dialogKey]);
    }
  };
  
  const selectedArmy = GameActions.getSelectedArmy(gameState);
  const currentTileForMonster = (selectedArmy && gameState.map && gameState.map[selectedArmy.position.y]) ? gameState.map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const isDialogVisible = (key: keyof GameState) => {
    return !!gameState[key] && !locallyDismissedDialogs.includes(key);
  }

  return (
    <>
      {isDialogVisible('combatState') && combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleAction('combat-roll', useWarChief)}
          onClose={() => isMyTurn ? handleAction('close-combat') : handleCloseDialog('combatState')}
          isAttacker={isMyTurn}
        />
      )}
      {isDialogVisible('monsterCombatState') && monsterCombatState && currentTileForMonster?.monsters && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={currentTileForMonster.monsters}
          onRoll={(payload) => handleAction('monster-combat-roll', payload)}
          onClose={() => isMyTurn ? handleAction('close-monster-combat') : handleCloseDialog('monsterCombatState')}
          onCancel={() => handleCloseDialog('monsterCombatState')}
          isAttacker={isMyTurn}
        />
      )}
      {isDialogVisible('positionDialogState') && positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleAction('select-resource-position', resource)}
          onClose={() => handleCloseDialog('positionDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('collectDialogState') && collectDialogState?.isOpen && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleAction('confirm-collection', useProductive)}
            onClose={() => handleCloseDialog('collectDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('armySelectionDialogState') && armySelectionDialogState?.isOpen && (
        <ArmySelectionDialog
            state={armySelectionDialogState}
            player={localPlayer}
            onSelectArmy={(armyId) => handleAction('select-army', armyId)}
            onClose={() => handleCloseDialog('armySelectionDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
       {isDialogVisible('attackSelectionDialogState') && attackSelectionDialogState?.isOpen && (
        <AttackSelectionDialog
            state={attackSelectionDialogState}
            onSelectTarget={(armyId) => handleAction('select-defender', armyId)}
            onClose={() => handleCloseDialog('attackSelectionDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('showCardsDialogForPlayer') && showCardsDialogForPlayer === localPlayer.id && (
        <CardsDialog 
          player={localPlayer}
          onClose={() => handleCloseDialog('showCardsDialogForPlayer')}
          onUseCard={(cardName) => handleAction('use-card', cardName)}
          canUseCards={isMyTurn}
        />
      )}
      {isDialogVisible('abilitiesShopState') && abilitiesShopState?.isOpen && (
        <AbilitiesDialog
          player={localPlayer}
          onClose={() => handleCloseDialog('abilitiesShopState')}
          onBuyAbility={(abilityName) => handleAction('buy-ability', abilityName)}
          gameState={gameState}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('stealResourceDialogState') && stealResourceDialogState && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(target, resource) => handleAction('steal-resource', {targetPlayerId: target, resource: resource})}
          onClose={() => handleCloseDialog('stealResourceDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('useCardDialogState') && useCardDialogState && (
        <UseCardDialog
          cardName={useCardDialogState.cardName}
          onConfirm={() => handleAction('use-card', useCardDialogState.cardName)}
          onClose={() => handleCloseDialog('useCardDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('showHostLeaveDialog') && showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={gameState.players.length === 1}
            onConfirm={onConfirmHostLeave}
            onClose={() => handleCloseDialog('showHostLeaveDialog')}
        />
      )}
      {isDialogVisible('sabotageDialogState') && sabotageDialogState?.isOpen && (
        <SabotageDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSabotage={(targetPlayerId) => handleAction('sabotage-player', targetPlayerId)}
          onClose={() => handleCloseDialog('sabotageDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('wealthyDialogState') && wealthyDialogState?.isOpen && (
        <WealthyDialog
          onSelectResource={(resource) => handleAction('gain-wealth', resource)}
          onClose={() => handleCloseDialog('wealthyDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
    </>
  );
}
