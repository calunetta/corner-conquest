import { MapZoomControls } from '@/features/game/components/MapZoomControls';
import { DEFAULT_DESKTOP_ZOOM, useMapPanZoom } from '@/features/game/hooks/useMapPanZoom';
import type { ComponentPreview } from '../testbed.types';

const ZOOMED_IN = 1.6;

function ignoreClick() {
  // Static states only show how the controls look; clicks do nothing.
}

/** Wired to the real pan-zoom hook, so the buttons respect the game's zoom limits. */
function InteractiveMapZoomControls() {
  const { zoom, defaultZoom, zoomIn, zoomOut, resetZoom } = useMapPanZoom();

  return (
    <MapZoomControls
      zoom={zoom}
      defaultZoom={defaultZoom}
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onResetZoom={resetZoom}
    />
  );
}

function StaticMapZoomControls({ zoom }: { zoom: number }) {
  return (
    <MapZoomControls
      zoom={zoom}
      defaultZoom={DEFAULT_DESKTOP_ZOOM}
      onZoomIn={ignoreClick}
      onZoomOut={ignoreClick}
      onResetZoom={ignoreClick}
    />
  );
}

export const mapZoomControlsPreview: ComponentPreview = {
  slug: 'map-zoom-controls',
  title: 'Map zoom controls',
  group: 'Legacy / Game map',
  states: [
    { name: 'Default zoom', render: () => <StaticMapZoomControls zoom={DEFAULT_DESKTOP_ZOOM} /> },
    { name: 'Zoomed in', render: () => <StaticMapZoomControls zoom={ZOOMED_IN} /> },
    { name: 'Interactive', render: () => <InteractiveMapZoomControls /> },
  ],
};
