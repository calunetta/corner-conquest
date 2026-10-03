export { handleInitiateCombatAction } from './combat-initiate.reducer';
export { handleCombatRoll } from './combat-player-roll.reducer';
export { handleCloseCombat } from './combat-player-resolve.reducer';
export { handleMonsterCombatRoll } from './combat-monster-roll.reducer';
export { handleCloseMonsterCombat } from './combat-monster-resolve.reducer';
export { getPossibleMoves, handleMoveAction } from './movement.reducer';
export {
  handleBuyAbility,
  handleBuyCardAction,
  handleCloseSpecialIslandDialog,
  handleRollOnSpecialIsland,
} from './card-acquisition.reducer';
export { handleScoutAction, handleUseCard, handleUseProductiveCard } from './card-effects.reducer';
export { handleGainWealth, handleSabotagePlayer, handleStealResource } from './card-targeted-effects.reducer';
export { handleCancelAction, handleDeployAction, handleUpgradeAction } from './player-actions.reducer';
export { handleEndTurn } from './player-turn.reducer';
export { handleSelectResourceForPosition } from './resource-position.reducer';
export { handlePlayerExit } from './services/player-exit.service';
export { handleGameAction, type HandleActionParams } from './game-rules.reducer';
