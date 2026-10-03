'use client';

import { useState } from 'react';

export const DEFAULT_DESKTOP_ZOOM = 0.85;
const MIN_ZOOM_DESKTOP = 0.85;
const MAX_ZOOM_DESKTOP = 1.15;
const MIN_ZOOM_MOBILE = 0.75;
const MAX_ZOOM_MOBILE = 1.35;

export interface UseZoomStateOptions {
  initialZoom?: number;
  isMobile?: boolean;
}

export interface ZoomState {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
}

export function useZoomState(options?: UseZoomStateOptions): ZoomState {
  const defaultZoom = options?.initialZoom ?? DEFAULT_DESKTOP_ZOOM;
  const isMobile = options?.isMobile ?? false;
  const minZoom = isMobile ? MIN_ZOOM_MOBILE : MIN_ZOOM_DESKTOP;
  const maxZoom = isMobile ? MAX_ZOOM_MOBILE : MAX_ZOOM_DESKTOP;

  const [zoom, setZoom] = useState(defaultZoom);

  return {
    zoom,
    setZoom,
    defaultZoom,
    minZoom,
    maxZoom,
  };
}
