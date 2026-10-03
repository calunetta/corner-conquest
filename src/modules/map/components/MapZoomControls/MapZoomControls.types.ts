export interface MapZoomControlsProps {
  zoom: number;
  defaultZoom?: number; // default 0.85, matches legacy MapZoomControls.tsx:18
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}
