
'use client';
import { SPECIAL_CARD_DESCRIPTIONS } from '@/lib/card-data';
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
import { Button } from '../ui/button';

type UseCardDialogProps = {
  cardName: string;
  onConfirm: () => void;
  onClose: () => void;
  isMyTurn: boolean;
};

export function UseCardDialog({ cardName, onConfirm, onClose, isMyTurn }: UseCardDialogProps) {
  const description = SPECIAL_CARD_DESCRIPTIONS[cardName] || 'No description available.';

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use '{cardName}'?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isMyTurn ? (
            <>
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
            </>
          ) : (
             <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
