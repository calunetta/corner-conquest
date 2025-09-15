
'use client';
import type { ResourceType } from '@/lib/types';
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
import { ResourceIcon } from '../icons';

type WealthyDialogProps = {
  onSelectResource: (resource: ResourceType) => void;
  onClose: () => void;
};

const RESOURCES: ResourceType[] = ['gems', 'iron', 'food'];

export function WealthyDialog({ onSelectResource, onClose }: WealthyDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use 'Wealthy' Card</AlertDialogTitle>
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
