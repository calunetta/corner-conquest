import { useGameBoard } from '@/modules/game-board';
import { PLAYER_DATA } from '@/modules/game-rules';
import { cn } from '@/lib/utils';
import { IslandType } from '@/lib/types';
import { DEATH_ANIMATION_DURATION } from '../DeathEffect';
import type { TileOccupantsProps, OccupantSpriteViewModel } from './TileOccupants.types';

const positions = [
  { bottom: '0', left: '0', origin: 'origin-bottom-left' },
  { bottom: '0', right: '0', origin: 'origin-bottom-right' },
  { top: '0', left: '0', origin: 'origin-top-left' },
  { top: '0', right: '0', origin: 'origin-top-right' },
];

export function useTileOccupants(props: TileOccupantsProps): { occupants: OccupantSpriteViewModel[] } {
  const { gameState, localPlayer } = useGameBoard();
  const { players, deathAnimations, debugMode, settings } = gameState;
  const fogOfWar = settings.fogOfWar;
  const isPersonallyRevealed = localPlayer ? localPlayer.revealedTiles.includes(props.island.id) : false;
  const now = Date.now();

  const occupants = props.island.occupants
    .map((o) => {
      const player = players.find((p) => p.id === o.playerId);
      const army = player?.armies.find((a) => a.id === o.armyId);
      return { player, army, armyId: o.armyId };
    })
    .filter(
      (item): item is {
        player: NonNullable<typeof item.player>;
        army: NonNullable<typeof item.army>;
        armyId: number;
      } => !!item.player && !!item.army,
    )
    .filter(({ player, army }) => {
      // Suppress if currently dying
      if (
        deathAnimations.some(
          (anim) =>
            anim.id.startsWith(`army-${player.id}-${army.id}`) &&
            (!anim.createdAt || now - anim.createdAt < DEATH_ANIMATION_DURATION),
        )
      ) {
        return false;
      }

      // Check visibility
      let isArmyVisible: boolean;
      if (debugMode) {
        isArmyVisible = true;
      } else if (fogOfWar) {
        isArmyVisible =
          (localPlayer && player.id === localPlayer.id) ||
          props.island.type === IslandType.Base ||
          isPersonallyRevealed;
      } else {
        isArmyVisible = true;
      }

      return isArmyVisible;
    })
    .map(({ player, army }, index) => {
      const sprite = PLAYER_DATA[player.color]?.sprite;
      const pos = positions[index % 4];

      const positionClasses = cn(
        'absolute w-1/2 h-1/2',
        pos.origin,
        index >= 4 ? 'scale-90 opacity-90' : '',
      );

      return {
        key: `army-sprite-${player.id}-${army.id}`,
        color: player.color,
        sprite: sprite?.idle || '',
        positionClasses,
        isFaded: army.hasActed,
      };
    });

  return { occupants };
}
