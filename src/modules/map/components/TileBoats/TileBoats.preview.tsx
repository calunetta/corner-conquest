'use client';

import type { ReactNode } from 'react';
import { TileBoatsView } from './TileBoats';
import { toTileBoatsViewModel } from './TileBoats.map';
import { boatEntryFixture, bluePlayer, redPlayer, contestedBaseIsland } from './TileBoats.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { BoatEntryViewModel } from './TileBoats.types';
import { CORNER_TRANSFORMS } from './TileBoats.types';
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

const twoBoatsFixture: BoatEntryViewModel[] = [
  boatEntryFixture,
  {
    key: 'boat-base-1',
    color: PlayerColor.Red,
    cornerStyle: { top: '0', right: '0', transform: CORNER_TRANSFORMS.tr },
    showIdleCollector: false,
    idleCollectorSprite: undefined,
  },
];

const allCornersBoatsFixture: BoatEntryViewModel[] = [
  {
    key: 'boat-br',
    color: PlayerColor.Blue,
    cornerStyle: { bottom: '0', right: '0', transform: CORNER_TRANSFORMS.br },
    showIdleCollector: true,
    idleCollectorSprite: '/sprites/collector_blue_idle.gif',
  },
  {
    key: 'boat-tr',
    color: PlayerColor.Red,
    cornerStyle: { top: '0', right: '0', transform: CORNER_TRANSFORMS.tr },
    showIdleCollector: false,
    idleCollectorSprite: undefined,
  },
  {
    key: 'boat-tl',
    color: PlayerColor.Purple,
    cornerStyle: { top: '0', left: '0', transform: CORNER_TRANSFORMS.tl },
    showIdleCollector: true,
    idleCollectorSprite: '/sprites/collector_purple_idle.gif',
  },
  {
    key: 'boat-bl',
    color: PlayerColor.Yellow,
    cornerStyle: { bottom: '0', left: '0', transform: CORNER_TRANSFORMS.bl },
    showIdleCollector: false,
    idleCollectorSprite: undefined,
  },
];

const contestedBaseBoats = toTileBoatsViewModel(contestedBaseIsland, [bluePlayer, redPlayer], bluePlayer, false, false);

/** Mirrors the connected container (TileBoats.tsx): idle collectors follow the real viewport
 *  via useIsMobile(), not a per-state flag, so each state matches production at the width
 *  ui-verify captures it at. The tile box size stays per state. */
function ViewportTileBoats({ px, boats }: { px: number; boats: BoatEntryViewModel[] | null }) {
  const isMobile = useIsMobile();
  return (
    <TileBox px={px}>
      <TileBoatsView boats={boats} showIdleCollectors={!isMobile} />
    </TileBox>
  );
}

export const tileBoatsPreview: ComponentPreview = {
  slug: 'tile-boats',
  title: 'Tile Boats',
  group: 'Game map',
  states: [
    {
      name: 'Empty (no boats)',
      render: () => <ViewportTileBoats px={DESKTOP_TILE_PX} boats={null} />,
    },
    {
      name: 'Single boat',
      render: () => <ViewportTileBoats px={DESKTOP_TILE_PX} boats={[boatEntryFixture]} />,
    },
    {
      name: 'Two boats',
      render: () => <ViewportTileBoats px={DESKTOP_TILE_PX} boats={twoBoatsFixture} />,
    },
    {
      name: 'All four corners',
      render: () => <ViewportTileBoats px={DESKTOP_TILE_PX} boats={allCornersBoatsFixture} />,
    },
    {
      name: 'Contested base (real map function)',
      render: () => <ViewportTileBoats px={DESKTOP_TILE_PX} boats={contestedBaseBoats} />,
    },
    {
      name: 'Single boat, mobile size (46px tile)',
      render: () => <ViewportTileBoats px={MOBILE_TILE_PX} boats={[boatEntryFixture]} />,
    },
    {
      name: 'Single boat, desktop size (136px tile)',
      render: () => <ViewportTileBoats px={DESKTOP_TILE_PX} boats={[boatEntryFixture]} />,
    },
  ],
};
