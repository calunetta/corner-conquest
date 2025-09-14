'use client';
import type { ResourceType } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ResourceIcon } from '../icons';

type PositionDialogProps = {
  resources: ResourceType[];
  onSelect: (resource: ResourceType) => void;
  onClose: () => void;
};

export function PositionDialog({ resources, onSelect, onClose }: PositionDialogProps) {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Position Your Army</AlertDialogTitle>
          <AlertDialogDescription>
            Select a resource to position your army on. You can collect this resource on your next turn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex justify-around gap-4 py-4">
          {resources.map((resource) => (
            <Button
              key={resource}
              variant="outline"
              className="flex h-24 w-24 flex-col items-center justify-center gap-2"
              onClick={() => onSelect(resource)}
            >
              <ResourceIcon type={resource} className="h-8 w-8" />
              <span className="capitalize">{resource}</span>
            </Button>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
