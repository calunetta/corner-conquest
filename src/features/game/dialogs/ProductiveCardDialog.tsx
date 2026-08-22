'use client';
import type { ProductiveCardDialogState, ResourceType } from '@/lib/types';
import { useState } from 'react';
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
import { CardName } from '@/lib/types';

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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use '{CardName.Productive}' Card</AlertDialogTitle>
          <AlertDialogDescription>
            Select one resource to double its collection amount. If no resource is selected, the card will not be used.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-wrap justify-center gap-4 py-4">
          {state.options.map((option) => (
            <Button
              key={option.resource}
              variant={selectedResource === option.resource ? 'default' : 'outline'}
              className="flex h-24 w-24 flex-col items-center justify-center gap-2"
              onClick={() => handleSelect(option.resource)}
            >
              <div className="flex items-center gap-1">
                <ResourceIcon type={option.resource} className="h-8 w-8" />
                <span className="text-lg font-bold">x{option.amount}</span>
              </div>
              <span className="capitalize">{option.resource}</span>
            </Button>
          ))}
        </div>

        <AlertDialogFooter>
          <Button onClick={() => onConfirm(selectedResource)} className="w-full">
            Collect
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
