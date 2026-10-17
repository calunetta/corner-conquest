import type { Island } from '@/lib/types';
import type { UseMapPanZoomResult } from './MapGrid.pan-zoom.hook';

export interface MapGridViewModel {
  map: Island[];
  /** The variant each tile draws, so look-alike tiles are kept apart. */
  variantAssignments: ReadonlyMap<string, string>;
  cols: number;
  rows: number;
  isMobile: boolean;
  zoom: number;
  pan: { x: number; y: number };
  defaultZoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handlers: UseMapPanZoomResult['handlers'];
}
