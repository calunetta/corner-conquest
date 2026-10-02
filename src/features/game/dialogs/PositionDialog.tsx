'use client';

import React from 'react';
import Image from 'next/image';
import type { IslandResource, ResourceType } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Anchor } from 'lucide-react';
import { ResourceIcon, RESOURCE_SPRITES, getResourceDisplayName } from '@/components/icons';

type PositionDialogProps = {
  resources: IslandResource[];
  onSelect: (resource: ResourceType) => void;
  onClose: () => void;
};

export function PositionDialog({ resources, onSelect, onClose }: PositionDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Position Army Collector</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Select an available resource node to establish an active collection garrison.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
          {resources.map((resource) => {
            const sprite = RESOURCE_SPRITES[resource.type] || '/sprites/mine.png';
            const displayName = getResourceDisplayName(resource.type);

            return (
              <button
                key={resource.type}
                type="button"
                data-testid={`position-resource-btn-${resource.type}`}
                onClick={() => onSelect(resource.type)}
                className="group relative flex flex-col items-center justify-center p-3.5 rounded-xl border border-white/10 bg-black/40 hover:border-cyan-400 hover:bg-cyan-500/15 hover:scale-105 transition-all duration-200"
              >
                {/* Resource Animated Sprite / Graphic */}
                <div className="relative w-12 h-12 mb-1 drop-shadow flex items-center justify-center">
                  <Image
                    src={sprite}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain group-hover:scale-110 transition-transform"
                    unoptimized
                  />
                </div>

                <div className="flex items-center gap-1 mt-1">
                  <ResourceIcon type={resource.type} className="w-4 h-4" />
                  <span className="text-xs font-bold capitalize text-foreground">
                    {displayName}
                  </span>
                </div>

                <span className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
                  +{resource.amount} / turn
                </span>
              </button>
            );
          })}
        </div>

        <AlertDialogFooter className="pt-2 border-t border-white/10">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-xs">
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
