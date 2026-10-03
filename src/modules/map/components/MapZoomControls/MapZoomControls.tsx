'use client';

import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { styles } from './MapZoomControls.styles';
import type { MapZoomControlsProps } from './MapZoomControls.types';

export function MapZoomControls({
  zoom,
  defaultZoom = 0.85,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: MapZoomControlsProps) {
  const percentage = Math.round(zoom * 100);
  const defaultPercentage = Math.round(defaultZoom * 100);

  return (
    <TooltipProvider>
      <div className={styles.root}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={styles.zoomOut}
              onClick={onZoomOut}
              data-testid="map-zoom-out"
            >
              <ZoomOut className={styles.zoomOutIcon} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom Out</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={styles.zoomReset}
              onClick={onResetZoom}
              data-testid="map-zoom-reset"
            >
              <RotateCcw className={styles.zoomResetIcon} />
              {percentage}%
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Reset Zoom ({defaultPercentage}%)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={styles.zoomIn}
              onClick={onZoomIn}
              data-testid="map-zoom-in"
            >
              <ZoomIn className={styles.zoomInIcon} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom In</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
