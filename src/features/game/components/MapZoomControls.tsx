'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MapZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function MapZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: MapZoomControlsProps) {
  const percentage = Math.round(zoom * 100);

  return (
    <TooltipProvider>
      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 p-1 shadow-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10"
              onClick={onZoomOut}
              data-testid="map-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
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
              className="h-7 px-2 text-xs font-bold text-foreground hover:bg-white/10 min-w-12"
              onClick={onResetZoom}
              data-testid="map-zoom-reset"
            >
              <RotateCcw className="h-3 w-3 mr-1 text-muted-foreground" />
              {percentage}%
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Reset Zoom (100%)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10"
              onClick={onZoomIn}
              data-testid="map-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
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
