'use client';
import type { GameState, Player, ResourceType } from '@/lib/types';
import { CombatDialog } from './CombatDialog';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import { PositionDialog } from './PositionDialog';
import { CardsDialog } from './CardsDialog';
import { StealResourceDialog } from './StealResourceDialog';
import { UseCardDialog } from './UseCardDialog';
import { HostLeaveDialog } from './HostLeaveDialog';
import * as GameActions from '@/lib/game-actions';

type GameDialogsProps = {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  localPlayer: Player;
  isMyTurn: boolean;
};

export function GameDialogs({ gameState, setGameState, localPlayer, isMyTurn }: GameDialogsProps) {
  const { combatState, monsterCombatState, positionDialogState, showCardsDialogForPlayer, stealResourceDialogState, useCardDialogState, showHostLeaveDialog } = gameState;

  const handleUpdate = (state: GameState) => {
    setGameState(state);
  };
  
  const handleCloseDialog = (dialog: keyof GameState) => {
    handleUpdate({ ...gameState, [dialog]: null, currentAction: null });
  };
  
  const selectedArmy = GameActions.getSelectedArmy(gameState);
  const currentTileForMonster = selectedArmy ? gameState.map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const handleUseCardAction = (cardName: string) => {
    if (cardName === 'Steal Resource') {
        handleUpdate({...gameState, stealResourceDialogState: { targetPlayerId: null }, showCardsDialogForPlayer: null });
    } else {
        handleUpdate(GameActions.handleOpenUseCardDialog(gameState, cardName));
    }
  }

  return (
    <>
      {combatState && (
        <CombatDialog
          gameState={gameState}
          onRoll={() => handleUpdate(GameActions.handleCombatRoll(gameState))}
          onClose={() => handleUpdate(GameActions.handleCloseCombat(gameState))}
        />
      )}
      {monsterCombatState && currentTileForMonster?.monsters && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={currentTileForMonster.monsters}
          onRoll={(monster, useCard, decidedValue) => handleUpdate(GameActions.handleMonsterCombatRoll(gameState, monster, useCard, decidedValue))}
          onClose={() => handleUpdate(GameActions.handleCloseMonsterCombat(gameState))}
          onCancel={() => handleCloseDialog('monsterCombatState')}
        />
      )}
      {positionDialogState && (
        <PositionDialog 
          resources={positionDialogState.resources}
          onSelect={(resource) => handleUpdate(GameActions.handleSelectResourceForPosition(gameState, resource))}
          onClose={() => handleCloseDialog('positionDialogState')}
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
      {stealResourceDialogState && isMyTurn && (
        <StealResourceDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSteal={(targetPlayerId, resource) => handleUpdate(GameActions.handleStealResource(gameState, targetPlayerId, resource))}
          onClose={() => handleCloseDialog('stealResourceDialogState')}
        />
      )}
      {useCardDialogState && isMyTurn && (
        <UseCardDialog
          cardName={useCardDialogState.cardName}
          onConfirm={() => handleUpdate(GameActions.handleUseCard(gameState, useCardDialogState.cardName))}
          onClose={() => handleCloseDialog('useCardDialogState')}
        />
      )}
      {showHostLeaveDialog && (
        <HostLeaveDialog
            isLastPlayer={gameState.players.length === 1}
            onConfirm={() => GameActions.handleConfirmHostLeave(gameState, gameState.id, () => {})}
            onClose={() => handleCloseDialog('showHostLeaveDialog')}
        />
      )}
    </>
  );
}
