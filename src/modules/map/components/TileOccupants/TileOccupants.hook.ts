import { useGameBoard } from '@/modules/game-board';
import { PLAYER_DATA } from '@/modules/game-rules';
import { IslandType } from '@/lib/types';
import { DEATH_ANIMATION_DURATION } from '../DeathEffect';
import { OCCUPANT_CORNER_SLOTS } from '../../island-tile-slots.types';
import type { TileOccupantsProps, OccupantSpriteViewModel } from './TileOccupants.types';

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
    .map(({ player, army }, index): OccupantSpriteViewModel => {
      const sprite = PLAYER_DATA[player.color]?.sprite;
      // Same corner index as the boat entry at this index (TileBoats.map.ts), but offset onto land.
      const slot = OCCUPANT_CORNER_SLOTS[index % OCCUPANT_CORNER_SLOTS.length];
      const slotStyle: Record<string, string> = { ...(slot.style as Record<string, string>) };

      return {
        key: `army-sprite-${player.id}-${army.id}`,
        color: player.color,
        sprite: sprite?.idle || '',
        slotStyle,
        isFaded: army.hasActed,
        isOverflow: index >= OCCUPANT_CORNER_SLOTS.length,
      };
    });

  return { occupants };
}
