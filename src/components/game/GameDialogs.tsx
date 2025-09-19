

'use client';
import type { GameState, Player, ResourceType } from '@/lib/types';
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
  setGameState: (state: GameState) => void;
  localPlayer: Player;
  isMyTurn: boolean;
  onConfirmHostLeave: () => void;
  locallyDismissedDialogs: string[];
  setLocallyDismissedDialogs: (keys: string[]) => void;
};

export function GameDialogs({ 
    gameState, 
    setGameState, 
    localPlayer, 
    isMyTurn, 
    onConfirmHostLeave,
    locallyDismissedDialogs,
    setLocallyDismissedDialogs,
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
        handleUpdate({ ...gameState, [dialogKey]: null, currentAction: null });
    } else {
        setLocallyDismissedDialogs([...locallyDismissedDialogs, dialogKey]);
    }
  };
  
  const selectedArmy = GameActions.getSelectedArmy(gameState);
  const currentTileForMonster = (selectedArmy && gameState.map && gameState.map[selectedArmy.position.y]) ? gameState.map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const handleUseCardAction = (cardName: string) => {
    let newState = { ...gameState };
    switch (cardName) {
        case 'Steal Resource':
            newState = { ...newState, stealResourceDialogState: { targetPlayerId: null }, showCardsDialogForPlayer: null };
            break;
        case 'Extra Move':
        case 'Teleport':
        case 'Reinforce':
        case 'Scout':
        case 'Efficient':
        case 'Master Builder':
            newState = GameActions.handleUseCard(newState, cardName);
            break;
        case 'Sabatoge':
            newState = { ...newState, sabotageDialogState: { isOpen: true }, showCardsDialogForPlayer: null };
            break;
        case 'Wealthy':
            newState = { ...newState, wealthyDialogState: { isOpen: true }, showCardsDialogForPlayer: null };
            break;
        default:
            newState = GameActions.handleOpenUseCardDialog(newState, cardName);
            break;
    }
    handleUpdate(newState);
  }
  
  const isDialogVisible = (key: keyof GameState) => {
    return !!gameState[key] && !locallyDismissedDialogs.includes(key);
  }

  return (
    <>
      {isDialogVisible('combatState') && combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleUpdate(GameActions.handleCombatRoll(gameState, useWarChief))}
          onClose={() => handleCloseDialog('combatState')}
          isAttacker={isMyTurn}
        />
      )}
      {isDialogVisible('monsterCombatState') && monsterCombatState && currentTileForMonster?.monsters && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={currentTileForMonster.monsters}
          onRoll={(monster, useDecideCard, decidedValue, useOvercome, useWarChief) => handleUpdate(GameActions.handleMonsterCombatRoll(gameState, monster, useDecideCard, decidedValue, useOvercome, useWarChief))}
          onClose={() => handleCloseDialog('monsterCombatState')}
          onCancel={() => handleCloseDialog('monsterCombatState')}
          isAttacker={isMyTurn}
        />
      )}
      {isDialogVisible('positionDialogState') && positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleUpdate(GameActions.handleSelectResourceForPosition(gameState, resource))}
          onClose={() => handleCloseDialog('positionDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('collectDialogState') && collectDialogState?.isOpen && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleUpdate(GameActions.handleConfirmCollection(gameState, useProductive))}
            onClose={() => handleCloseDialog('collectDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('armySelectionDialogState') && armySelectionDialogState?.isOpen && (
        <ArmySelectionDialog
            state={armySelectionDialogState}
            player={localPlayer}
            onSelectArmy={(armyId) => handleUpdate(GameActions.handleSelectArmy(gameState, armyId))}
            onClose={() => handleCloseDialog('armySelectionDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
       {isDialogVisible('attackSelectionDialogState') && attackSelectionDialogState?.isOpen && (
        <AttackSelectionDialog
            state={attackSelectionDialogState}
            onSelectTarget={(armyId) => handleUpdate(GameActions.handleSelectDefender(gameState, armyId))}
            onClose={() => handleCloseDialog('attackSelectionDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('showCardsDialogForPlayer') && showCardsDialogForPlayer === localPlayer.id && (
        <CardsDialog 
          player={localPlayer}
          onClose={() => handleCloseDialog('showCardsDialogForPlayer')}
          onUseCard={(cardName) => handleUseCardAction(cardName)}
          canUseCards={isMyTurn}
        />
      )}
      {isDialogVisible('abilitiesShopState') && abilitiesShopState?.isOpen && (
        <AbilitiesDialog
          player={localPlayer}
          onClose={() => handleCloseDialog('abilitiesShopState')}
          onBuyAbility={(abilityName) => handleUpdate(GameActions.handleBuyAbility(gameState, abilityName))}
          gameState={gameState}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('stealResourceDialogState') && stealResourceDialogState && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(targetPlayerId, resource) => handleUpdate(GameActions.handleStealResource(gameState, targetPlayerId, resource))}
          onClose={() => handleCloseDialog('stealResourceDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('useCardDialogState') && useCardDialogState && (
        <UseCardDialog
          cardName={useCardDialogState.cardName}
          onConfirm={() => handleUpdate(GameActions.handleUseCard(gameState, useCardDialogState.cardName))}
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
          onSabotage={(targetPlayerId) => handleUpdate(GameActions.handleSabotagePlayer(gameState, targetPlayerId))}
          onClose={() => handleCloseDialog('sabotageDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {isDialogVisible('wealthyDialogState') && wealthyDialogState?.isOpen && (
        <WealthyDialog
          onSelectResource={(resource) => handleUpdate(GameActions.handleGainWealth(gameState, resource))}
          onClose={() => handleCloseDialog('wealthyDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
    </>
  );
}
