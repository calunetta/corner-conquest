

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
};

export function GameDialogs({ gameState, setGameState, localPlayer, isMyTurn, onConfirmHostLeave }: GameDialogsProps) {
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
  
  const handleCloseDialog = (dialog: keyof GameState) => {
    handleUpdate({ ...gameState, [dialog]: null, currentAction: null });
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

  return (
    <>
      {combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={(useWarChief) => handleUpdate(GameActions.handleCombatRoll(gameState, useWarChief))}
          onClose={() => handleUpdate(GameActions.handleCloseCombat(gameState))}
          isAttacker={isMyTurn}
        />
      )}
      {monsterCombatState && currentTileForMonster?.monsters && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={currentTileForMonster.monsters}
          onRoll={(monster, useDecideCard, decidedValue, useOvercome, useWarChief) => handleUpdate(GameActions.handleMonsterCombatRoll(gameState, monster, useDecideCard, decidedValue, useOvercome, useWarChief))}
          onClose={() => handleUpdate(GameActions.handleCloseMonsterCombat(gameState))}
          onCancel={() => handleCloseDialog('monsterCombatState')}
          isAttacker={isMyTurn}
        />
      )}
      {positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleUpdate(GameActions.handleSelectResourceForPosition(gameState, resource))}
          onClose={() => handleCloseDialog('positionDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {collectDialogState?.isOpen && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleUpdate(GameActions.handleConfirmCollection(gameState, useProductive))}
            onClose={() => handleCloseDialog('collectDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
      {armySelectionDialogState?.isOpen && (
        <ArmySelectionDialog
            state={armySelectionDialogState}
            player={localPlayer}
            onSelectArmy={(armyId) => handleUpdate(GameActions.handleSelectArmy(gameState, armyId))}
            onClose={() => handleCloseDialog('armySelectionDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
       {attackSelectionDialogState?.isOpen && (
        <AttackSelectionDialog
            state={attackSelectionDialogState}
            onSelectTarget={(armyId) => handleUpdate(GameActions.handleSelectDefender(gameState, armyId))}
            onClose={() => handleCloseDialog('attackSelectionDialogState')}
            isMyTurn={isMyTurn}
        />
      )}
      {showCardsDialogForPlayer === localPlayer.id && (
        <CardsDialog 
          player={localPlayer}
          onClose={() => handleCloseDialog('showCardsDialogForPlayer')}
          onUseCard={(cardName) => handleUseCardAction(cardName)}
          canUseCards={isMyTurn}
        />
      )}
      {abilitiesShopState?.isOpen && (
        <AbilitiesDialog
          player={localPlayer}
          onClose={() => handleCloseDialog('abilitiesShopState')}
          onBuyAbility={(abilityName) => handleUpdate(GameActions.handleBuyAbility(gameState, abilityName))}
          gameState={gameState}
          isMyTurn={isMyTurn}
        />
      )}
      {stealResourceDialogState && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(targetPlayerId, resource) => handleUpdate(GameActions.handleStealResource(gameState, targetPlayerId, resource))}
          onClose={() => handleCloseDialog('stealResourceDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {useCardDialogState && (
        <UseCardDialog
          cardName={useCardDialogState.cardName}
          onConfirm={() => handleUpdate(GameActions.handleUseCard(gameState, useCardDialogState.cardName))}
          onClose={() => handleCloseDialog('useCardDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={gameState.players.length === 1}
            onConfirm={onConfirmHostLeave}
            onClose={() => handleCloseDialog('showHostLeaveDialog')}
        />
      )}
      {sabotageDialogState?.isOpen && (
        <SabotageDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSabotage={(targetPlayerId) => handleUpdate(GameActions.handleSabotagePlayer(gameState, targetPlayerId))}
          onClose={() => handleCloseDialog('sabotageDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
      {wealthyDialogState?.isOpen && (
        <WealthyDialog
          onSelectResource={(resource) => handleUpdate(GameActions.handleGainWealth(gameState, resource))}
          onClose={() => handleCloseDialog('wealthyDialogState')}
          isMyTurn={isMyTurn}
        />
      )}
    </>
  );
}
