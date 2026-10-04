export interface GameStatusBadgeViewModel {
  isWaiting: boolean; // gameState.status === 'waiting'
  playerCount: number; // gameState.players.length
  maxPlayers: number; // gameState.maxPlayers
  turnLabel: string; // isMyTurn ? 'Your Turn' : `${players[currentPlayerIndex]?.name || 'Player'}'s Turn`
  isMyTurn: boolean;
  formattedTime: string; // turnTimer.formattedTime || '02:00'
  isExpiring: boolean; // !!turnTimer.isExpiring
}
