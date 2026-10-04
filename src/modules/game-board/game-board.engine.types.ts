import type { GameAction, GameState, Player } from '@/lib/types';

export type SetGameState = (currentState: GameState, action: GameAction, payload?: unknown) => Promise<void>;

export interface UseGameEngineResult {
  gameState: GameState | null;
  setGameState: SetGameState;
  isMyTurn: boolean;
  localPlayer: Player | null;
  isHost: boolean;
  isLoading: boolean;
  globallyRevealedTiles: Set<string>;
}
