

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
import * as GameActions from '@/lib/game-actions';

type GameDialogsProps = {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  localPlayer: Player;
  isMyTurn: boolean;
};

export function GameDialogs({ gameState, setGameState, localPlayer, isMyTurn }: GameDialogsProps) {
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
  } = gameState;

  const handleUpdate = (state: GameState) => {
    setGameState(state);
  };
  
  const handleCloseDialog = (dialog: keyof GameState) => {
    handleUpdate({ ...gameState, [dialog]: null, currentAction: null });
  };
  
  const selectedArmy = GameActions.getSelectedArmy(gameState);
  const currentTileForMonster = selectedArmy ? gameState.map[selectedArmy.position.y][selectedArmy.position.x] : null;

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
        />
      )}
      {monsterCombatState && currentTileForMonster?.monsters && (
        <MonsterCombatDialog 
          gameState={gameState} 
          monsters={currentTileForMonster.monsters}
          onRoll={(monster, useDecideCard, decidedValue, useOvercome, useWarChief) => handleUpdate(GameActions.handleMonsterCombatRoll(gameState, monster, useDecideCard, decidedValue, useOvercome, useWarChief))}
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
      {collectDialogState && (
        <CollectDialog
            state={collectDialogState}
            onConfirm={(useProductive) => handleUpdate(GameActions.handleConfirmCollection(gameState, useProductive))}
            onClose={() => handleCloseDialog('collectDialogState')}
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
      {sabotageDialogState?.isOpen && isMyTurn && (
        <SabotageDialog
          players={gameState.players.filter(p => p.id !== gameState.currentPlayerIndex)}
          onSabotage={(targetPlayerId) => handleUpdate(GameActions.handleSabotagePlayer(gameState, targetPlayerId))}
          onClose={() => handleCloseDialog('sabotageDialogState')}
        />
      )}
      {wealthyDialogState?.isOpen && isMyTurn && (
        <WealthyDialog
          onSelectResource={(resource) => handleUpdate(GameActions.handleGainWealth(gameState, resource))}
          onClose={() => handleCloseDialog('wealthyDialogState')}
        />
      )}
    </>
  );
}
