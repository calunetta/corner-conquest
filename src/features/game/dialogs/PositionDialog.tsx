'use client';

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
import { ResourceIcon } from '@/components/icons';
import { Anchor } from 'lucide-react';

type PositionDialogProps = {
  resources: IslandResource[];
  onSelect: (resource: ResourceType) => void;
  onClose: () => void;
};

export function PositionDialog({ resources, onSelect, onClose }: PositionDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Position Army Squad</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Select an available resource node to establish a collection garrison.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4">
          {resources.map((resource) => (
            <button
              key={resource.type}
              type="button"
              onClick={() => onSelect(resource.type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-black/40 hover:border-cyan-400 hover:bg-cyan-500/15 hover:scale-105 transition-all duration-200"
            >
              <ResourceIcon type={resource.type} className="h-9 w-9 mb-1 drop-shadow" />
              <span className="text-sm font-black font-mono text-cyan-400">x{resource.amount}</span>
              <span className="text-xs font-semibold capitalize text-foreground mt-0.5">{resource.type}</span>
            </button>
          ))}
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