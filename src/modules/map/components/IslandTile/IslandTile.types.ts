import type { Army, DeathAnimation, GameState, Island, Player, PlayerColor } from '@/lib/types';
import type { GameBoardUIState } from '@/modules/game-board';

export interface IslandTileProps {
  island: Island;
}

/** Inputs `toIslandTileViewModel` needs from the board context; no Date.now()/Math.random(). */
export interface IslandTileContext {
  gameState: GameState;
  localPlayer: Player;
  uiState: GameBoardUIState;
  selectedArmy: Army | null;
}

export interface IslandTileStaticViewModel {
  isSelected: boolean;
  isPossibleMove: boolean;
  isTeleportTarget: boolean;
  isScoutTarget: boolean;
  isTileVisible: boolean;
  isBase: boolean;
  baseOwner: Player | null;
  tilePlayerColor: PlayerColor | null;
  isClickable: boolean;
}

export interface IslandTileViewModel extends IslandTileStaticViewModel {
  island: Island;
  deathAnimationOnTile: DeathAnimation | undefined;
  borderImageSequence: [string, string, string];
  onClick: () => void;
}
