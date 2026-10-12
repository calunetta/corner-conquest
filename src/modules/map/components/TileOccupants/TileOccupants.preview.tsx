'use client';

import type { ReactNode } from 'react';
import { TileOccupantsView } from './TileOccupants';
import { occupantSpriteFixture, fadedOccupantFixture } from './TileOccupants.fixtures';
import { TileBoatsView } from '../TileBoats/TileBoats';
import { boatEntryFixture } from '../TileBoats/TileBoats.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { OccupantSpriteViewModel } from './TileOccupants.types';
import { PlayerColor } from '@/lib/types';
import { useIsMobile } from '@/modules/shared';

/** Square stand-in for IslandTile's `relative aspect-square` button. Percentage sizing
 *  collapses to 0 without an explicitly sized ancestor, so every state needs this box. */
function TileBox({ px, children }: { px: number; children: ReactNode }) {
  return (
    <div className="relative rounded-lg border border-dashed border-white/40" style={{ width: px, height: px }}>
      {children}
    </div>
  );
}

const DESKTOP_TILE_PX = 136;
const MOBILE_TILE_PX = 46;

const threeOccupantsFixture: OccupantSpriteViewModel[] = [
  occupantSpriteFixture,
  fadedOccupantFixture,
  {
    key: 'army-sprite-2-15',
    color: PlayerColor.Purple,
    sprite: '/sprites/purple.gif',
    slotStyle: { top: '24%', left: '24%' },
    isFaded: false,
    isOverflow: false,
  },
];

const allFadedFixture: OccupantSpriteViewModel[] = [
  {
    key: 'army-sprite-0-1',
    color: PlayerColor.Blue,
    sprite: '/sprites/blue.gif',
    slotStyle: { bottom: '24%', left: '24%' },
    isFaded: true,
    isOverflow: false,
  },
  {
    key: 'army-sprite-1-2',
    color: PlayerColor.Red,
    sprite: '/sprites/red.gif',
    slotStyle: { bottom: '24%', right: '24%' },
    isFaded: true,
    isOverflow: false,
  },
];

/** Boat and knight on one corner: the knight sits on land beside the hull, not on it. Idle collectors follow the real viewport via useIsMobile(),
 *  the same gating as the connected TileBoats container, not a per-state flag. */
function ViewportBoatAndRider({ px }: { px: number }) {
  const isMobile = useIsMobile();
  return (
    <TileBox px={px}>
      <TileBoatsView boats={[boatEntryFixture]} showIdleCollectors={!isMobile} />
      <TileOccupantsView occupants={[occupantSpriteFixture]} />
    </TileBox>
  );
}

/** Occupants alone in a desktop-sized tile box. */
function desktopOccupants(occupants: OccupantSpriteViewModel[]) {
  return (
    <TileBox px={DESKTOP_TILE_PX}>
      <TileOccupantsView occupants={occupants} />
    </TileBox>
  );
}

export const tileOccupantsPreview: ComponentPreview = {
  slug: 'tile-occupants',
  title: 'Tile Occupants',
  group: 'Game map',
  states: [
    {
      name: 'Empty (no occupants)',
      render: () => desktopOccupants([]),
    },
    {
      name: 'Single occupant',
      render: () => desktopOccupants([occupantSpriteFixture]),
    },
    {
      name: 'Two occupants',
      render: () => desktopOccupants([occupantSpriteFixture, fadedOccupantFixture]),
    },
    {
      name: 'Three occupants mixed',
      render: () => desktopOccupants(threeOccupantsFixture),
    },
    {
      name: 'All faded',
      render: () => desktopOccupants(allFadedFixture),
    },
    {
      name: 'Single occupant, mobile size (46px tile)',
      render: () => (
        <TileBox px={MOBILE_TILE_PX}>
          <TileOccupantsView occupants={[occupantSpriteFixture]} />
        </TileBox>
      ),
    },
    {
      name: 'Single occupant, desktop size (136px tile)',
      render: () => desktopOccupants([occupantSpriteFixture]),
    },
    {
      // Same corner index as boatEntryFixture, but the knight is offset onto land (OCCUPANT_CORNER_SLOTS),
      // so it must not overlap the hull or share the boat's centre point.
      name: 'Boat + knight beside it (136px tile)',
      render: () => <ViewportBoatAndRider px={DESKTOP_TILE_PX} />,
    },
    {
      name: 'Boat + knight beside it (46px tile)',
      render: () => <ViewportBoatAndRider px={MOBILE_TILE_PX} />,
    },
  ],
};
