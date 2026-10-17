'use client';

import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { PlayerColor } from '@/lib/types';
import { baseIslandOwnedByLocalPlayer, localPlayerFixture, monsterIslandWithLivingMonster, resourceIslandWithThreeNodesAndThreeOccupants, specialIsland } from '@/modules/map/components/IslandTile/IslandTile.fixtures';
import { createBaseViewModel, createViewModelWithState, WithGameBoardContext } from '@/modules/map/components/IslandTile/IslandTile.preview.shared';
import { TileVariantsProvider, toPlacementStyle, type TileVariant, type TileVariantsConfig } from '@/modules/map/components/TileVariants';
import { toGrabbedCenterPercent } from '@/testbed/components/TileDecorationEditor/TileDecorationEditor.map';

const PREVIEW_PX = 300;

interface PlacementPreviewProps {
  config: TileVariantsConfig;
  draft: TileVariant;
  onMove: (x: number, y: number) => void;
}

/** A sample tile of the draft's type, drawn with only the draft in the pool. Drag the picture to move it. */
export function PlacementPreview({ config, draft, onMove }: PlacementPreviewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const centreX = box.left + (draft.transform.x / 100) * box.width;
    const centreY = box.top + (draft.transform.y / 100) * box.height;
    grabRef.current = { offsetX: event.clientX - centreX, offsetY: event.clientY - centreY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const grab = grabRef.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!grab || !box) return;
    onMove(
      toGrabbedCenterPercent(event.clientX, grab.offsetX, box.left, box.width),
      toGrabbedCenterPercent(event.clientY, grab.offsetY, box.top, box.height),
    );
  }

  return (
    <div
      ref={boxRef}
      className="relative"
      style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
      data-testid="placement-preview"
    >
      <TileVariantsProvider value={{ images: config.images, variants: [draft] }}>
        <SampleTile draft={draft} />
      </TileVariantsProvider>
      <div
        // Above the tile's own layers (fog is z-50), so the press reaches this area and not the tile.
        className="absolute inset-0 z-[60] cursor-move touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => (grabRef.current = null)}
        onPointerCancel={() => (grabRef.current = null)}
        data-testid="placement-drag-area"
      />
      {draft.image && (
        <div
          className="pointer-events-none absolute rounded border border-dashed border-primary"
          style={toPlacementStyle(draft.transform)}
        />
      )}
    </div>
  );
}

function SampleTile({ draft }: { draft: TileVariant }) {
  if (draft.type === 'base') {
    const colour = draft.color ?? PlayerColor.Blue;
    const owner = { ...localPlayerFixture, color: colour };
    return <WithGameBoardContext viewModel={createBaseViewModel(baseIslandOwnedByLocalPlayer, owner)} />;
  }
  const island =
    draft.type === 'special' ? specialIsland : draft.type === 'monster' ? monsterIslandWithLivingMonster : resourceIslandWithThreeNodesAndThreeOccupants;
  return <WithGameBoardContext viewModel={createViewModelWithState(island, {})} />;
}
