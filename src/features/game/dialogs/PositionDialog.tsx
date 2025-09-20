
'use client';
import type { IslandResource, ResourceType } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ResourceIcon } from '@/components/icons';

type PositionDialogProps = {
  resources: IslandResource[];
  onSelect: (resource: ResourceType) => void;
  onClose: () => void;
  isMyTurn: boolean;
};

export function PositionDialog({ resources, onSelect, onClose, isMyTurn }: PositionDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Position Your Army</AlertDialogTitle>
          <AlertDialogDescription>
            Select a resource to position your army on. You can collect this resource on your next turn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex flex-wrap justify-center gap-4 py-4">
          {resources.map((resource) => (
            <Button
              key={resource.type}
              variant="outline"
              className="flex h-24 w-24 flex-col items-center justify-center gap-2"
              onClick={() => onSelect(resource.type)}
              disabled={!isMyTurn}
            >
              <div className="flex items-center gap-1">
                <ResourceIcon type={resource.type} className="h-8 w-8" />
                <span className="text-lg font-bold">x{resource.amount}</span>
              </div>
              <span className="capitalize">{resource.type}</span>
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
