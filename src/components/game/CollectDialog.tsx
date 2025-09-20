
'use client';
import type { CollectDialogState } from '@/lib/types';
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
import { ResourceIcon } from '../icons';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CardName } from '@/lib/enums';

type CollectDialogProps = {
  state: CollectDialogState;
  onConfirm: (useProductive: boolean) => void;
  onClose: () => void;
  isMyTurn: boolean;
};

export function CollectDialog({ state, onConfirm, onClose, isMyTurn }: CollectDialogProps) {
  const [useProductive, setUseProductive] = useState(false);
  const { resource, hasProductiveCard } = state;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Collection</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to collect {resource.amount} {resource.type} from this island.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex justify-center py-4">
             <div className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-lg border">
                <div className="flex items-center gap-1">
                    <ResourceIcon type={resource.type} className="h-8 w-8" />
                    <span className="text-lg font-bold">x{resource.amount}</span>
                </div>
                <span className="capitalize">{resource.type}</span>
            </div>
        </div>

        {hasProductiveCard && (
            <div className="flex items-center space-x-2 rounded-md border bg-muted/50 p-4">
                <Checkbox id="use-productive-card" checked={useProductive} onCheckedChange={(checked) => setUseProductive(!!checked)} disabled={!isMyTurn} />
                <Label htmlFor="use-productive-card" className='font-bold'>Use '{CardName.Productive}' card to double resources?</Label>
            </div>
        )}

        <AlertDialogFooter>
          {isMyTurn ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => onConfirm(useProductive)}>Confirm Collect</Button>
            </>
          ) : (
             <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
