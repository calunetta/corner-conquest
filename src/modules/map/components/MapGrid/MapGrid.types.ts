import type { Island } from '@/lib/types';
import type { UseMapPanZoomResult } from './MapGrid.pan-zoom.hook';

export interface MapGridViewModel {
  map: Island[];
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
