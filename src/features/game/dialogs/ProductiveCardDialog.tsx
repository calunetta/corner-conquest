'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { ProductiveCardDialogState, ResourceType } from '@/lib/types';
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
import { TrendingUp, Check } from 'lucide-react';

type ProductiveCardDialogProps = {
  state: ProductiveCardDialogState;
  onConfirm: (selectedResource: ResourceType | null) => void;
};

export function ProductiveCardDialog({ state, onConfirm }: ProductiveCardDialogProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);

  if (!state) return null;

  const handleSelect = (resource: ResourceType) => {
    setSelectedResource((prev) => (prev === resource ? null : resource));
  };

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Productive Harvest</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Select one resource to double its harvest yield this turn.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {state.options.map((option) => {
            const isSelected = selectedResource === option.resource;
            const sprite = RESOURCE_SPRITES[option.resource] || '/sprites/mine.png';
            const displayName = getResourceDisplayName(option.resource);

            return (
              <button
                key={option.resource}
                type="button"
                data-testid={`productive-option-${option.resource}`}
                onClick={() => handleSelect(option.resource)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.4)] scale-105'
                    : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}

                {/* Animated Preview Sprite */}
                <div className="relative w-11 h-11 mb-1 flex items-center justify-center drop-shadow">
                  <Image
                    src={sprite}
                    alt={displayName}
                    width={44}
                    height={44}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>

                <div className="flex items-center gap-1">
                  <ResourceIcon type={option.resource} className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold text-foreground capitalize">{displayName}</span>
                </div>

                <span className="text-xs font-black font-mono text-emerald-400 mt-0.5">
                  2x ({option.amount * 2})
                </span>
              </button>
            );
          })}
        </div>

        <AlertDialogFooter className="pt-2 border-t border-white/10">
          <Button
            onClick={() => onConfirm(selectedResource)}
            className="w-full font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_16px_rgba(16,185,129,0.3)]"
          >
            {selectedResource
              ? `Double ${getResourceDisplayName(selectedResource)} Harvest`
              : 'Harvest Normally (Skip 2x)'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
