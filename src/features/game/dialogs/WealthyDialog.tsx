

'use client';
import { ResourceType, CardName } from '@/lib/types';
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

type WealthyDialogProps = {
  onSelectResource: (resource: ResourceType) => void;
  onClose: () => void;
  isMyTurn: boolean;
};

const RESOURCES: ResourceType[] = [ResourceType.Gems, ResourceType.Iron, ResourceType.Food];

export function WealthyDialog({ onSelectResource, onClose, isMyTurn }: WealthyDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use '{CardName.Wealthy}' Card</AlertDialogTitle>
          <AlertDialogDescription>
            Select a resource to gain 5 units of.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex flex-wrap justify-center gap-4 py-4">
          {RESOURCES.map((resource) => (
            <Button
              key={resource}
              variant="outline"
              className="flex h-24 w-24 flex-col items-center justify-center gap-2"
              onClick={() => onSelectResource(resource)}
              disabled={!isMyTurn}
            >
              <ResourceIcon type={resource} className="h-8 w-8" />
              <span className="capitalize">{resource}</span>
            </Button>
          ))}
        </div>

        <AlertDialogFooter>
          {isMyTurn ? (
            <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          ) : (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
