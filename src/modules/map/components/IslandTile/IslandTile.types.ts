import type { Army, CardRevealAnimation, DeathAnimation, GameState, Island, Player, PlayerColor } from '@/lib/types';
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
  /** Covered tiles fog over a plain grey instead of their terrain colour (settings.neutralFog). */
  isNeutralFog: boolean;
  isBase: boolean;
  baseOwner: Player | null;
  tilePlayerColor: PlayerColor | null;
  isClickable: boolean;
}

export interface IslandTileViewModel extends IslandTileStaticViewModel {
  island: Island;
  deathAnimationOnTile: DeathAnimation | undefined;
  cardRevealAnimationOnTile: CardRevealAnimation | undefined;
  prefersReducedMotion: boolean;
  borderImageSequence: [string, string, string];
  onClick: () => void;
  onCardRevealHidden: (id: string) => void;
  /** False hides the tile's decorations, so a preview shows only the art. Defaults to true. */
  showDecorations?: boolean;
}
