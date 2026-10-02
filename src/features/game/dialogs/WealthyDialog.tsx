'use client';

import React from 'react';
import Image from 'next/image';
import { ResourceType } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ResourceIcon, RESOURCE_SPRITES, getResourceDisplayName } from '@/components/icons';

type WealthyDialogProps = {
  onSelectResource: (resource: ResourceType) => void;
  onClose: () => void;
};

const RESOURCES: ResourceType[] = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold];

export function WealthyDialog({ onSelectResource, onClose }: WealthyDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 overflow-hidden">
              <Image
                src="/sprites/icon_gold.png"
                alt="Wealth"
                width={24}
                height={24}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Royal Wealth Bounty</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Select a stockpile resource to instantly receive 5 bonus units.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {RESOURCES.map((resource) => {
            const sprite = RESOURCE_SPRITES[resource] || '/sprites/mine.png';
            const displayName = getResourceDisplayName(resource);

            return (
              <button
                key={resource}
                type="button"
                data-testid={`wealthy-resource-${resource}`}
                onClick={() => onSelectResource(resource)}
                className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-white/10 bg-black/40 hover:border-amber-400 hover:bg-amber-500/15 hover:scale-105 transition-all duration-200"
              >
                {/* Animated Preview Sprite */}
                <div className="relative w-12 h-12 mb-1 flex items-center justify-center drop-shadow">
                  <Image
                    src={sprite}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain group-hover:scale-110 transition-transform"
                    unoptimized
                  />
                </div>

                <div className="flex items-center gap-1">
                  <ResourceIcon type={resource} className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold capitalize text-foreground">{displayName}</span>
                </div>

                <span className="text-xs font-black font-mono text-amber-400 mt-0.5">+5 Units</span>
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
